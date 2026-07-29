<script setup>
defineProps({
  icon: { type: String, default: '📭' },
  title: { type: String, default: 'Nothing here yet' },
  message: { type: String, default: '' },
  actionLabel: { type: String, default: '' },
})

const emit = defineEmits(['action'])
</script>

<template>
  <div class="empty-state">
    <div class="empty-icon">{{ icon }}</div>
    <div class="empty-title">{{ title }}</div>
    <div v-if="message" class="empty-message">{{ message }}</div>
    <button
      v-if="actionLabel"
      class="empty-action"
      @click="emit('action')"
    >
      {{ actionLabel }}
    </button>
  </div>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 40px 20px;
  color: #aaa;
  user-select: none;
  text-align: center;
}

.empty-icon {
  font-size: 36px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.empty-title {
  font-size: 14px;
  font-weight: 600;
  color: #888;
  margin-bottom: 6px;
}

.empty-message {
  font-size: 12px;
  color: #aaa;
  line-height: 1.5;
  max-width: 280px;
}

.empty-action {
  margin-top: 16px;
  padding: 6px 16px;
  font-size: 11px;
  font-weight: 500;
  color: #fff;
  background-color: #007acc;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.15s;
}

.empty-action:hover {
  background-color: #005fa3;
}
</style>
