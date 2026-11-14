import pg from 'pg'
import { readFileSync } from 'node:fs'

pg.types.setTypeParser(20, Number)
pg.types.setTypeParser(1700, Number)
pg.types.setTypeParser(1082, (value) => value)

export function openDatabase(config) {
  if (!config.databaseUrl || config.databaseUrl.includes('PROJECT_REF'))
    throw new Error('Configure DATABASE_URL em backend/.env com a conexão PostgreSQL do Supabase.')
  const connection = new URL(config.databaseUrl)
  // A URL não pode substituir a configuração explícita de validação TLS.
  for (const key of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert'])
    connection.searchParams.delete(key)
  const pool = new pg.Pool({
    connectionString: connection.toString(),
    ssl: config.databaseSsl
      ? {
          rejectUnauthorized: true,
          ...(config.databaseCaPath ? { ca: readFileSync(config.databaseCaPath, 'utf8') } : {}),
        }
      : false,
    max: 5,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
  })
  pool.on('error', () => console.error('Uma conexão ociosa com o banco foi encerrada.'))
  return {
    query: (sql, values = []) => pool.query(sql, values),
    transaction: async (operation) => {
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        const result = await operation(client)
        await client.query('COMMIT')
        return result
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      } finally {
        client.release()
      }
    },
    close: () => pool.end(),
  }
}

export async function migrate(db) {
  const sql = readFileSync(new URL('../../database/schema.sql', import.meta.url), 'utf8')
  await db.transaction((client) => client.query(sql))
}
