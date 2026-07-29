<script setup>
import { ref, watch, onMounted } from 'vue'
import { useApi } from '../composables/useApi.js'
import { useUiStore } from '../stores/ui.js'

const uiStore = useUiStore()

// ─── State ─────────────────────────────────────────────────────
const commits = ref([])
const selectedCommitId = ref(null)
const selectedCommit = ref(null)
const loading = ref(true)
const error = ref(null)

// ─── Fetch real commits from API ───────────────────────────────
async function fetchCommits() {
  loading.value = true
  error.value = null
  selectedCommit.value = null
  selectedCommitId.value = null

  try {
    const { get } = useApi()
    const data = await get('/commits?limit=50')
    commits.value = data.map(c => ({
      id: c.hash,
      hash: c.shortHash || c.hash.substring(0, 7),
      fullHash: c.hash,
      subject: c.message,
      author: {
        initials: (c.author || '?').charAt(0).toUpperCase(),
        name: c.author || 'Unknown',
        email: c.email || '',
      },
      date: c.date,
      refs: c.refs || '',
    }))
  } catch (e) {
    console.error('Failed to fetch commits:', e)
    error.value = e.message
  } finally {
    loading.value = false
  }
}

// ─── Watch for branch-switch refresh ───────────────────────────
watch(() => uiStore.commitRefreshKey, () => {
  fetchCommits()
})

onMounted(() => {
  fetchCommits()
})

// ─── Actions ───────────────────────────────────────────────────
function selectCommit(commit) {
  selectedCommitId.value = commit.id
  selectedCommit.value = commit
}

// Expose selected commit for parent access
defineExpose({ selectedCommit })
</script>

<template>
  <div v-if="loading" class="commit-list-loading">
    <div class="loading">
      <div class="spinner"></div>
      <span style="margin-left: 8px; color: #888;">Loading commits...</span>
    </div>
  </div>

  <div v-else-if="error" class="commit-list-error">
    <div class="empty-state">
      <h3 class="empty-state-title">Error loading commits</h3>
      <p class="empty-state-message">{{ error }}</p>
    </div>
  </div>

  <div v-else-if="commits.length === 0" class="commit-list-empty">
    <div class="empty-state">
      <h3 class="empty-state-title">No commits</h3>
      <p class="empty-state-message">This repository has no commits yet.</p>
    </div>
  </div>

  <table v-else class="commit-table">
    <thead>
      <tr>
        <th style="width: 60px;">Hash</th>
        <th>Subject</th>
        <th style="width: 160px;">Author</th>
        <th style="width: 140px;">Date</th>
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="commit in commits"
        :key="commit.id"
        :data-commit-id="commit.id"
        :class="{ selected: selectedCommitId === commit.id }"
        @click="selectCommit(commit)"
      >
        <!-- Hash Column -->
        <td style="font-family: monospace; font-size: 11px; color: #007acc;">
          {{ commit.hash }}
        </td>

        <!-- Subject Column -->
        <td>
          <span>{{ commit.subject }}</span>
        </td>

        <!-- Author Column -->
        <td>
          <span
            :class="['author-tag', 'author-' + (commit.author.email ? commit.author.email.charAt(0).toLowerCase() : 'x')]"
            style="background-color: #4a90e2;"
          >
            {{ commit.author.initials }}
          </span>
          {{ commit.author.name }}
        </td>

        <!-- Date Column -->
        <td style="font-size: 11px; color: #666;">{{ commit.date }}</td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped>
.commit-list-loading,
.commit-list-error,
.commit-list-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 40px;
}

.commit-list-loading .loading {
  display: flex;
  align-items: center;
}
</style>
