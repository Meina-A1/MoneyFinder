import { test } from 'node:test'
import assert from 'node:assert/strict'
import { migrate } from '../src/config/database.js'
import { testDatabase } from './helpers.js'

test('DDL pode ser reaplicado pelo proprietário do schema sem CREATE no banco e preserva os dados', async () => {
  const db = await testDatabase()
  try {
    await db.query(
      "INSERT INTO financas.usuarios(nome,email,cpf,senha_hash) VALUES ('Ensaio','ensaio@teste.local','12345678909','hash-de-teste')",
    )
    for (const statement of `
      CREATE ROLE migration_test NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;
      ALTER SCHEMA financas OWNER TO migration_test;
      ALTER TABLE financas.usuarios OWNER TO migration_test;
      ALTER TABLE financas.categorias OWNER TO migration_test;
      ALTER TABLE financas.fontes_destinos OWNER TO migration_test;
      ALTER TABLE financas.lancamentos OWNER TO migration_test;
      SET ROLE migration_test;
    `
      .split(';')
      .map((sql) => sql.trim())
      .filter(Boolean))
      await db.query(statement)
    const permission = await db.query(
      "SELECT has_database_privilege(current_user,current_database(),'CREATE') AS permitido",
    )
    assert.equal(permission.rows[0].permitido, false)
    await migrate(db)
    const users = await db.query('SELECT email FROM financas.usuarios')
    assert.deepEqual(users.rows, [{ email: 'ensaio@teste.local' }])
    await assert.rejects(
      () => db.query('CREATE SCHEMA fora_do_projeto'),
      (error) => error.code === '42501',
    )
  } finally {
    await db.query('RESET ROLE')
    await db.close()
  }
})
