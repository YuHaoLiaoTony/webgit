import { ref, onMounted, onUnmounted } from 'vue'

/**
 * Generic drag-to-resize composable.
 *
 * Replaces three duplicated drag-resize blocks (staged vertical, commit panel vertical,
 * files/diff horizontal) with a single reusable composable.
 *
 * Internal lifecycle: binds document mousemove / mouseup in onMounted and cleans up
 * in onUnmounted — the caller does NOT need to proxy events through a global handler.
 *
 * @param {Object}   options
 * @param {'horizontal'|'vertical'}  options.direction   resize axis
 * @param {import('vue').Ref<HTMLElement|null>} options.targetRef   the panel whose size changes
 * @param {import('vue').Ref<HTMLElement|null>} options.handleRef   the drag handle (receives .dragging class)
 * @param {number}    options.minSize    minimum size in px
 * @param {number}    [options.maxSize]  optional maximum size in px
 * @returns {{ isDragging: import('vue').Ref<boolean>, onMouseDown: (e: MouseEvent) => void }}
 */
export function useDragResize({ direction, targetRef, handleRef, minSize, maxSize }) {
  const isDragging = ref(false)

  let startCoord = 0
  let startSize = 0

  function onMouseDown(e) {
    isDragging.value = true
    startCoord = direction === 'horizontal' ? e.clientX : e.clientY

    if (targetRef.value) {
      startSize = direction === 'horizontal'
        ? targetRef.value.offsetWidth
        : targetRef.value.offsetHeight
    }

    if (handleRef.value) {
      handleRef.value.classList.add('dragging')
    }

    document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize'
    document.body.style.userSelect = 'none'
    e.preventDefault()
  }

  function onMouseMove(e) {
    if (!isDragging.value || !targetRef.value) return

    const currentCoord = direction === 'horizontal' ? e.clientX : e.clientY
    // vertical: drag up → startCoord - currentCoord positive → panel grows
    // horizontal: drag right → currentCoord - startCoord positive → panel grows
    const delta = direction === 'horizontal'
      ? (currentCoord - startCoord)
      : (startCoord - currentCoord)

    const newSize = startSize + delta

    if (newSize >= minSize && (!maxSize || newSize <= maxSize)) {
      targetRef.value.style.flex = 'none'
      if (direction === 'horizontal') {
        targetRef.value.style.width = newSize + 'px'
      } else {
        targetRef.value.style.height = newSize + 'px'
      }
    }
  }

  function onMouseUp() {
    if (!isDragging.value) return
    isDragging.value = false

    if (handleRef.value) {
      handleRef.value.classList.remove('dragging')
    }

    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }

  // ── lifecycle: self-contained document event binding ───────────────
  onMounted(() => {
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  })

  onUnmounted(() => {
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  })

  return { isDragging, onMouseDown }
}
