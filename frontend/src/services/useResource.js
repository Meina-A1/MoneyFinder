import { useEffect, useState } from 'react'
import { api } from './api.js'

export function useResource(path, version = 0) {
  const [state, setState] = useState({ data: null, loading: true, error: '' })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      setState({ data: null, loading: true, error: '' })
      try {
        const data = await api(path, { signal: controller.signal })
        if (!controller.signal.aborted) setState({ data, loading: false, error: '' })
      } catch (error) {
        if (!controller.signal.aborted)
          setState({ data: null, loading: false, error: error.message })
      }
    }
    load()
    return () => controller.abort()
  }, [path, version, attempt])
  return { ...state, retry: () => setAttempt((a) => a + 1) }
}
