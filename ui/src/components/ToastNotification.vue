<script setup>
import { useToast, dismissToast } from '../composables/useToast.js'

const { toasts } = useToast()

function onDismiss(id) {
  dismissToast(id)
}
</script>

<template>
  <Teleport to="body">
    <div class="toast-container">
      <transition-group name="toast-slide">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          :class="['toast-item', `toast-${toast.type}`]"
        >
          <span class="toast-icon">
            <template v-if="toast.type === 'success'">✓</template>
            <template v-else-if="toast.type === 'error'">✕</template>
            <template v-else>ℹ</template>
          </span>
          <span class="toast-message">{{ toast.message }}</span>
          <button class="toast-close" @click="onDismiss(toast.id)">×</button>
        </div>
      </transition-group>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-container {
  position: fixed;
  top: 12px;
  right: 12px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 6px;
  pointer-events: none;
}

.toast-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  color: #fff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  pointer-events: auto;
  min-width: 200px;
  max-width: 380px;
  backdrop-filter: blur(8px);
}

.toast-success {
  background-color: #28a745;
}

.toast-error {
  background-color: #cb2431;
}

.toast-info {
  background-color: #007acc;
}

.toast-warning {
  background-color: #f5a623;
}

.toast-icon {
  font-size: 14px;
  font-weight: bold;
  flex-shrink: 0;
}

.toast-message {
  flex: 1;
  font-size: 12px;
  line-height: 1.4;
  white-space: pre-line;
}

.toast-close {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.8);
  font-size: 16px;
  cursor: pointer;
  padding: 0 2px;
  line-height: 1;
  flex-shrink: 0;
}

.toast-close:hover {
  color: #fff;
}

/* Transitions */
.toast-slide-enter-active {
  transition: all 0.3s ease-out;
}

.toast-slide-leave-active {
  transition: all 0.25s ease-in;
}

.toast-slide-enter-from {
  opacity: 0;
  transform: translateX(40px);
}

.toast-slide-leave-to {
  opacity: 0;
  transform: translateX(40px);
}
</style>
