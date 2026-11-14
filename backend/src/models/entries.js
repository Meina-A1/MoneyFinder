import { randomUUID } from 'node:crypto'
import { HttpError } from '../middlewares/errors.js'
import {
  invalid,
  text,
  integer,
  cents,
  validDate,
  addMonths,
  period,
  splitInstallments,
} from './rules.js'

const selection = `SELECT l.*, l.data::text AS data, l.data_compra::text AS data_compra, c.nome AS categoria_nome, f.nome AS fonte_destino_nome, f.tipo AS fonte_tipo FROM financas.lancamentos l JOIN financas.categorias c ON c.id=l.categoria_id JOIN financas.fontes_destinos f ON f.id=l.fonte_destino_id`

export class Entries {
  constructor(db) {
    this.db = db
  }
  async find(userId, id, client = this.db) {
    const item = (
      await client.query(`${selection} WHERE l.usuario_id=$1 AND l.id=$2`, [userId, id])
    ).rows[0]
    if (!item) throw new HttpError(404, 'Lançamento não encontrado.')
    return item
  }
  async validate(client, userId, body, existing) {
    const fields = {}
    if (!['entrada', 'saida'].includes(body.tipo)) fields.tipo = 'Selecione entrada ou saída.'
    if (!text(body.descricao, 120))
      fields.descricao = 'Informe uma descrição de até 120 caracteres.'
    if (!cents(body.valor)) fields.valor = 'Informe um valor positivo, com até 2 casas decimais.'
    if (!validDate(body.data)) fields.data = 'Informe uma data válida entre 1900 e 2100.'
    if (!integer(body.categoriaId, 1, 2147483647)) fields.categoriaId = 'Selecione uma categoria.'
    if (!integer(body.fonteDestinoId, 1, 2147483647))
      fields.fonteDestinoId = 'Selecione uma fonte ou destino.'
    if (!integer(body.totalParcelas ?? 1, 1, 48))
      fields.totalParcelas = 'Informe de 1 a 48 parcelas.'
    invalid(fields)
    const category = (
      await client.query('SELECT * FROM financas.categorias WHERE usuario_id=$1 AND id=$2', [
        userId,
        Number(body.categoriaId),
      ])
    ).rows[0]
    const source = (
      await client.query('SELECT * FROM financas.fontes_destinos WHERE usuario_id=$1 AND id=$2', [
        userId,
        Number(body.fonteDestinoId),
      ])
    ).rows[0]
    if (!category || !source)
      throw new HttpError(404, 'Categoria ou fonte/destino não encontrado para este usuário.')
    if (category.tipo !== body.tipo)
      fields.categoriaId = 'A categoria deve ter o mesmo tipo do lançamento.'
    if (source.tipo === 'cartao_credito' && body.tipo !== 'saida')
      fields.fonteDestinoId = 'Cartão de crédito aceita somente saídas.'
    if (source.tipo === 'renda' && body.tipo !== 'entrada')
      fields.fonteDestinoId = 'Uma fonte de renda aceita somente entradas.'
    const total = Number(body.totalParcelas ?? 1)
    if (total > 1 && source.tipo !== 'cartao_credito')
      fields.totalParcelas = 'Parcelamento é permitido apenas no cartão de crédito.'
    if (existing && body.totalParcelas !== undefined && total !== existing.total_parcelas)
      fields.totalParcelas = 'Para alterar o parcelamento, exclua a compra e crie outra.'
    if (existing?.total_parcelas > 1 && (source.tipo !== 'cartao_credito' || body.tipo !== 'saida'))
      fields.fonteDestinoId = 'Uma parcela deve continuar vinculada a um cartão de crédito.'
    const lastDate = addMonths(body.data, total - 1)
    if (!validDate(lastDate))
      fields.totalParcelas = 'O parcelamento ultrapassa a data máxima de 2100.'
    invalid(fields)
    return { amount: cents(body.valor), source, total }
  }
  async create(userId, body) {
    return this.db.transaction(async (client) => {
      const { amount, total } = await this.validate(client, userId, body)
      const amounts = splitInstallments(amount, total)
      const group = total > 1 ? randomUUID() : null
      const result = []
      for (let i = 0; i < total; i++) {
        const row = (
          await client.query(
            `INSERT INTO financas.lancamentos (usuario_id,tipo,descricao,valor_centavos,data,data_compra,categoria_id,fonte_destino_id,parcela_atual,total_parcelas,grupo_parcelamento) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
            [
              userId,
              body.tipo,
              body.descricao.trim(),
              amounts[i],
              addMonths(body.data, i),
              body.data,
              Number(body.categoriaId),
              Number(body.fonteDestinoId),
              i + 1,
              total,
              group,
            ],
          )
        ).rows[0]
        result.push(await this.find(userId, row.id, client))
      }
      return result
    })
  }
  async update(userId, id, body) {
    return this.db.transaction(async (client) => {
      const existing = await this.find(userId, id, client)
      const { amount } = await this.validate(client, userId, body, existing)
      // Ao editar uma parcela, preserva-se o grupo; o valor recebido é desta parcela.
      const purchase =
        body.data === existing.data
          ? existing.data_compra
          : addMonths(body.data, -(existing.parcela_atual - 1))
      await client.query(
        `UPDATE financas.lancamentos SET tipo=$1,descricao=$2,valor_centavos=$3,data=$4,data_compra=$5,categoria_id=$6,fonte_destino_id=$7 WHERE usuario_id=$8 AND id=$9`,
        [
          body.tipo,
          body.descricao.trim(),
          amount,
          body.data,
          purchase,
          Number(body.categoriaId),
          Number(body.fonteDestinoId),
          userId,
          id,
        ],
      )
      return this.find(userId, id, client)
    })
  }
  async delete(userId, id, all) {
    return this.db.transaction(async (client) => {
      const item = await this.find(userId, id, client)
      if (all && item.grupo_parcelamento)
        await client.query(
          'DELETE FROM financas.lancamentos WHERE usuario_id=$1 AND grupo_parcelamento=$2',
          [userId, item.grupo_parcelamento],
        )
      else
        await client.query('DELETE FROM financas.lancamentos WHERE usuario_id=$1 AND id=$2', [
          userId,
          id,
        ])
    })
  }
  async list(userId, query = {}) {
    const range = period(query)
    const values = [userId, range.inicio, range.fim]
    let where = 'l.usuario_id=$1 AND l.data BETWEEN $2 AND $3'
    for (const [key, column] of [
      ['tipo', 'tipo'],
      ['categoriaId', 'categoria_id'],
      ['fonteDestinoId', 'fonte_destino_id'],
    ]) {
      if (query[key] !== undefined && query[key] !== '') {
        if (
          key === 'tipo'
            ? !['entrada', 'saida'].includes(query[key])
            : !integer(query[key], 1, 2147483647)
        )
          throw new HttpError(400, 'Filtro inválido.', { [key]: 'Informe um filtro válido.' })
        values.push(key === 'tipo' ? query[key] : Number(query[key]))
        where += ` AND l.${column}=$${values.length}`
      }
    }
    const pagina = Number(query.pagina ?? 1)
    const porPagina = Number(query.porPagina ?? 10)
    if (!integer(pagina, 1, 1000000) || !integer(porPagina, 1, 100))
      throw new HttpError(400, 'Paginação inválida.')
    const totals = (
      await this.db.query(
        `SELECT count(*)::int AS quantidade, COALESCE(SUM(valor_centavos) FILTER (WHERE tipo='entrada'),0) AS entradas_centavos, COALESCE(SUM(valor_centavos) FILTER (WHERE tipo='saida'),0) AS saidas_centavos FROM financas.lancamentos l WHERE ${where}`,
        values,
      )
    ).rows[0]
    const items = (
      await this.db.query(
        `${selection} WHERE ${where} ORDER BY l.data DESC, l.id DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
        [...values, porPagina, (pagina - 1) * porPagina],
      )
    ).rows
    return {
      itens: items,
      periodo: range,
      pagina,
      porPagina,
      paginas: Math.max(1, Math.ceil(totals.quantidade / porPagina)),
      ...totals,
      saldo_centavos: totals.entradas_centavos - totals.saidas_centavos,
    }
  }
}
