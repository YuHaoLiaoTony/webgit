<script setup>
import { computed } from 'vue'

const props = defineProps({
  order: {
    type: String,
    default: 'date',
    validator: (v) => ['date', 'topo'].includes(v),
  },
  firstParent: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:order', 'update:firstParent'])

const orderProxy = computed({
  get: () => props.order,
  set: (val) => emit('update:order', val),
})

const firstParentProxy = computed({
  get: () => props.firstParent,
  set: (val) => emit('update:firstParent', val),
})
</script>

<template>
  <div class="filter-toolbar">
    <div class="filter-group">
      <span class="filter-label">Order:</span>
      <button
        class="filter-btn"
        :class="{ active: orderProxy === 'date' }"
        @click="orderProxy = 'date'"
      >
        Date
      </button>
      <button
        class="filter-btn"
        :class="{ active: orderProxy === 'topo' }"
        @click="orderProxy = 'topo'"
      >
        Topo
      </button>
    </div>
    <label class="filter-checkbox">
      <input type="checkbox" v-model="firstParentProxy" />
      <span>First Parent</span>
    </label>
  </div>
</template>

<style scoped>
.filter-toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 6px 12px;
  background: #f6f8fa;
  border-bottom: 1px solid #e0e0e0;
  flex-shrink: 0;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 4px;
}

.filter-label {
  font-size: 11px;
  color: #888;
  margin-right: 2px;
}

.filter-btn {
  padding: 3px 10px;
  font-size: 11px;
  border: 1px solid #d0d0d0;
  background: #fff;
  color: #555;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
}

.filter-btn:hover {
  background: #f0f0f0;
}

.filter-btn.active {
  background: #4a90e2;
  color: #fff;
  border-color: #4a90e2;
}

.filter-checkbox {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #666;
  cursor: pointer;
}

.filter-checkbox input {
  margin: 0;
}
</style>
