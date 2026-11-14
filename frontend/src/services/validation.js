// A validação no cliente complementa a validação obrigatória da API.
export function validCpf(value) {
  const digits = String(value).replace(/\D/g, '')
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false
  const check = (length) => {
    let sum = 0
    for (let i = 0; i < length; i++) sum += Number(digits[i]) * (length + 1 - i)
    return ((sum * 10) % 11) % 10
  }
  return check(9) === Number(digits[9]) && check(10) === Number(digits[10])
}
