import { configuration } from '../src/config/env.js'
import { migrate, openDatabase } from '../src/config/database.js'

const config = configuration()
const db = openDatabase({ ...config, databaseUrl: config.databaseAdminUrl || config.databaseUrl })
try {
  await migrate(db)
  console.log('Schema financas criado/atualizado.')
} finally {
  await db.close()
}
