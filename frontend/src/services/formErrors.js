export function serverErrors(error, setError, setMessage) {
  Object.entries(error.fields || {}).forEach(([key, value]) =>
    setError(key, { type: 'server', message: value }),
  )
  setMessage(error.message)
}
