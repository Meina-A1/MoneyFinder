import { Router } from 'express'
import { Catalogs } from '../models/catalogs.js'
import { HttpError } from '../middlewares/errors.js'
import { integer } from '../models/rules.js'

export function catalogRoutes(db, resource) {
  const router = Router()
  const model = new Catalogs(db, resource)
  router.param('id', (req, _res, next, id) => {
    if (!integer(id, 1, 2147483647)) throw new HttpError(404, 'Registro não encontrado.')
    req.recordId = Number(id)
    next()
  })
  router.get('/', async (req, res) => res.json(await model.list(req.usuarioId)))
  router.get('/:id', async (req, res) => res.json(await model.find(req.usuarioId, req.recordId)))
  router.post('/', async (req, res) =>
    res.status(201).json(await model.save(req.usuarioId, req.body)),
  )
  router.put('/:id', async (req, res) =>
    res.json(await model.save(req.usuarioId, req.body, req.recordId)),
  )
  router.delete('/:id', async (req, res) => {
    await model.delete(req.usuarioId, req.recordId)
    res.status(204).end()
  })
  return router
}
