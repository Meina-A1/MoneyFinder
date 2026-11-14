import dotenv from 'dotenv'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

export const backendRoot = fileURLToPath(new URL('../../', import.meta.url))
dotenv.config({ path: resolve(backendRoot, '.env'), quiet: true })

export function configuration() {
  const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret || jwtSecret.length < 32 || jwtSecret.startsWith('substitua-')) {
    throw new Error(
      'Configure JWT_SECRET com pelo menos 32 caracteres em backend/.env. Execute npm run setup.',
    )
  }
  return {
    jwtSecret,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
    port: Number(process.env.PORT || 3001),
    host: process.env.HOST || '127.0.0.1',
    origin: process.env.FRONTEND_ORIGIN || 'http://127.0.0.1:5173',
    databaseUrl: process.env.DATABASE_URL,
    databaseAdminUrl: process.env.DATABASE_ADMIN_URL,
    databaseSsl: process.env.DATABASE_SSL !== 'false',
    databaseCaPath: process.env.DATABASE_CA_PATH
      ? resolve(backendRoot, process.env.DATABASE_CA_PATH)
      : undefined,
  }
}
