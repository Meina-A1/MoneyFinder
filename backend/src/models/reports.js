import { HttpError } from '../middlewares/errors.js'
import {
  addMonths,
  calcularFatura,
  integer,
  iso,
  monthPeriod,
  period,
  previousPeriod,
  safeDate,
  today,
} from './rules.js'
import { Catalogs } from './catalogs.js'

export class Reports {
  constructor(db) {
    this.db = db
  }
  async categories(userId, query) {
    const range = period(query)
    const previous = previousPeriod(range)
    const { rows } = await this.db.query(
      `SELECT c.id,c.nome,c.tipo,
      COALESCE(SUM(l.valor_centavos) FILTER (WHERE l.data BETWEEN $2 AND $3),0) AS total_centavos,
      COALESCE(SUM(l.valor_centavos) FILTER (WHERE l.data BETWEEN $4 AND $5),0) AS anterior_centavos
      FROM financas.categorias c LEFT JOIN financas.lancamentos l ON l.categoria_id=c.id AND l.usuario_id=c.usuario_id
      WHERE c.usuario_id=$1 GROUP BY c.id ORDER BY total_centavos DESC,c.nome`,
      [userId, range.inicio, range.fim, previous.inicio, previous.fim],
    )
    const totalSaidas = rows
      .filter((r) => r.tipo === 'saida')
      .reduce((s, r) => s + r.total_centavos, 0)
    const totalEntradas = rows
      .filter((r) => r.tipo === 'entrada')
      .reduce((s, r) => s + r.total_centavos, 0)
    return {
      periodo: range,
      periodoAnterior: previous,
      total_saidas_centavos: totalSaidas,
      total_entradas_centavos: totalEntradas,
      categorias: rows.map((r) => ({
        ...r,
        percentual: r.tipo === 'saida' && totalSaidas ? (r.total_centavos / totalSaidas) * 100 : 0,
        variacao: r.anterior_centavos
          ? ((r.total_centavos - r.anterior_centavos) / r.anterior_centavos) * 100
          : null,
      })),
    }
  }
  async sources(userId, query) {
    const range = period(query)
    const { rows } = await this.db.query(
      `SELECT f.id,f.nome,f.tipo,
      COALESCE(SUM(l.valor_centavos) FILTER (WHERE l.tipo='entrada'),0) AS entradas_centavos,
      COALESCE(SUM(l.valor_centavos) FILTER (WHERE l.tipo='saida'),0) AS saidas_centavos
      FROM financas.fontes_destinos f LEFT JOIN financas.lancamentos l ON l.fonte_destino_id=f.id AND l.usuario_id=f.usuario_id AND l.data BETWEEN $2 AND $3
      WHERE f.usuario_id=$1 GROUP BY f.id ORDER BY f.nome`,
      [userId, range.inicio, range.fim],
    )
    return {
      periodo: range,
      fontesDestinos: rows.map((r) => ({
        ...r,
        saldo_centavos: r.entradas_centavos - r.saidas_centavos,
      })),
    }
  }
  async invoices(userId, query = {}, referenceDate = today()) {
    const months = Number(query.meses ?? 3)
    if (!integer(months, 3, 12))
      throw new HttpError(400, 'Informe de 3 a 12 próximas faturas.', {
        meses: 'Use de 3 a 12 meses.',
      })
    const cards = (await new Catalogs(this.db, 'fontes-destinos').list(userId)).filter(
      (r) => r.tipo === 'cartao_credito',
    )
    const { rows: purchases } = await this.db.query(
      `SELECT id,descricao,valor_centavos,data_compra::text AS data_compra,parcela_atual,total_parcelas,fonte_destino_id FROM financas.lancamentos WHERE usuario_id=$1 AND tipo='saida' AND fonte_destino_id IN (SELECT id FROM financas.fontes_destinos WHERE usuario_id=$1 AND tipo='cartao_credito') ORDER BY data_compra,id`,
      [userId],
    )
    return {
      dataReferencia: referenceDate,
      cartoes: cards.map((card) => {
        const current = calcularFatura(referenceDate, card)
        const invoices = Array.from({ length: months + 1 }, (_, offset) => {
          const [year, month] = current.fechamento.split('-').map(Number)
          const fechamento = iso(safeDate(year, month - 1 + offset, card.dia_fechamento))
          const vencimento = iso(
            safeDate(
              year,
              month - 1 + offset + (card.dia_vencimento > card.dia_fechamento ? 0 : 1),
              card.dia_vencimento,
            ),
          )
          return {
            referencia: vencimento.slice(0, 7),
            fechamento,
            vencimento,
            itens: [],
            total_centavos: 0,
          }
        })
        let used = 0
        for (const item of purchases.filter((r) => r.fonte_destino_id === card.id)) {
          const cycle = calcularFatura(item.data_compra, card, item.parcela_atual)
          if (cycle.vencimento >= referenceDate) used += item.valor_centavos
          const target = invoices.find((r) => r.referencia === cycle.referencia)
          if (target) {
            target.itens.push(item)
            target.total_centavos += item.valor_centavos
          }
        }
        return {
          ...card,
          utilizado_centavos: used,
          disponivel_centavos: card.limite_centavos - used,
          faturas: invoices,
        }
      }),
    }
  }
  async health(userId) {
    const current = monthPeriod()
    const historyStart = monthPeriod(addMonths(current.inicio, -3)).inicio
    const { rows: months } = await this.db.query(
      `SELECT to_char(data,'YYYY-MM') AS mes,
      COALESCE(SUM(valor_centavos) FILTER (WHERE tipo='entrada'),0) AS entradas_centavos,
      COALESCE(SUM(valor_centavos) FILTER (WHERE tipo='saida'),0) AS saidas_centavos
      FROM financas.lancamentos WHERE usuario_id=$1 AND data BETWEEN $2 AND $3 GROUP BY to_char(data,'YYYY-MM') ORDER BY mes`,
      [userId, historyStart, current.fim],
    )
    const actual = months.find((m) => m.mes === current.inicio.slice(0, 7)) || {
      entradas_centavos: 0,
      saidas_centavos: 0,
    }
    const history = months.filter((m) => m.mes < current.inicio.slice(0, 7))
    // Meses sem registros contam como zero na janela fixa de 3 meses.
    const meanIncome = Math.round(history.reduce((s, m) => s + m.entradas_centavos, 0) / 3)
    const { rows: nonCard } = await this.db.query(
      `SELECT COALESCE(SUM(l.valor_centavos),0) AS total FROM financas.lancamentos l JOIN financas.fontes_destinos f ON f.id=l.fonte_destino_id WHERE l.usuario_id=$1 AND l.tipo='saida' AND f.tipo<>'cartao_credito' AND l.data >= $2 AND l.data < $3`,
      [userId, historyStart, current.inicio],
    )
    const meanExpenses = Math.round(nonCard[0].total / 3)
    const invoiceData = await this.invoices(userId)
    const futureBills = invoiceData.cartoes
      .flatMap((c) => c.faturas.slice(0, 3))
      .reduce((s, f) => s + f.total_centavos, 0)
    const savings = actual.entradas_centavos
      ? ((actual.entradas_centavos - actual.saidas_centavos) / actual.entradas_centavos) * 100
      : null
    const commitment = meanIncome ? (futureBills / (meanIncome * 3)) * 100 : null
    const {
      rows: [balance],
    } = await this.db.query(
      `SELECT COALESCE(SUM(CASE WHEN tipo='entrada' THEN valor_centavos ELSE -valor_centavos END),0) AS saldo FROM financas.lancamentos WHERE usuario_id=$1 AND data<=$2`,
      [userId, current.fim],
    )
    const {
      rows: [future],
    } = await this.db.query(
      `SELECT COALESCE(SUM(valor_centavos),0) AS total FROM financas.lancamentos WHERE usuario_id=$1 AND total_parcelas>1 AND data>$2`,
      [userId, today()],
    )
    let projected = balance.saldo
    const projections = Array.from({ length: 3 }, (_, i) => {
      const month = addMonths(current.inicio, i + 1).slice(0, 7)
      const bills = invoiceData.cartoes
        .flatMap((c) => c.faturas)
        .filter((f) => f.referencia === month)
        .reduce((s, f) => s + f.total_centavos, 0)
      projected += meanIncome - meanExpenses - bills
      return { mes: month, saldo_centavos: projected, faturas_centavos: bills }
    })
    const tips = []
    if (savings === null) tips.push('Registre suas entradas para calcular a taxa de poupança.')
    else
      tips.push(
        savings >= 20
          ? 'Sua taxa de poupança está acima da referência de 20% adotada neste projeto.'
          : 'Sua taxa de poupança está abaixo da referência de 20% adotada neste projeto. Revise os gastos do mês.',
      )
    if (commitment !== null && commitment > 30)
      tips.push(
        'As faturas previstas superam 30% da renda média na janela analisada. Revise novas compras parceladas.',
      )
    if (projections.some((p) => p.saldo_centavos < 0))
      tips.push('A projeção aponta saldo negativo. Confira as parcelas e ajuste o planejamento.')
    if (history.length < 3)
      tips.push(
        'O histórico tem menos de 3 meses com registros; as projeções podem subestimar sua movimentação.',
      )
    return {
      periodo: current,
      taxa_poupanca: savings,
      comprometimento_cartoes: commitment,
      parcelas_futuras_centavos: future.total,
      renda_media_centavos: meanIncome,
      projecoes: projections,
      dicas: tips,
    }
  }
}
