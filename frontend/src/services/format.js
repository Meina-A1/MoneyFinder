const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
export const money = (cents = 0) => currency.format(cents / 100)
export const date = (value) =>
  value
    ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(
        new Date(`${value.slice(0, 10)}T12:00:00Z`),
      )
    : '—'
export const monthLabel = (value) =>
  new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${value.slice(0, 7)}-01T12:00:00Z`),
  )
export const typeLabel = {
  entrada: 'Entrada',
  saida: 'Saída',
  renda: 'Fonte de renda',
  conta: 'Conta',
  cartao_credito: 'Cartão de crédito',
}
export function currentDay() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}
export function monthRange(value = currentDay().slice(0, 7)) {
  const [year, month] = value.split('-').map(Number)
  return {
    inicio: `${value}-01`,
    fim: `${value}-${new Date(Date.UTC(year, month, 0)).getUTCDate()}`,
  }
}
