<script setup>
defineProps({
  labels: {
    type: Object,
    default: () => ({}),
  },
})
</script>

<template>
  <template v-if="labels">
    <!-- Local branch badges -->
    <span v-for="lb in labels.local" :key="'l-' + lb" class="badge badge-branch">
      <svg class="badge-icon" viewBox="0 0 16 16" width="10" height="10">
        <path d="M5.5 3.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4z" fill="currentColor"/>
        <path d="M4 7.5V12h1.5v-4.5" fill="none" stroke="currentColor" stroke-width="1.2"/>
        <path d="M11 7a2 2 0 1 1 0 4 2 2 0 0 1 0-4z" fill="currentColor"/>
        <path d="M12.5 9H7" fill="none" stroke="currentColor" stroke-width="1.2"/>
      </svg>
      {{ lb }}
    </span>
    <!-- Remote branch badges -->
    <span v-for="rb in labels.remote" :key="'r-' + rb" class="badge badge-remote">
      <svg class="badge-icon" viewBox="0 0 16 16" width="10" height="10">
        <circle cx="8" cy="3" r="2.5" fill="none" stroke="currentColor" stroke-width="1.2"/>
        <circle cx="4" cy="12" r="2.5" fill="none" stroke="currentColor" stroke-width="1.2"/>
        <circle cx="12" cy="12" r="2.5" fill="none" stroke="currentColor" stroke-width="1.2"/>
        <line x1="8" y1="5.5" x2="4" y2="9.5" stroke="currentColor" stroke-width="1"/>
        <line x1="8" y1="5.5" x2="12" y2="9.5" stroke="currentColor" stroke-width="1"/>
      </svg>
      {{ rb.replace('origin/', '') }}
    </span>
    <!-- Tags -->
    <span v-for="t in labels.tags" :key="'t-' + t" class="badge badge-tag">
      <svg class="badge-icon" viewBox="0 0 16 16" width="10" height="10">
        <path d="M2 2h5l7 7-5 5-7-7V2z" fill="none" stroke="currentColor" stroke-width="1.2"/>
      </svg>
      {{ t }}
    </span>
    <!-- Stash badge -->
    <span v-for="s in labels.stash" :key="'s-' + s" class="badge badge-stash">
      <svg class="badge-icon" viewBox="0 0 16 16" width="10" height="10">
        <rect x="3" y="2" width="10" height="12" rx="1" fill="none" stroke="currentColor" stroke-width="1.2"/>
        <line x1="6" y1="7" x2="10" y2="7" stroke="currentColor" stroke-width="1.2"/>
        <line x1="8" y1="5" x2="8" y2="9" stroke="currentColor" stroke-width="1.2"/>
      </svg>
      {{ s }}
    </span>
  </template>
</template>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 0 5px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 600;
  margin-right: 4px;
  white-space: nowrap;
}

.badge-icon {
  flex-shrink: 0;
}

.badge-branch {
  background-color: #fff;
  border: 1px solid #4a90e2;
  color: #333;
}

.badge-remote {
  background-color: #f0f6ff;
  border: 1px solid #7a9ec7;
  color: #4a6a8a;
  font-style: italic;
  font-weight: 700;
}

.badge-tag {
  background-color: #fff2cc;
  border: 1px solid #d6b656;
  color: #333;
}

.badge-stash {
  background-color: #fce4ec;
  border: 1px solid #e91e63;
  color: #880e4f;
  font-weight: 700;
}
</style>
