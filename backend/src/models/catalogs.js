import { HttpError } from '../middlewares/errors.js'
import { invalid, text, integer, cents } from './rules.js'

// Os nomes SQL vêm desta lista fixa, nunca de uma entrada do usuário.
const tables = { categorias: 'financas.categorias', 'fontes-destinos': 'financas.fontes_destinos' }
export class Catalogs {
  constructor(db, resource) {
    this.db = db
    this.table = tables[resource]
    this.category = resource === 'categorias'
  }
  async list(userId) {
    return (
      await this.db.query(`SELECT * FROM ${this.table} WHERE usuario_id = $1 ORDER BY nome, id`, [
        userId,
      ])
    ).rows
  }
  async find(userId, id, client = this.db) {
    const item = (
      await client.query(`SELECT * FROM ${this.table} WHERE usuario_id = $1 AND id = $2`, [
        userId,
        id,
      ])
    ).rows[0]
    if (!item) throw new HttpError(404, 'Registro não encontrado.')
    return item
  }
  validate(body) {
    const fields = {}
    if (!text(body.nome, 60)) fields.nome = 'Informe um nome de até 60 caracteres.'
    const types = this.category ? ['entrada', 'saida'] : ['renda', 'conta', 'cartao_credito']
    if (!types.includes(body.tipo)) fields.tipo = 'Selecione um tipo válido.'
    const card = body.tipo === 'cartao_credito'
    if (card && !integer(body.diaFechamento, 1, 31))
      fields.diaFechamento = 'Use um dia entre 1 e 31.'
    if (card && !integer(body.diaVencimento, 1, 31))
      fields.diaVencimento = 'Use um dia entre 1 e 31.'
    if (card && !cents(body.limite))
      fields.limite = 'Informe um limite positivo, com até 2 casas decimais.'
    invalid(fields)
    return {
      nome: body.nome.trim(),
      tipo: body.tipo,
      fechamento: card ? Number(body.diaFechamento) : null,
      vencimento: card ? Number(body.diaVencimento) : null,
      limite: card ? cents(body.limite) : null,
    }
  }
  async save(userId, body, id) {
    const data = this.validate(body)
    return this.db.transaction(async (client) => {
      if (id) {
        const old = await this.find(userId, id, client)
        if (!this.category && old.tipo !== data.tipo) {
          const linked = (
            await client.query(
              'SELECT id FROM financas.lancamentos WHERE usuario_id=$1 AND fonte_destino_id=$2 LIMIT 1',
              [userId, id],
            )
          ).rows.length
          if (linked)
            throw new HttpError(
              409,
              'Não é possível mudar o tipo de uma fonte/destino com lançamentos vinculados.',
              { tipo: 'Remova os lançamentos vinculados primeiro.' },
            )
        }
      }
      const values = this.category
        ? [userId, data.nome, data.tipo]
        : [userId, data.nome, data.tipo, data.fechamento, data.vencimento, data.limite]
      const columns = this.category
        ? 'usuario_id,nome,tipo'
        : 'usuario_id,nome,tipo,dia_fechamento,dia_vencimento,limite_centavos'
      const update = columns
        .split(',')
        .map((name, i) => `${name}=$${i + 1}`)
        .join(',')
      const placeholders = values.map((_, i) => `$${i + 1}`).join(',')
      const sql = id
        ? `UPDATE ${this.table} SET ${update} WHERE usuario_id=$1 AND id=$${values.length + 1} RETURNING *`
        : `INSERT INTO ${this.table} (${columns}) VALUES (${placeholders}) RETURNING *`
      return (await client.query(sql, id ? [...values, id] : values)).rows[0]
    })
  }
  async delete(userId, id) {
    const result = await this.db.query(
      `DELETE FROM ${this.table} WHERE usuario_id=$1 AND id=$2 RETURNING id`,
      [userId, id],
    )
    if (!result.rows.length) throw new HttpError(404, 'Registro não encontrado.')
  }
}
