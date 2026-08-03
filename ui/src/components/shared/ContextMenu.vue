<script setup>
import { onMounted, onUnmounted } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  x: { type: Number, default: 0 },
  y: { type: Number, default: 0 },
  items: { type: Array, default: () => [] },
  // items: Array<{ label: string, icon?: string, shortcut?: string, action: Function }>
})

const emit = defineEmits(['close'])

function onItemClick(item) {
  item.action?.()
  emit('close')
}

function onDocumentClick(e) {
  if (!props.visible) return
  // Close if click is outside the menu
  const menu = document.querySelector('.cv-context-menu')
  if (menu && !menu.contains(e.target)) {
    emit('close')
  }
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick, true)
})

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick, true)
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="cv-context-menu"
      :style="{ left: x + 'px', top: y + 'px' }"
    >
      <div
        v-for="(item, idx) in items"
        :key="idx"
        class="cv-ctx-menu-item"
        @click="onItemClick(item)"
      >
        <span v-if="item.icon" class="cv-ctx-menu-icon">{{ item.icon }}</span>
        <span class="cv-ctx-menu-label">{{ item.label }}</span>
        <span v-if="item.shortcut" class="cv-ctx-menu-shortcut">{{ item.shortcut }}</span>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.cv-context-menu {
  position: fixed;
  z-index: 99999;
  background: #fff;
  border: 1px solid #d0d0d0;
  border-radius: 8px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.18);
  padding: 6px 0;
  min-width: 200px;
  font-size: 12px;
}

.cv-ctx-menu-item {
  padding: 7px 14px;
  color: #333;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  transition: background-color 0.1s;
}

.cv-ctx-menu-item:hover {
  background-color: #f0f6fc;
}

.cv-ctx-menu-icon {
  font-size: 14px;
  width: 18px;
  text-align: center;
}

.cv-ctx-menu-label {
  flex: 1;
  font-size: 12px;
  line-height: 1.3;
}

.cv-ctx-menu-shortcut {
  font-size: 10px;
  color: #999;
  margin-left: 12px;
}
</style>
