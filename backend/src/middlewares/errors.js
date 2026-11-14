export class HttpError extends Error {
  constructor(status, message, fields = {}) {
    super(message)
    this.status = status
    this.fields = fields
  }
}

export function errorHandler(error, _req, res, _next) {
  if (error instanceof HttpError)
    return res.status(error.status).json({ erro: error.message, campos: error.fields })
  if (error.type === 'entity.parse.failed')
    return res.status(400).json({ erro: 'JSON inválido.', campos: {} })
  if (error.type === 'entity.too.large')
    return res.status(413).json({ erro: 'Requisição muito grande.', campos: {} })
  if (error.code === '23505') {
    const field = error.constraint?.includes('usuarios_cpf')
      ? 'cpf'
      : error.constraint?.includes('usuarios_email')
        ? 'email'
        : 'nome'
    const message =
      field === 'cpf'
        ? 'Já existe um usuário com este CPF.'
        : field === 'email'
          ? 'Já existe um usuário com este e-mail.'
          : 'Este nome já está cadastrado para este tipo.'
    return res.status(409).json({ erro: message, campos: { [field]: message } })
  }
  if (error.code === '23503')
    return res.status(409).json({
      erro: 'Existem lançamentos vinculados. Remova-os antes de excluir ou alterar o tipo.',
      campos: {},
    })
  if (['23514', '23502', '22007', '22008', '22P02'].includes(error.code))
    return res.status(400).json({ erro: 'Os dados violam uma regra de integridade.', campos: {} })
  console.error('Falha interna na API:', error.code || error.name)
  return res
    .status(500)
    .json({ erro: 'Não foi possível concluir a operação. Tente novamente.', campos: {} })
}
