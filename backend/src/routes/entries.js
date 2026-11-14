import { Router } from 'express'
import { Entries } from '../models/entries.js'
import { HttpError } from '../middlewares/errors.js'
import { integer } from '../models/rules.js'

export function entryRoutes(db) {
  const router = Router()
  const model = new Entries(db)
  router.param('id', (req, _res, next, id) => {
    if (!integer(id, 1, 2147483647)) throw new HttpError(404, 'Lançamento não encontrado.')
    req.recordId = Number(id)
    next()
  })
  router.get('/', async (req, res) => res.json(await model.list(req.usuarioId, req.query)))
  router.get('/:id', async (req, res) => res.json(await model.find(req.usuarioId, req.recordId)))
  router.post('/', async (req, res) =>
    res.status(201).json({ itens: await model.create(req.usuarioId, req.body) }),
  )
  router.put('/:id', async (req, res) =>
    res.json(await model.update(req.usuarioId, req.recordId, req.body)),
  )
  router.delete('/:id', async (req, res) => {
    if (
      req.query.todasParcelas !== undefined &&
      !['true', 'false'].includes(req.query.todasParcelas)
    )
      throw new HttpError(400, 'Opção de exclusão inválida.')
    await model.delete(req.usuarioId, req.recordId, req.query.todasParcelas === 'true')
    res.status(204).end()
  })
  return router
}
