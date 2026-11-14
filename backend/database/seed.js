import bcrypt from 'bcryptjs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { configuration } from '../src/config/env.js'
import { openDatabase } from '../src/config/database.js'
import { Users } from '../src/models/users.js'
import { Catalogs } from '../src/models/catalogs.js'
import { Entries } from '../src/models/entries.js'
import { addMonths, monthPeriod } from '../src/models/rules.js'

export async function seed(db) {
  const users = new Users(db)
  const entries = new Entries(db)
  const result = []
  for (const [nome, email, cpf] of [
    ['Ana Demo', 'ana@demo.local', '52998224725'],
    ['Bruno Demo', 'bruno@demo.local', '11144477735'],
  ]) {
    if (await users.findEmail(email)) {
      result.push(`${email}: já existe; dados preservados`)
      continue
    }
    const user = await users.create({ nome, email, cpf }, await bcrypt.hash('Demo12345', 10))
    const categories = await new Catalogs(db, 'categorias').list(user.id)
    const sourcesModel = new Catalogs(db, 'fontes-destinos')
    const sources = await sourcesModel.list(user.id)
    const card = await sourcesModel.save(user.id, {
      nome: 'Cartão do dia a dia',
      tipo: 'cartao_credito',
      diaFechamento: 25,
      diaVencimento: 5,
      limite: '6000.00',
    })
    const salary = sources.find((s) => s.tipo === 'renda')
    const account = sources.find((s) => s.nome === 'Conta corrente')
    const start = monthPeriod().inicio
    const create = (tipo, descricao, valor, data, category, source, totalParcelas = 1) =>
      entries.create(user.id, {
        tipo,
        descricao,
        valor,
        data,
        categoriaId: categories.find((c) => c.nome === category).id,
        fonteDestinoId: source.id,
        totalParcelas,
      })
    for (let offset = -2; offset <= 0; offset++) {
      const base = addMonths(start, offset).slice(0, 7)
      await create(
        'entrada',
        'Salário mensal',
        nome.startsWith('Ana') ? '5200.00' : '4300.00',
        `${base}-05`,
        'Salário',
        salary,
      )
      await create('entrada', 'Projeto freelance', '650.00', `${base}-10`, 'Freelance', account)
      await create('saida', 'Aluguel', '1450.00', `${base}-08`, 'Moradia', account)
      await create(
        'saida',
        'Supermercado',
        String(428 + offset * 15) + '.90',
        `${base}-11`,
        'Alimentação',
        account,
      )
      await create('saida', 'Transporte', '180.00', `${base}-12`, 'Mobilidade', account)
      await create('saida', 'Cinema e jantar', '160.00', `${base}-13`, 'Lazer', card)
    }
    await create(
      'saida',
      'Notebook para estudos',
      '2400.00',
      addMonths(start, -1).slice(0, 7) + '-20',
      'Lazer',
      card,
      6,
    )
    result.push(`${email}: criado com 3 meses de lançamentos`)
  }
  return result
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const db = openDatabase(configuration())
  try {
    for (const message of await seed(db)) console.log(message)
    console.log('Senha das contas fictícias: Demo12345')
  } finally {
    await db.close()
  }
}
