import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'

const path = new URL('../backend/.env', import.meta.url)
if (!existsSync(path)) {
  const template = readFileSync(new URL('../backend/.env.example', import.meta.url), 'utf8')
  writeFileSync(
    path,
    template.replace(
      'substitua-por-um-segredo-aleatorio-de-pelo-menos-32-caracteres',
      randomBytes(48).toString('hex'),
    ),
  )
  console.log(
    'backend/.env criado com JWT_SECRET aleatório. Preencha DATABASE_URL com a conexão do Supabase.',
  )
} else console.log('backend/.env já existe e foi preservado.')
console.log('Após configurar o banco: npm run db:migrate, npm run db:seed e npm run dev.')
