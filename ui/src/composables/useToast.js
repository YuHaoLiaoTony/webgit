import { ref } from 'vue'

// ─── Module-level reactive state ───────────────────────────────────────
const toasts = ref([])
let nextId = 1

/**
 * Show a toast notification.
 * @param {'success'|'error'|'info'} type
 * @param {string} message
 * @param {number} [duration=3000] auto-dismiss in ms
 */
export function showToast(type, message, duration = 3000) {
  const id = nextId++
  toasts.value.push({ id, type, message })

  if (duration > 0) {
    setTimeout(() => {
      dismissToast(id)
    }, duration)
  }

  return id
}

export function dismissToast(id) {
  const idx = toasts.value.findIndex(t => t.id === id)
  if (idx !== -1) {
    toasts.value.splice(idx, 1)
  }
}

export function useToast() {
  return {
    toasts,
    showToast,
    dismissToast,
  }
}
