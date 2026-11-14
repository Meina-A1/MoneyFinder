import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { rateLimit } from 'express-rate-limit'
import { Users, validateRegistration } from '../models/users.js'
import { HttpError } from '../middlewares/errors.js'
import { authenticate } from '../middlewares/auth.js'

export function authRoutes(db, config) {
  const router = Router()
  const users = new Users(db)
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, res) =>
      res
        .status(429)
        .json({ erro: 'Muitas tentativas. Aguarde 15 minutos e tente novamente.', campos: {} }),
  })
  const token = (user) =>
    jwt.sign({}, config.jwtSecret, {
      subject: String(user.id),
      algorithm: 'HS256',
      expiresIn: config.jwtExpiresIn || '1h',
      issuer: 'financas-api',
      audience: 'financas-spa',
    })
  // Um hash válido evita um caminho muito mais rápido quando o e-mail não existe.
  const dummyHash = bcrypt.hashSync('senha-sem-usuario-123', 10)
  router.post('/cadastro', limiter, async (req, res) => {
    const data = validateRegistration(req.body)
    const hash = await bcrypt.hash(req.body.senha, 10)
    const user = await users.create(data, hash)
    res.status(201).json({ usuario: user, token: token(user) })
  })
  router.post('/login', limiter, async (req, res) => {
    if (
      typeof req.body.email !== 'string' ||
      req.body.email.length > 160 ||
      typeof req.body.senha !== 'string' ||
      Buffer.byteLength(req.body.senha) > 72
    )
      throw new HttpError(401, 'E-mail ou senha inválidos.')
    const user = await users.findEmail(req.body.email.trim().toLowerCase())
    const matches = await bcrypt.compare(req.body.senha, user?.senha_hash || dummyHash)
    if (!user || !matches) throw new HttpError(401, 'E-mail ou senha inválidos.')
    res.json({ usuario: await users.me(user.id), token: token(user) })
  })
  router.get('/me', authenticate(config.jwtSecret), async (req, res) => {
    const user = await users.me(req.usuarioId)
    if (!user) throw new HttpError(401, 'Usuário não encontrado. Entre novamente.')
    res.json(user)
  })
  return router
}
