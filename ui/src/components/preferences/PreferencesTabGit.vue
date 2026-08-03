<script setup>
/**
 * Preferences Git Tab — Git 身份與預設分支設定。
 * 自給自足：自行使用 useApi() 與 useReposStore()，不依賴父層 props。
 */
import { ref, onMounted } from 'vue'
import { useApi } from '../../composables/useApi.js'
import { useReposStore } from '../../stores/repos.js'
import { showToast } from '../../composables/useToast.js'

const api = useApi()
const reposStore = useReposStore()

const gitConfig = ref({ userName: '', userEmail: '', defaultBranch: '' })
const gitLoading = ref(false)
const gitSaving = ref(false)

function activeRepoName() {
  return reposStore.displayName(reposStore.activeRepo) || '—'
}

async function loadGit() {
  gitLoading.value = true
  try {
    const config = await api.get('/config')
    gitConfig.value = {
      userName: config.userName || '',
      userEmail: config.userEmail || '',
      defaultBranch: config.defaultBranch || '',
    }
  } catch (e) {
    showToast('error', `Failed to load git config: ${e.message}`, 5000)
  } finally {
    gitLoading.value = false
  }
}

async function saveGit() {
  gitSaving.value = true
  try {
    const entries = [
      { key: 'user.name', value: gitConfig.value.userName.trim() },
      { key: 'user.email', value: gitConfig.value.userEmail.trim() },
      { key: 'init.defaultbranch', value: gitConfig.value.defaultBranch.trim() },
    ]
    for (const entry of entries) {
      await api.post('/config', entry)
    }
    showToast('success', 'Git config saved')
  } catch (e) {
    showToast('error', `Failed to save git config: ${e.message}`, 5000)
  } finally {
    gitSaving.value = false
  }
}

onMounted(() => {
  loadGit()
})
</script>

<template>
  <div class="pref-section">
    <div class="pref-section-title">Git Identity</div>

    <div class="pref-field">
      <label class="pref-label">User Name</label>
      <input v-model="gitConfig.userName" type="text" class="pref-input" placeholder="user.name" />
    </div>

    <div class="pref-field">
      <label class="pref-label">User Email</label>
      <input v-model="gitConfig.userEmail" type="text" class="pref-input" placeholder="user.email" />
    </div>

    <div class="pref-field">
      <label class="pref-label">Default Branch</label>
      <input v-model="gitConfig.defaultBranch" type="text" class="pref-input" placeholder="init.defaultbranch" />
    </div>

    <div v-if="gitLoading" class="pref-loading">Loading…</div>
    <div class="pref-hint">套用於目前 repo：<b>{{ activeRepoName() }}</b></div>
    <div class="pref-section-actions">
      <button class="pref-btn pref-btn-primary" :disabled="gitLoading || gitSaving" @click="saveGit">
        {{ gitSaving ? 'Saving…' : 'Save' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
@import '../../styles/preferences-common.css';
</style>
