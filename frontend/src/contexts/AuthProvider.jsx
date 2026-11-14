import { useCallback, useEffect, useState } from 'react'
import { AuthContext } from './AuthContext.js'
import { api, readSession, saveSession, setUnauthorizedHandler } from '../services/api.js'

export default function AuthProvider({ children }) {
  const [session, setSession] = useState(readSession)
  const [initializing, setInitializing] = useState(() => Boolean(readSession()?.token))
  const [notice, setNotice] = useState('')
  const logout = useCallback(() => {
    saveSession(null)
    setSession(null)
  }, [])
  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout()
      setNotice('Sua sessão expirou. Entre novamente.')
    })
    return () => setUnauthorizedHandler(() => {})
  }, [logout])
  useEffect(() => {
    const saved = readSession()
    if (!saved?.token) return
    let active = true
    api('/auth/me')
      .then((usuario) => {
        if (active) {
          const next = { token: saved.token, usuario }
          saveSession(next)
          setSession(next)
        }
      })
      .catch((error) => {
        if (active) {
          logout()
          setNotice(error.message)
        }
      })
      .finally(() => {
        if (active) setInitializing(false)
      })
    return () => {
      active = false
    }
  }, [logout])
  useEffect(() => {
    if (!session?.token) return
    try {
      const payload = JSON.parse(
        atob(session.token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')),
      )
      const timer = setTimeout(
        () => {
          logout()
          setNotice('Sua sessão expirou. Entre novamente.')
        },
        Math.max(0, payload.exp * 1000 - Date.now()),
      )
      return () => clearTimeout(timer)
    } catch {
      const timer = setTimeout(logout, 0)
      return () => clearTimeout(timer)
    }
  }, [session?.token, logout])
  async function authenticate(path, data) {
    const result = await api(path, { method: 'POST', body: data })
    const stored = saveSession(result)
    setSession(result)
    setNotice(
      stored
        ? ''
        : 'O navegador bloqueou o armazenamento. Sua sessão terminará ao recarregar a página.',
    )
  }
  return (
    <AuthContext.Provider
      value={{
        usuario: session?.usuario,
        token: session?.token,
        initializing,
        notice,
        logout,
        login: (data) => authenticate('/auth/login', data),
        cadastrar: (data) => authenticate('/auth/cadastro', data),
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
