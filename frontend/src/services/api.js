const STORAGE_KEY = 'moneyfinder:session'
const BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')
export function readSession() {
  try {
    const value = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null')
    return value && typeof value.token === 'string' && value.usuario?.id ? value : null
  } catch {
    return null
  }
}
let session = readSession()
let unauthorized = () => {}
export function setUnauthorizedHandler(handler) {
  unauthorized = handler
}
export function saveSession(value) {
  session = value
  try {
    if (value) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    else sessionStorage.removeItem(STORAGE_KEY)
    return true
  } catch {
    return false
  }
}
export async function api(path, { method = 'GET', body, signal } = {}) {
  const token = session?.token
  let response
  try {
    response = await fetch(`${BASE}${path}`, {
      method,
      signal,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new Error(
      'Não foi possível conectar à API. Confira sua conexão e se o servidor está em execução.',
    )
  }
  if (response.status === 204) return null
  const data = await response
    .json()
    .catch(() => ({ erro: 'O servidor enviou uma resposta inesperada.' }))
  if (!response.ok) {
    if (response.status === 401 && token && token === session?.token) {
      saveSession(null)
      unauthorized()
    }
    const error = new Error(data.erro || 'Não foi possível concluir a operação.')
    error.fields = data.campos || {}
    error.status = response.status
    throw error
  }
  return data
}
export function params(values) {
  return new URLSearchParams(
    Object.entries(values).filter(
      ([, value]) => value !== '' && value !== undefined && value !== null,
    ),
  ).toString()
}
