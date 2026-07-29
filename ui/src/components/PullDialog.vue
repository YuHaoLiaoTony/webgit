<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useApi } from '../composables/useApi.js'
import { useStatusStore } from '../stores/status.js'
import { showToast } from '../composables/useToast.js'

const props = defineProps({
  show: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'pulled'])

const api = useApi()
const statusStore = useStatusStore()

// ─── Data ──────────────────────────────────────────────────────────────
const remotes = ref([])
const remoteBranches = ref([])
const loading = ref(false)
const pulling = ref(false)

// ─── Form model ────────────────────────────────────────────────────────
const selectedRemote = ref('')
const selectedRemoteBranch = ref('')
const rebaseInsteadOfMerge = ref(false)
const stashAndReapply = ref(false)

// ─── Current local branch (read-only "Into" field) ────────────────────
const currentBranch = computed(() => statusStore.current || '')

// ─── Computed: filter remote branches for the selected remote ─────────
const filteredRemoteBranches = computed(() => {
  if (!selectedRemote.value) return []
  const prefix = `${selectedRemote.value}/`
  return remoteBranches.value
    .filter(rb => rb.startsWith(prefix))
    .map(rb => rb.slice(prefix.length))
})

// ─── Computed: auto-select default remote branch ──────────────────────
const defaultRemoteBranch = computed(() => {
  // Try current branch first, then fall back to main/master
  if (filteredRemoteBranches.value.includes(currentBranch.value)) {
    return currentBranch.value
  }
  if (filteredRemoteBranches.value.includes('main')) return 'main'
  if (filteredRemoteBranches.value.includes('master')) return 'master'
  return filteredRemoteBranches.value[0] || ''
})

// ─── Computed: disable state for Pull button ──────────────────────────
const canPull = computed(() => {
  return !!selectedRemote.value && !!selectedRemoteBranch.value && !pulling.value
})

// ─── Fetch initial data ────────────────────────────────────────────────
async function fetchData() {
  loading.value = true
  try {
    const [branchesData, remotesData] = await Promise.all([
      api.get('/branches'),
      api.get('/remotes'),
    ])

    // Get status to know current branch
    if (!statusStore.current) {
      await statusStore.fetchStatus()
    }

    // Remotes
    const remoteNames = (remotesData || []).map(r => r.name)
    remotes.value = remoteNames

    // Remote branches
    remoteBranches.value = branchesData.remote || []

    // Set defaults
    if (remoteNames.length > 0) {
      selectedRemote.value = remoteNames[0]
    }
  } catch (e) {
    console.error('Failed to fetch pull data:', e)
    showToast('error', 'Failed to load remotes and branches')
  } finally {
    loading.value = false
  }
}

// ─── When remote changes, auto-select the matching remote branch ──────
watch(selectedRemote, () => {
  selectedRemoteBranch.value = defaultRemoteBranch.value
})

// ─── When dialog opens, fetch data ─────────────────────────────────────
watch(() => props.show, (val) => {
  if (val) {
    fetchData()
    // Reset form
    rebaseInsteadOfMerge.value = false
    stashAndReapply.value = false
  }
})

// ─── Pull action ───────────────────────────────────────────────────────
async function handlePull() {
  if (!canPull.value) return

  pulling.value = true
  try {
    const params = {
      remote: selectedRemote.value,
      remoteBranch: selectedRemoteBranch.value,
      rebase: rebaseInsteadOfMerge.value,
      autostash: stashAndReapply.value,
    }

    await api.post('/pull', params)

    showToast('success', `Pulled ${selectedRemote.value}/${selectedRemoteBranch.value} → ${currentBranch.value}`)
    emit('pulled')
    emit('close')
  } catch (e) {
    showToast('error', `Pull failed: ${e.message}`, 6000)
  } finally {
    pulling.value = false
  }
}

