import { after, before, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { once } from 'node:events'
import { createApp } from '../src/server.js'
import { Users } from '../src/models/users.js'
import { Catalogs } from '../src/models/catalogs.js'
import { Entries } from '../src/models/entries.js'
import { Reports } from '../src/models/reports.js'
import { seed } from '../database/seed.js'
import { testDatabase } from './helpers.js'

let db, server, base, ana, bruno, categories, sources, card
const config = {
  jwtSecret: 'segredo-exclusivo-para-os-testes-com-mais-de-32-caracteres',
  origin: 'http://127.0.0.1:5173',
}
const hash = bcrypt.hashSync('Teste12345', 10)
const token = (id, expiresIn = '1h') =>
  jwt.sign({}, config.jwtSecret, {
    subject: String(id),
    issuer: 'financas-api',
    audience: 'financas-spa',
    expiresIn,
  })
before(async () => {
  db = await testDatabase()
  server = createApp(db, config).listen(0, '127.0.0.1')
  await once(server, 'listening')
  base = `http://127.0.0.1:${server.address().port}/api`
})
after(async () => {
  await new Promise((done) => server.close(done))
  await db.close()
})
beforeEach(async () => {
  await db.query('TRUNCATE financas.usuarios RESTART IDENTITY CASCADE')
  const users = new Users(db)
  ana = await users.create(
    { nome: 'Ana Teste', email: 'ana@teste.local', cpf: '52998224725' },
    hash,
  )
  bruno = await users.create(
    { nome: 'Bruno Teste', email: 'bruno@teste.local', cpf: '11144477735' },
    hash,
  )
  categories = await new Catalogs(db, 'categorias').list(ana.id)
  sources = await new Catalogs(db, 'fontes-destinos').list(ana.id)
  card = await new Catalogs(db, 'fontes-destinos').save(ana.id, {
    nome: 'Cartão teste',
    tipo: 'cartao_credito',
    diaFechamento: 25,
    diaVencimento: 5,
    limite: '1000.00',
  })
})
async function request(path, { user = ana?.id, body, method = 'GET', authorization } = {}) {
  const response = await fetch(base + path, {
    method,
    headers: {
      ...(user ? { Authorization: `Bearer ${token(user)}` } : {}),
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(authorization ? { Authorization: authorization } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
  const data = response.status === 204 ? null : await response.json()
  assert.equal(JSON.stringify(data).includes('senha_hash'), false)
  return { status: response.status, data, headers: response.headers }
}
function entry(overrides = {}) {
  return {
    tipo: 'saida',
    descricao: 'Compra teste',
    valor: '100.00',
    data: '2026-12-28',
    categoriaId: categories.find((c) => c.tipo === 'saida').id,
    fonteDestinoId: card.id,
    totalParcelas: 3,
    ...overrides,
  }
}
const registration = (overrides = {}) => ({
  nome: 'Carla Teste',
  email: 'CARLA@TESTE.LOCAL ',
  cpf: '123.456.789-09',
  senha: 'Teste12345',
  confirmacaoSenha: 'Teste12345',
  ...overrides,
})

test('cadastro normaliza e cria padrões; banco rejeita e-mail e CPF duplicados no campo correto', async () => {
  const result = await request('/auth/cadastro', {
    user: null,
    method: 'POST',
    body: registration(),
  })
  assert.equal(result.status, 201)
  assert.equal(result.data.usuario.email, 'carla@teste.local')
  assert.ok(result.data.token)
  assert.equal((await new Catalogs(db, 'categorias').list(result.data.usuario.id)).length, 7)
  let duplicate = await request('/auth/cadastro', {
    user: null,
    method: 'POST',
    body: registration({ email: 'carla@teste.local', cpf: '390.533.447-05' }),
  })
  assert.equal(duplicate.status, 409)
  assert.ok(duplicate.data.campos.email)
  duplicate = await request('/auth/cadastro', {
    user: null,
    method: 'POST',
    body: registration({ email: 'outra@teste.local', cpf: '12345678909' }),
  })
  assert.equal(duplicate.status, 409)
  assert.ok(duplicate.data.campos.cpf)
  const stored = await new Users(db).findEmail('carla@teste.local')
  assert.notEqual(stored.senha_hash, 'Teste12345')
  assert.equal(await bcrypt.compare('Teste12345', stored.senha_hash), true)
})
test('cadastro inválido indica CPF, senha e confirmação, sem persistir', async () => {
  const result = await request('/auth/cadastro', {
    user: null,
    method: 'POST',
    body: registration({ cpf: '52998224724', senha: 'fraca', confirmacaoSenha: 'outra' }),
  })
  assert.equal(result.status, 400)
  for (const f of ['cpf', 'senha', 'confirmacaoSenha']) assert.ok(result.data.campos[f])
  assert.equal(await new Users(db).findEmail('carla@teste.local'), undefined)
})
test('unicidade existe no banco mesmo sem validação prévia da API', async () => {
  await assert.rejects(
    () =>
      db.query('INSERT INTO financas.usuarios(nome,email,cpf,senha_hash) VALUES ($1,$2,$3,$4)', [
        'Outra',
        ana.email,
        '39053344705',
        hash,
      ]),
    (e) => e.code === '23505',
  )
  await assert.rejects(
    () =>
      db.query('INSERT INTO financas.usuarios(nome,email,cpf,senha_hash) VALUES ($1,$2,$3,$4)', [
        'Outra',
        'outra@teste.local',
        ana.cpf,
        hash,
      ]),
    (e) => e.code === '23505',
  )
})
test('login, me, credenciais inválidas genéricas e tokens ausente/expirado', async () => {
  const valid = await request('/auth/login', {
    user: null,
    method: 'POST',
    body: { email: ' ANA@TESTE.LOCAL ', senha: 'Teste12345' },
  })
  assert.equal(valid.status, 200)
  assert.equal(jwt.verify(valid.data.token, config.jwtSecret).sub, String(ana.id))
  const incorrect = await request('/auth/login', {
    user: null,
    method: 'POST',
    body: { email: ana.email, senha: 'errada' },
  })
  const missing = await request('/auth/login', {
    user: null,
    method: 'POST',
    body: { email: 'ausente@teste.local', senha: 'errada' },
  })
  assert.deepEqual(incorrect.data, missing.data)
  assert.equal(missing.status, 401)
  assert.equal((await request('/auth/me')).data.id, ana.id)
  assert.equal((await request('/lancamentos', { user: null })).status, 401)
  assert.equal(
    (await request('/lancamentos', { authorization: `Bearer ${token(ana.id, -1)}` })).status,
    401,
  )
  assert.equal((await request('/lancamentos', { authorization: 'Bearer invalido' })).status, 401)
})
test('CRUD de categorias, duplicatas e impedimento de excluir ou mudar tipo vinculado', async () => {
  const created = await request('/categorias', {
    method: 'POST',
    body: { nome: 'Educação', tipo: 'saida' },
  })
  assert.equal(created.status, 201)
  assert.equal(
    (await request('/categorias', { method: 'POST', body: { nome: 'educação', tipo: 'saida' } }))
      .status,
    409,
  )
  assert.equal(
    (
      await request(`/categorias/${created.data.id}`, {
        method: 'PUT',
        body: { nome: 'Estudos', tipo: 'saida' },
      })
    ).data.nome,
    'Estudos',
  )
  assert.equal((await request(`/categorias/${created.data.id}`, { method: 'DELETE' })).status, 204)
  await new Entries(db).create(ana.id, entry())
  assert.equal(
    (await request(`/categorias/${entry().categoriaId}`, { method: 'DELETE' })).status,
    409,
  )
  assert.equal(
    (
      await request(`/categorias/${entry().categoriaId}`, {
        method: 'PUT',
        body: { nome: 'Alterada', tipo: 'entrada' },
      })
    ).status,
    409,
  )
})
test('fontes e cartões validam campos, unicidade, edição e exclusão', async () => {
  const invalid = await request('/fontes-destinos', {
    method: 'POST',
    body: { nome: 'Sem dias', tipo: 'cartao_credito' },
  })
  assert.equal(invalid.status, 400)
  assert.ok(invalid.data.campos.diaFechamento)
  const created = await request('/fontes-destinos', {
    method: 'POST',
    body: { nome: 'Poupança', tipo: 'conta' },
  })
  assert.equal(created.status, 201)
  assert.equal(
    (
      await request('/fontes-destinos', {
        method: 'POST',
        body: { nome: 'Poupança', tipo: 'conta' },
      })
    ).status,
    409,
  )
  assert.equal(
    (
      await request(`/fontes-destinos/${created.data.id}`, {
        method: 'PUT',
        body: { nome: 'Reserva', tipo: 'conta' },
      })
    ).status,
    200,
  )
  assert.equal(
    (await request(`/fontes-destinos/${created.data.id}`, { method: 'DELETE' })).status,
    204,
  )
  await new Entries(db).create(ana.id, entry())
  assert.equal((await request(`/fontes-destinos/${card.id}`, { method: 'DELETE' })).status, 409)
  assert.equal(
    (
      await request(`/fontes-destinos/${card.id}`, {
        method: 'PUT',
        body: { nome: 'Cartão teste', tipo: 'conta' },
      })
    ).status,
    409,
  )
})
test('parcelamento gera lançamentos exatos, paginação e totais no servidor', async () => {
  const result = await request('/lancamentos', { method: 'POST', body: entry() })
  assert.equal(result.status, 201)
  assert.deepEqual(
    result.data.itens.map((i) => i.valor_centavos),
    [3334, 3333, 3333],
  )
  assert.equal(new Set(result.data.itens.map((i) => i.grupo_parcelamento)).size, 1)
  const listed = await request('/lancamentos?inicio=2026-12-01&fim=2027-12-31&porPagina=1&pagina=2')
  assert.equal(listed.data.itens.length, 1)
  assert.equal(listed.data.quantidade, 3)
  assert.equal(listed.data.saidas_centavos, 10000)
  assert.equal(listed.data.saldo_centavos, -10000)
  const filtered = await request(
    `/lancamentos?inicio=2026-12-01&fim=2027-12-31&tipo=entrada&fonteDestinoId=${card.id}`,
  )
  assert.equal(filtered.data.quantidade, 0)
})
test('validações de lançamento cobrem valor, data, tipo, parcelas e fonte', async () => {
  for (const override of [
    { valor: '0' },
    { data: '2026-02-30' },
    { categoriaId: categories.find((c) => c.tipo === 'entrada').id },
    { totalParcelas: 49 },
    { fonteDestinoId: sources.find((s) => s.tipo === 'conta').id },
    { fonteDestinoId: sources.find((s) => s.tipo === 'renda').id, totalParcelas: 1 },
  ]) {
    assert.equal(
      (await request('/lancamentos', { method: 'POST', body: entry(override) })).status,
      400,
    )
  }
  assert.equal((await request('/lancamentos?pagina=0')).status, 400)
  assert.equal((await request('/lancamentos?inicio=2026-12-10&fim=2026-12-01')).status, 400)
})
test('usuário B não lê, altera ou exclui registros de A, nem injeta relacionamentos', async () => {
  const [item] = await new Entries(db).create(ana.id, entry())
  for (const [path, body] of [
    [`/lancamentos/${item.id}`, entry()],
    [`/categorias/${categories[0].id}`, { nome: 'Invadida', tipo: 'saida' }],
    [`/fontes-destinos/${card.id}`, { nome: 'Invadida', tipo: 'conta' }],
  ]) {
    for (const method of ['GET', 'PUT', 'DELETE'])
      assert.equal(
        (await request(path, { user: bruno.id, method, ...(method === 'PUT' ? { body } : {}) }))
          .status,
        404,
      )
  }
  assert.equal(
    (
      await request('/lancamentos', {
        user: bruno.id,
        method: 'POST',
        body: entry({ usuario_id: ana.id }),
      })
    ).status,
    404,
  )
  assert.equal(
    (await request('/relatorios/categorias', { user: bruno.id })).data.total_saidas_centavos,
    0,
  )
  assert.equal((await request('/relatorios/faturas', { user: bruno.id })).data.cartoes.length, 0)
})
test('chave estrangeira composta bloqueia posse e categoria incompatível no próprio banco', async () => {
  await assert.rejects(
    () =>
      db.query(
        `INSERT INTO financas.lancamentos(usuario_id,tipo,descricao,valor_centavos,data,data_compra,categoria_id,fonte_destino_id) VALUES ($1,'saida','Inválido',100,'2026-11-01','2026-11-01',$2,$3)`,
        [bruno.id, entry().categoriaId, card.id],
      ),
    (e) => e.code === '23503',
  )
  await assert.rejects(
    () =>
      db.query(
        `INSERT INTO financas.lancamentos(usuario_id,tipo,descricao,valor_centavos,data,data_compra,categoria_id,fonte_destino_id) VALUES ($1,'entrada','Inválido',100,'2026-11-01','2026-11-01',$2,$3)`,
        [ana.id, entry().categoriaId, card.id],
      ),
    (e) => e.code === '23503',
  )
})
test('uma falha na segunda parcela reverte a compra inteira', async () => {
  const failingDb = {
    ...db,
    transaction: (operation) =>
      db.transaction((client) => {
        let inserts = 0
        return operation({
          query: (sql, values) => {
            if (sql.startsWith('INSERT INTO financas.lancamentos') && ++inserts === 2)
              throw new Error('Falha simulada na segunda parcela')
            return client.query(sql, values)
          },
        })
      }),
  }
  await assert.rejects(() => new Entries(failingDb).create(ana.id, entry()), /Falha simulada/)
  assert.equal(
    (await db.query('SELECT count(*)::int AS count FROM financas.lancamentos')).rows[0].count,
    0,
  )
})
test('edição de uma parcela e exclusão individual ou do grupo preservam os demais dados', async () => {
  const created = await new Entries(db).create(ana.id, entry())
  const updated = await request(`/lancamentos/${created[1].id}`, {
    method: 'PUT',
    body: entry({ descricao: 'Parcela alterada', valor: '30.00', data: created[1].data }),
  })
  assert.equal(updated.status, 200)
  assert.equal(updated.data.valor_centavos, 3000)
  assert.equal(updated.data.parcela_atual, 2)
  assert.equal((await request(`/lancamentos/${created[1].id}`, { method: 'DELETE' })).status, 204)
  assert.equal(
    (await db.query('SELECT count(*)::int AS count FROM financas.lancamentos')).rows[0].count,
    2,
  )
  assert.equal(
    (await request(`/lancamentos/${created[0].id}?todasParcelas=true`, { method: 'DELETE' }))
      .status,
    204,
  )
  assert.equal(
    (await db.query('SELECT count(*)::int AS count FROM financas.lancamentos')).rows[0].count,
    0,
  )
})
test('relatórios agregam categorias, percentuais e variação do período anterior', async () => {
  const entries = new Entries(db)
  await entries.create(ana.id, entry({ data: '2026-10-10', valor: '50.00', totalParcelas: 1 }))
  await entries.create(ana.id, entry({ data: '2026-11-10', valor: '100.00', totalParcelas: 1 }))
  const result = await request('/relatorios/categorias?inicio=2026-11-01&fim=2026-11-30')
  const category = result.data.categorias.find((c) => c.id === entry().categoriaId)
  assert.equal(result.data.total_saidas_centavos, 10000)
  assert.equal(category.percentual, 100)
  assert.equal(category.variacao, 100)
  const source = await request('/relatorios/fontes-destinos?inicio=2026-11-01&fim=2026-11-30')
  assert.equal(source.data.fontesDestinos.find((f) => f.id === card.id).saidas_centavos, 10000)
})
test('faturas incluem a aberta + 3 próximas e o limite usa todas as parcelas não vencidas', async () => {
  await new Entries(db).create(ana.id, entry())
  const report = await new Reports(db).invoices(ana.id, {}, '2026-12-28')
  const result = report.cartoes[0]
  assert.equal(result.faturas.length, 4)
  assert.equal(result.faturas[0].referencia, '2027-02')
  assert.equal(result.faturas[0].total_centavos, 3334)
  assert.equal(result.utilizado_centavos, 10000)
  assert.equal(result.disponivel_centavos, 90000)
  assert.equal(result.faturas[2].itens[0].parcela_atual, 3)
})
test('seed é repetível, tem dois usuários, histórico de três meses e dados isolados', async () => {
  await db.query('TRUNCATE financas.usuarios RESTART IDENTITY CASCADE')
  await seed(db)
  const counts = (
    await db.query(
      'SELECT count(*)::int AS count, count(DISTINCT usuario_id)::int AS users FROM financas.lancamentos',
    )
  ).rows[0]
  assert.equal(counts.users, 2)
  assert.ok(counts.count >= 36)
  await seed(db)
  assert.equal(
    (await db.query('SELECT count(*)::int AS count FROM financas.lancamentos')).rows[0].count,
    counts.count,
  )
  const health = await request('/saude-financeira', { user: 1 })
  assert.equal(health.status, 200)
  assert.equal(health.data.projecoes.length, 3)
  assert.ok(health.data.dicas.length)
})
test('CORS libera apenas a origem configurada e erros mantêm contrato', async () => {
  const response = await request('/auth/me')
  assert.equal(response.headers.get('access-control-allow-origin'), config.origin)
  const missing = await request('/nao-existe')
  assert.equal(missing.status, 404)
  assert.deepEqual(Object.keys(missing.data).sort(), ['campos', 'erro'])
})
