import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  cpfValido,
  cents,
  splitInstallments,
  calcularFatura,
  validDate,
  addMonths,
  previousPeriod,
} from '../src/models/rules.js'

test('CPF valida dígitos verificadores e rejeita sequências repetidas', () => {
  assert.equal(cpfValido('529.982.247-25'), true)
  for (const value of ['52998224724', '11111111111', '123', '', null])
    assert.equal(cpfValido(value), false)
})
test('dinheiro é convertido por dígitos, sem arredondamento binário ou truncamento', () => {
  assert.equal(cents('0.10'), 10)
  assert.equal(cents('100.01'), 10001)
  for (const value of [0, -1, '0.001', '1e2', Infinity, true, [], '10,00', ''])
    assert.equal(cents(value), null)
})
test('R$ 100,00 em 3 parcelas conserva centavos, com resto na primeira', () => {
  assert.deepEqual(splitInstallments(10000, 3), [3334, 3333, 3333])
  assert.throws(() => splitInstallments(1, 2), /pelo menos/)
})
for (const [purchase, card, number, expected] of [
  ['2026-11-02', { dia_fechamento: 3, dia_vencimento: 10 }, 1, ['2026-11-03', '2026-11-10']],
  ['2026-11-03', { dia_fechamento: 3, dia_vencimento: 10 }, 1, ['2026-12-03', '2026-12-10']],
  ['2026-12-28', { dia_fechamento: 25, dia_vencimento: 5 }, 1, ['2027-01-25', '2027-02-05']],
  ['2026-12-20', { dia_fechamento: 25, dia_vencimento: 5 }, 3, ['2027-02-25', '2027-03-05']],
  ['2028-02-29', { dia_fechamento: 31, dia_vencimento: 31 }, 1, ['2028-03-31', '2028-04-30']],
  ['2027-02-27', { dia_fechamento: 31, dia_vencimento: 5 }, 1, ['2027-02-28', '2027-03-05']],
])
  test(`fatura: ${purchase}, parcela ${number}, fecha ${expected[0]}, vence ${expected[1]}`, () => {
    const result = calcularFatura(purchase, card, number)
    assert.equal(result.fechamento, expected[0])
    assert.equal(result.vencimento, expected[1])
    assert.equal(result.referencia, expected[1].slice(0, 7))
  })
test('datas inválidas e anos bissextos são tratados sem horário local', () => {
  assert.equal(validDate('2028-02-29'), true)
  for (const value of ['2027-02-29', '2026-04-31', '2026-1-01', '1899-01-01', '2101-01-01'])
    assert.equal(validDate(value), false)
  assert.equal(addMonths('2026-01-31', 1), '2026-02-28')
  assert.deepEqual(previousPeriod({ inicio: '2026-11-01', fim: '2026-11-30' }), {
    inicio: '2026-10-02',
    fim: '2026-10-31',
  })
})