// ─── Cancel ────────────────────────────────────────────────────────────
function handleCancel() {
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="pull-overlay" @click.self="handleCancel">
      <div class="pull-dialog">
        <!-- Header -->
        <div class="pull-dialog-header">
          <div class="pull-header-left">
            <span class="pull-icon">⬇</span>
            <div class="pull-header-text">
              <div class="pull-title">Pull</div>
              <div class="pull-subtitle">Pull remote branches and merge them into your local branch</div>
            </div>
          </div>
          <button class="pull-close-btn" @click="handleCancel">×</button>
        </div>

        <!-- Body -->
        <div class="pull-dialog-body">
          <div v-if="loading" class="pull-loading">
            Loading remotes and branches…
          </div>
          <template v-else>
            <!-- Remote -->
            <div class="pull-field">
              <label class="pull-label">Remote</label>
              <select v-model="selectedRemote" class="pull-select">
                <option v-for="r in remotes" :key="r" :value="r">{{ r }}</option>
              </select>
              <div class="pull-field-hint">Select the remote server to pull from</div>
            </div>

            <!-- Branch (remote branch) -->
            <div class="pull-field">
              <label class="pull-label">Branch</label>
              <select v-model="selectedRemoteBranch" class="pull-select">
                <option v-for="b in filteredRemoteBranches" :key="b" :value="b">{{ b }}</option>
              </select>
              <div class="pull-field-hint">Select the remote branch to pull</div>
            </div>

            <!-- Into (local branch, read-only) -->
            <div class="pull-field">
              <label class="pull-label">Into</label>
              <div class="pull-readonly-field">{{ currentBranch }}</div>
              <div class="pull-field-hint">Your local branch that will receive the changes</div>
            </div>

            <!-- Options -->
            <div class="pull-options">
              <div class="pull-field">
                <label class="pull-checkbox-label">
                  <input type="checkbox" v-model="rebaseInsteadOfMerge" class="pull-checkbox" />
                  <span>Rebase instead of merge (--rebase)</span>
                </label>
                <div class="pull-field-hint">Rebase current branch onto remote changes instead of creating a merge commit</div>
              </div>

              <div class="pull-field">
                <label class="pull-checkbox-label">
                  <input type="checkbox" v-model="stashAndReapply" class="pull-checkbox" />
                  <span>Stash and reapply local changes (--autostash)</span>
                </label>
                <div class="pull-field-hint">Automatically stash local changes before pulling and reapply them afterwards</div>
              </div>
            </div>
          </template>
        </div>

        <!-- Footer -->
        <div class="pull-dialog-footer">
          <button class="pull-btn pull-btn-secondary" @click="handleCancel">Cancel</button>
          <button
            class="pull-btn pull-btn-primary"
            :disabled="!canPull"
            @click="handlePull"
          >
            {{ pulling ? 'Pulling…' : 'Pull' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.pull-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.pull-dialog {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  width: 460px;
  max-width: 90vw;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ── Header ──────────────────────────────────────────────────────────── */
.pull-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 14px;
  border-bottom: 1px solid #e8e8e8;
}

.pull-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.pull-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: linear-gradient(135deg, #28a745, #1e7e34);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.pull-header-text {
  display: flex;
  flex-direction: column;
}

.pull-title {
  font-size: 15px;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1.3;
}

.pull-subtitle {
  font-size: 11px;
  color: #888;
  line-height: 1.3;
  margin-top: 1px;
}

.pull-close-btn {
  background: none;
  border: none;
  font-size: 20px;
  color: #999;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
}

.pull-close-btn:hover {
  color: #333;
}

/* ── Body ────────────────────────────────────────────────────────────── */
.pull-dialog-body {
  padding: 16px 20px;
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pull-loading {
  color: #999;
  font-style: italic;
  font-size: 12px;
  padding: 20px 0;
  text-align: center;
}

.pull-field {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.pull-label {
  font-size: 11px;
  font-weight: 600;
  color: #444;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.pull-select {
  width: 100%;
  padding: 7px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 13px;
  font-family: inherit;
  background: #fff;
  color: #333;
  outline: none;
  cursor: pointer;
  appearance: auto;
}

.pull-select:focus {
  border-color: #28a745;
  box-shadow: 0 0 0 2px rgba(40, 167, 69, 0.15);
}

.pull-readonly-field {
  width: 100%;
  padding: 7px 10px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  font-size: 13px;
  font-family: inherit;
  background: #f5f5f5;
  color: #555;
  cursor: default;
  user-select: all;
}

.pull-field-hint {
  font-size: 10px;
  color: #999;
  margin-top: 1px;
}

/* ── Checkboxes ──────────────────────────────────────────────────────── */
.pull-options {
  margin-top: 4px;
  padding-top: 12px;
  border-top: 1px solid #eee;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pull-checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #333;
  cursor: pointer;
}

.pull-checkbox {
  width: 15px;
  height: 15px;
  accent-color: #28a745;
  cursor: pointer;
  flex-shrink: 0;
}

/* ── Footer ──────────────────────────────────────────────────────────── */
.pull-dialog-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 20px;
  border-top: 1px solid #e8e8e8;
  background-color: #fafafa;
}

.pull-btn {
  padding: 6px 18px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 4px;
  border: 1px solid #ccc;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
}

.pull-btn-secondary {
  background: #fff;
  color: #444;
}

.pull-btn-secondary:hover {
  background: #f0f0f0;
  border-color: #aaa;
}

.pull-btn-primary {
  background: #28a745;
  color: #fff;
  border-color: #1e7e34;
}

.pull-btn-primary:hover:not(:disabled) {
  background: #1e7e34;
}

.pull-btn-primary:disabled {
  background: #94d3a2;
  border-color: #7fc08e;
  cursor: not-allowed;
}
</style>
