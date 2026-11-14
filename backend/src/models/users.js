import { invalid, cpfValido, text } from './rules.js'

export function validateRegistration(body) {
  const fields = {}
  if (!text(body.nome, 120, 2)) fields.nome = 'Informe um nome entre 2 e 120 caracteres.'
  if (!text(body.email, 160) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim()))
    fields.email = 'Informe um e-mail válido.'
  if (!text(body.cpf, 20) || !cpfValido(body.cpf))
    fields.cpf = 'Informe um CPF com dígitos verificadores válidos.'
  if (
    typeof body.senha !== 'string' ||
    body.senha.length < 8 ||
    Buffer.byteLength(body.senha) > 72 ||
    !/[a-zA-Z]/.test(body.senha) ||
    !/\d/.test(body.senha)
  )
    fields.senha = 'Use pelo menos 8 caracteres, com letras e números (máximo de 72 bytes).'
  if (body.confirmacaoSenha !== body.senha || !body.confirmacaoSenha)
    fields.confirmacaoSenha = 'As senhas precisam ser iguais.'
  invalid(fields)
  return {
    nome: body.nome.trim(),
    email: body.email.trim().toLowerCase(),
    cpf: body.cpf.replace(/\D/g, ''),
  }
}

export class Users {
  constructor(db) {
    this.db = db
  }
  async findEmail(email) {
    return (await this.db.query('SELECT * FROM financas.usuarios WHERE email = $1', [email]))
      .rows[0]
  }
  async me(id) {
    return (
      await this.db.query(
        'SELECT id, nome, email, cpf, criado_em FROM financas.usuarios WHERE id = $1',
        [id],
      )
    ).rows[0]
  }
  async create(data, hash) {
    return this.db.transaction(async (client) => {
      const {
        rows: [user],
      } = await client.query(
        'INSERT INTO financas.usuarios (nome, email, cpf, senha_hash) VALUES ($1,$2,$3,$4) RETURNING id, nome, email, cpf',
        [data.nome, data.email, data.cpf, hash],
      )
      const defaults = [
        ['Salário', 'entrada'],
        ['Freelance', 'entrada'],
        ['Alimentação', 'saida'],
        ['Moradia', 'saida'],
        ['Mobilidade', 'saida'],
        ['Saúde', 'saida'],
        ['Lazer', 'saida'],
      ]
      for (const [nome, tipo] of defaults)
        await client.query(
          'INSERT INTO financas.categorias (usuario_id,nome,tipo) VALUES ($1,$2,$3)',
          [user.id, nome, tipo],
        )
      for (const [nome, tipo] of [
        ['Salário', 'renda'],
        ['Conta corrente', 'conta'],
        ['Dinheiro', 'conta'],
      ])
        await client.query(
          'INSERT INTO financas.fontes_destinos (usuario_id,nome,tipo) VALUES ($1,$2,$3)',
          [user.id, nome, tipo],
        )
      return user
    })
  }
}
