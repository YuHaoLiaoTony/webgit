/**
 * API composable — fetches from the actual backend with CSRF protection.
 * Provides { get, post, del } interface used by stores and components.
 * Automatically appends repoId from the repos store when available.
 */

import { useReposStore } from '../stores/repos.js'

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
  // Get active repo ID from the repos store at call time
  let repoId = null
  try {
    const reposStore = useReposStore()
    repoId = reposStore.activeRepoId
  } catch (_) {
    // Store might not be initialized yet (e.g., during startup)
  }

  return {
    async get(url) {
      const effectiveUrl = repoId
        ? `${url}${url.includes('?') ? '&' : '?'}repoId=${repoId}`
        : url
      const response = await fetch(`/api${effectiveUrl}`)
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || `API error: ${response.status}`)
      }
      return await response.json()
    },

    async post(url, body) {
      const effectiveBody = repoId ? { ...body, repoId } : body
      const token = await ensureCsrfToken()
      const response = await fetch(`/api${url}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': token,
        },
        body: JSON.stringify(effectiveBody),
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || `API error: ${response.status}`)
      }
      return await response.json()
    },

    async del(url) {
      // DELETE requests don't need CSRF (repo management endpoints)
      const effectiveUrl = repoId
        ? `${url}${url.includes('?') ? '&' : '?'}repoId=${repoId}`
        : url
      const response = await fetch(`/api${effectiveUrl}`, { method: 'DELETE' })
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || `API error: ${response.status}`)
      }
      return await response.json()
    },
  }
}
