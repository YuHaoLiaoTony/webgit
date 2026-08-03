/**
 * API composable — fetches from the actual backend with CSRF protection.
 * Provides { get, post, del } interface used by stores and components.
 * Automatically appends repoId from the repos store when available.
 *
 * 注意：repoId 在「每次請求」時才讀取，而非在 useApi() 呼叫當下擷取。
 * 元件 setup 時 activeRepoId 可能尚未從伺服器載入（fetchRepos 非同步），
 * 若在 setup 時就固定 repoId，dialog 等長壽命元件會永遠打到 default repo。
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

/** 讀取目前 active repo id（每次請求時） */
function currentRepoId() {
  try {
    const reposStore = useReposStore()
    return reposStore.activeRepoId
  } catch (_) {
    // Store might not be initialized yet (e.g., during startup)
    return null
  }
}

export function useApi() {
  return {
    async get(url) {
      const repoId = currentRepoId()
      const effectiveUrl = repoId
        ? `${url}${url.includes('?') ? '&' : '?'}repoId=${encodeURIComponent(repoId)}`
        : url
      const response = await fetch(`/api${effectiveUrl}`)
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || `API error: ${response.status}`)
      }
      // 防禦：若回應不是 JSON（例如 server 未更新，API 路由被 SPA fallback 回傳 HTML），
      // 丟出乾淨錯誤而非 JSON parse SyntaxError
      const contentType = response.headers.get('content-type') || ''
      if (!contentType.includes('application/json')) {
        throw new Error('API error: server 回傳了非 JSON 回應（server 可能尚未更新）')
      }
      return await response.json()
    },

    async post(url, body) {
      const repoId = currentRepoId()
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
      const repoId = currentRepoId()
      const effectiveUrl = repoId
        ? `${url}${url.includes('?') ? '&' : '?'}repoId=${encodeURIComponent(repoId)}`
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
