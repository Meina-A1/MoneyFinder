import { HttpError } from '../middlewares/errors.js'

export function cpfValido(value) {
  const cpf = String(value).replace(/\D/g, '')
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false
  const digit = (length) => {
    let sum = 0
    for (let i = 0; i < length; i++) sum += Number(cpf[i]) * (length + 1 - i)
    return ((sum * 10) % 11) % 10
  }
  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10])
}
export function invalid(fields) {
  if (Object.keys(fields).length) throw new HttpError(400, 'Confira os campos indicados.', fields)
}
export function text(value, max, min = 1) {
  return typeof value === 'string' && value.trim().length >= min && value.trim().length <= max
}
export function integer(value, min, max) {
  if (typeof value !== 'string' && typeof value !== 'number') return false
  return (
    String(value).trim() !== '' &&
    Number.isSafeInteger(Number(value)) &&
    Number(value) >= min &&
    Number(value) <= max
  )
}
export function cents(value) {
  if (typeof value !== 'number' && typeof value !== 'string') return null
  const input = String(value)
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(input)) return null
  const [whole, fraction = ''] = input.split('.')
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  return Number.isSafeInteger(amount) && amount > 0 && amount <= 999999999999 ? amount : null
}
export function validDate(value) {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    value < '1900-01-01' ||
    value > '2100-12-31'
  )
    return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}
export const iso = (date) => date.toISOString().slice(0, 10)
export function safeDate(year, month, day) {
  const first = new Date(Date.UTC(year, month, 1))
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate()
  return new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), Math.min(day, last)))
}
export function addMonths(value, amount) {
  const [year, month, day] = value.split('-').map(Number)
  return iso(safeDate(year, month - 1 + amount, day))
}
export function today() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}
export function monthPeriod(value = today()) {
  const [year, month] = value.split('-').map(Number)
  return { inicio: iso(safeDate(year, month - 1, 1)), fim: iso(safeDate(year, month - 1, 31)) }
}
export function period(query = {}) {
  const current = monthPeriod()
  const inicio = query.inicio ?? current.inicio
  const fim = query.fim ?? current.fim
  const fields = {}
  if (!validDate(inicio)) fields.inicio = 'Informe uma data inicial válida.'
  if (!validDate(fim)) fields.fim = 'Informe uma data final válida.'
  if (validDate(inicio) && validDate(fim) && inicio > fim)
    fields.fim = 'A data final deve ser igual ou posterior à inicial.'
  invalid(fields)
  return { inicio, fim }
}
export function previousPeriod({ inicio, fim }) {
  const length = (new Date(fim) - new Date(inicio)) / 86400000 + 1
  const end = new Date(inicio)
  end.setUTCDate(end.getUTCDate() - 1)
  const start = new Date(end)
  start.setUTCDate(start.getUTCDate() - length + 1)
  return { inicio: iso(start), fim: iso(end) }
}
export function calcularFatura(dataCompra, card, parcela = 1) {
  const [year, month, day] = dataCompra.split('-').map(Number)
  const closingDay = safeDate(year, month - 1, card.dia_fechamento).getUTCDate()
  const closingMonth = month - 1 + (day >= closingDay ? 1 : 0) + parcela - 1
  const fechamento = iso(safeDate(year, closingMonth, card.dia_fechamento))
  const vencimento = iso(
    safeDate(
      year,
      closingMonth + (card.dia_vencimento > card.dia_fechamento ? 0 : 1),
      card.dia_vencimento,
    ),
  )
  return { fechamento, vencimento, referencia: vencimento.slice(0, 7) }
}
export function splitInstallments(amount, total) {
  const base = Math.floor(amount / total)
  if (base < 1)
    throw new HttpError(400, 'Cada parcela deve ter pelo menos R$ 0,01.', {
      totalParcelas: 'Reduza a quantidade de parcelas.',
    })
  return Array.from({ length: total }, (_, i) => base + (i === 0 ? amount % total : 0))
}
