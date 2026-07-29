/**
 * API composable — fetches from the actual backend with CSRF protection.
 * Provides { get, post } interface used by stores and components.
 */

let csrfToken = null
let csrfPromise = null

async function ensureCsrfToken() {
  if (csrfToken) return csrfToken
  if (csrfPromise) return csrfPromise
  csrfPromise = (async () => {
    try {
      const res = await fetch('/api/csrf-token')
      if (!res.ok) throw new Error('Failed to fetch CSRF token')
      const data = await res.json()
      csrfToken = data.token
      return csrfToken
    } catch (e) {
      csrfPromise = null
      throw e
    }
  })()
  return csrfPromise
}

export function useApi() {
  return {
    async get(url) {
      const response = await fetch(`/api${url}`)
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || `API error: ${response.status}`)
      }
      return await response.json()
    },
    async post(url, body) {
      const token = await ensureCsrfToken()
      const response = await fetch(`/api${url}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': token,
        },
        body: JSON.stringify(body),
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || `API error: ${response.status}`)
      }
      return await response.json()
    },
  }
}
