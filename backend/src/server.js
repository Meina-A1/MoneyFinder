import express from 'express'
import cors from 'cors'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { existsSync } from 'node:fs'
import { configuration } from './config/env.js'
import { openDatabase } from './config/database.js'
import { authenticate } from './middlewares/auth.js'
import { errorHandler, HttpError } from './middlewares/errors.js'
import { authRoutes } from './routes/auth.js'
import { catalogRoutes } from './routes/catalogs.js'
import { entryRoutes } from './routes/entries.js'
import { reportRoutes } from './routes/reports.js'

export function createApp(db, config) {
  const app = express()
  app.disable('x-powered-by')
  app.use(cors({ origin: config.origin, methods: ['GET', 'POST', 'PUT', 'DELETE'] }))
  app.use(express.json({ limit: '32kb' }))
  app.use((req, res, next) => {
    req.body ??= {}
    res.set('X-Content-Type-Options', 'nosniff')
    res.set('Cache-Control', 'no-store')
    next()
  })
  app.use('/api/auth', authRoutes(db, config))
  app.use('/api', authenticate(config.jwtSecret))
  app.use('/api/categorias', catalogRoutes(db, 'categorias'))
  app.use('/api/fontes-destinos', catalogRoutes(db, 'fontes-destinos'))
  app.use('/api/lancamentos', entryRoutes(db))
  app.use('/api', reportRoutes(db))
  app.use('/api', () => {
    throw new HttpError(404, 'Rota não encontrada.')
  })
  const frontend = fileURLToPath(new URL('../../frontend/dist/', import.meta.url))
  if (existsSync(resolve(frontend, 'index.html'))) {
    app.use(express.static(frontend))
    app.get('/{*path}', (_req, res) => res.sendFile(resolve(frontend, 'index.html')))
  }
  app.use(errorHandler)
  return app
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const config = configuration()
  const db = openDatabase(config)
  const app = createApp(db, config)
  const server = app.listen(config.port, config.host, () =>
    console.log(`API financeira: http://${config.host}:${config.port}`),
  )
  const close = () =>
    server.close(async () => {
      await db.close()
      process.exit(0)
    })
  process.on('SIGINT', close)
  process.on('SIGTERM', close)
}
