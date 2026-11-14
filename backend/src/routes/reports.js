import { Router } from 'express'
import { Reports } from '../models/reports.js'

export function reportRoutes(db) {
  const router = Router()
  const model = new Reports(db)
  router.get('/relatorios/categorias', async (req, res) =>
    res.json(await model.categories(req.usuarioId, req.query)),
  )
  router.get('/relatorios/fontes-destinos', async (req, res) =>
    res.json(await model.sources(req.usuarioId, req.query)),
  )
  router.get('/relatorios/faturas', async (req, res) =>
    res.json(await model.invoices(req.usuarioId, req.query)),
  )
  router.get('/saude-financeira', async (req, res) => res.json(await model.health(req.usuarioId)))
  return router
}
