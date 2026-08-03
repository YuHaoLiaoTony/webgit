<script setup>
/**
 * Preferences 偏好設定對話框。
 * 頂部頁籤切換：General / AI / Git。
 * 各頁籤內容由子元件處理，此處只負責頁籤切換與外殼佈局。
 */
import { ref } from 'vue'
import PreferencesTabGeneral from './preferences/PreferencesTabGeneral.vue'
import PreferencesTabAi from './preferences/PreferencesTabAi.vue'
import PreferencesTabGit from './preferences/PreferencesTabGit.vue'

const props = defineProps({
  show: { type: Boolean, default: false }
})

const emit = defineEmits(['close'])

// ─── Tabs ─────────────────────────────────────────────────────────────
const tabs = [
  { id: 'general', label: 'General', icon: '⚙' },
  { id: 'ai', label: 'AI', icon: '🤖' },
  { id: 'git', label: 'Git', icon: '🔧' },
]
const activeTab = ref('general')

function switchTab(id) {
  activeTab.value = id
}

function handleClose() {
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="pref-overlay" @click.self="handleClose">
      <div class="pref-dialog">
        <!-- Header -->
        <div class="pref-header">
          <div class="pref-title">⚙ Preferences</div>
          <button class="pref-close-btn" @click="handleClose">×</button>
        </div>

        <!-- Top tabs -->
        <div class="pref-tabs">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            class="pref-tab"
            :class="{ 'pref-tab-active': activeTab === tab.id }"
            @click="switchTab(tab.id)"
          >
            <span class="pref-tab-icon">{{ tab.icon }}</span>
            {{ tab.label }}
          </button>
        </div>

        <!-- Body -->
        <div class="pref-body">
          <!-- ── General ─────────────────────────────────────────── -->
          <div v-if="activeTab === 'general'" class="pref-section">
            <PreferencesTabGeneral />
          </div>

          <!-- ── AI ──────────────────────────────────────────────── -->
          <div v-else-if="activeTab === 'ai'" class="pref-section">
            <PreferencesTabAi />
          </div>

          <!-- ── Git ─────────────────────────────────────────────── -->
          <div v-else-if="activeTab === 'git'" class="pref-section">
            <PreferencesTabGit />
          </div>
        </div>

        <!-- Footer -->
        <div class="pref-footer">
          <button class="pref-btn pref-btn-secondary" @click="handleClose">Close</button>
        </div>
      </div>

    </div>
  </Teleport>
</template>

<style scoped>
@import '../styles/preferences-common.css';

.pref-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.pref-dialog {
  background: var(--pref-bg);
  color: var(--pref-text);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
  width: 600px;
  max-width: 92vw;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ── Header ─────────────────────────────────────────────────────────── */
.pref-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px 10px;
}

.pref-title {
  font-size: 15px;
  font-weight: 700;
}

.pref-close-btn {
  background: none;
  border: none;
  font-size: 20px;
  color: var(--pref-text-dim);
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
}

.pref-close-btn:hover {
  color: var(--pref-text);
}

/* ── Top tabs ───────────────────────────────────────────────────────── */
.pref-tabs {
  display: flex;
  gap: 2px;
  padding: 0 18px;
  border-bottom: 1px solid var(--pref-border);
}

.pref-tab {
  background: none;
  border: none;
  padding: 8px 14px;
  font-size: 12px;
  font-weight: 600;
  color: var(--pref-text-dim);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: inherit;
}

.pref-tab:hover {
  color: var(--pref-text);
}

.pref-tab-active {
  color: var(--pref-accent);
  border-bottom-color: var(--pref-accent);
  background: var(--pref-tab-active-bg);
}

.pref-tab-icon {
  font-size: 13px;
}

/* ── Body ───────────────────────────────────────────────────────────── */
.pref-body {
  padding: 16px 18px;
  overflow-y: auto;
  max-height: 55vh;
  display: flex;
  flex-direction: column;
  gap: 12px;
}


</style>
