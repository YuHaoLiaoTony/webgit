/**
 * useLongPress — 長按偵測 composable（US-19 手機操作）。
 *
 * - 預設 ~500ms 觸發
 * - 按住後移動超過位移閾值（moveThreshold）→ 視為捲動/拖曳，取消長按
 * - 觸發後會抑制瀏覽器合成的 click（避免誤觸其它 click handler），
 *   並提供 consumeTriggered() 作為雙保險（供 click handler 消費旗標）
 *
 * 使用方式（Vue template）：
 *   const lp = useLongPress(openMenu)
 *   <div @touchstart.passive="lp.onStart" @touchmove.passive="lp.onMove"
 *        @touchend="lp.onEnd" @touchcancel="lp.onEnd">…</div>
 */
import { ref } from 'vue'

export function useLongPress(callback, { duration = 500, moveThreshold = 10 } = {}) {
  let timer = null
  let startX = 0
  let startY = 0
  const triggered = ref(false)

  function clearTimer() {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  function onStart(e) {
    const point = (e.touches && e.touches[0]) || e
    startX = point.clientX
    startY = point.clientY
    triggered.value = false
    clearTimer()

    timer = setTimeout(() => {
      timer = null
      triggered.value = true
      callback(e)
    }, duration)
  }

  function onMove(e) {
    if (!timer) return
    const point = (e.touches && e.touches[0]) || e
    const moved = Math.hypot(point.clientX - startX, point.clientY - startY)
    if (moved > moveThreshold) {
      // 位移超過閾值 → 使用者在捲動/拖曳，取消長按
      clearTimer()
    }
  }

  function onEnd(e) {
    clearTimer()
    if (triggered.value) {
      // 抑制長按後瀏覽器合成的 click（touchend 非 passive，可 preventDefault）
      try {
        e.preventDefault()
      } catch (_) {
        // 某些環境的合成事件無法 preventDefault，忽略
      }
    }
  }

  /**
   * 消費「長按已觸發」旗標。
   * 回傳 true 表示這次 click 是長按後的合成事件，呼叫端應忽略該 click。
   */
  function consumeTriggered() {
    if (triggered.value) {
      triggered.value = false
      return true
    }
    return false
  }

  return {
    onStart,
    onMove,
    onEnd,
    onCancel: onEnd,
    consumeTriggered,
  }
}
