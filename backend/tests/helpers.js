import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'

function connection(engine) {
  return {
    query: async (sql, params = []) => {
      const result =
        !params.length && sql.includes(';')
          ? (await engine.exec(sql)).at(-1)
          : await engine.query(sql, params)
      for (const field of result.fields || []) {
        if ([20, 1700].includes(field.dataTypeID))
          for (const row of result.rows)
            if (row[field.name] !== null) row[field.name] = Number(row[field.name])
      }
      return result
    },
  }
}
export async function testDatabase() {
  const engine = new PGlite()
  await engine.exec(readFileSync(new URL('../database/schema.sql', import.meta.url), 'utf8'))
  return {
    ...connection(engine),
    transaction: (operation) => engine.transaction((tx) => operation(connection(tx))),
    close: () => engine.close(),
  }
}
