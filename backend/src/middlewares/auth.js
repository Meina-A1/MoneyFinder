import jwt from 'jsonwebtoken'
import { HttpError } from './errors.js'

export function authenticate(secret) {
  return (req, _res, next) => {
    const match = /^Bearer ([^ ]+)$/.exec(req.headers.authorization || '')
    if (!match) throw new HttpError(401, 'Token não informado.')
    try {
      const payload = jwt.verify(match[1], secret, {
        algorithms: ['HS256'],
        issuer: 'financas-api',
        audience: 'financas-spa',
      })
      req.usuarioId = Number(payload.sub)
      if (!Number.isSafeInteger(req.usuarioId) || req.usuarioId < 1) throw new Error('sub inválido')
      next()
    } catch {
      throw new HttpError(401, 'Sua sessão expirou. Entre novamente.')
    }
  }
}
