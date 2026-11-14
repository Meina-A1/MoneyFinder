import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = new URL('../', import.meta.url)
const backend = spawn(process.execPath, ['--watch', 'src/server.js'], {
  cwd: fileURLToPath(new URL('backend/', root)),
  stdio: 'inherit',
})
const frontend = spawn(
  process.execPath,
  [fileURLToPath(new URL('node_modules/vite/bin/vite.js', root)), '--host', '127.0.0.1'],
  { cwd: fileURLToPath(new URL('frontend/', root)), stdio: 'inherit' },
)
function close() {
  backend.kill()
  frontend.kill()
}
process.on('SIGINT', close)
process.on('SIGTERM', close)
for (const child of [backend, frontend])
  child.on('exit', (code) => {
    if (code) {
      close()
      process.exitCode = code
    }
  })
