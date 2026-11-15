import assert from 'node:assert/strict'

const base = (process.env.MONEYFINDER_API_URL || 'http://127.0.0.1:3001/api').replace(/\/$/, '')

async function request(path, { token, body, method = 'GET' } = {}) {
  const response = await fetch(base + path, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(10000),
  })
  return { status: response.status, data: await response.json() }
}

async function login(email) {
  const result = await request('/auth/login', {
    method: 'POST',
    body: { email, senha: 'Demo12345' },
  })
  assert.equal(
    result.status,
    200,
    'Execute o seed e mantenha as contas de demonstração disponíveis.',
  )
  assert.ok(result.data.token)
  assert.equal(result.data.usuario.email, email)
  return result.data.token
}

async function main() {
  console.log('Demonstração HTTP — contas fictícias do seed; tokens não são exibidos.')
  const missing = await request('/categorias')
  assert.equal(missing.status, 401)
  console.log('1. Sem token: HTTP 401.')
  const ana = await login('ana@demo.local')
  const bruno = await login('bruno@demo.local')
  console.log('2. Login de Ana e Bruno: HTTP 200.')

  const own = await request('/categorias', { token: bruno })
  assert.equal(own.status, 200)
  assert.ok(own.data.length > 0, 'Bruno precisa ter ao menos uma categoria.')
  const forbidden = await request(`/categorias/${own.data[0].id}`, { token: ana })
  assert.equal(forbidden.status, 404)
  console.log('3. Ana tentando ler uma categoria de Bruno: HTTP 404.')

  const registration = {
    nome: 'Duplicata de demonstração',
    email: 'ANA@DEMO.LOCAL ',
    cpf: '390.533.447-05',
    senha: 'Demo12345',
    confirmacaoSenha: 'Demo12345',
  }
  const email = await request('/auth/cadastro', { method: 'POST', body: registration })
  assert.equal(email.status, 409)
  assert.ok(email.data.campos.email)
  console.log('4. E-mail repetido com maiúsculas/espaço: HTTP 409, campo email.')
  const cpf = await request('/auth/cadastro', {
    method: 'POST',
    body: { ...registration, email: `duplicata-${Date.now()}@demo.local`, cpf: '529.982.247-25' },
  })
  assert.equal(cpf.status, 409)
  assert.ok(cpf.data.campos.cpf)
  console.log('5. CPF repetido com pontuação: HTTP 409, campo cpf.')

  for (const path of [
    '/relatorios/categorias',
    '/relatorios/fontes-destinos',
    '/relatorios/faturas',
    '/saude-financeira',
  ]) {
    const result = await request(path, { token: ana })
    assert.equal(result.status, 200)
    assert.equal(JSON.stringify(result.data).includes('senha_hash'), false)
  }
  console.log('6. Relatórios, faturas e saúde financeira: HTTP 200.')
  console.log('Demonstração concluída. Nenhum cadastro ou lançamento foi criado por este roteiro.')
}

main().catch((error) => {
  console.error(`Falha na demonstração: ${error.message}`)
  process.exitCode = 1
})
