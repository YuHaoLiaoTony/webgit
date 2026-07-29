<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useApi } from '../composables/useApi.js'
import { useStatusStore } from '../stores/status.js'
import { showToast } from '../composables/useToast.js'

const props = defineProps({
  show: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'pushed'])

const api = useApi()
const statusStore = useStatusStore()

// ─── Data ──────────────────────────────────────────────────────────────
const localBranches = ref([])
const remotes = ref([])
const loading = ref(false)
const pushing = ref(false)

// ─── Form model ────────────────────────────────────────────────────────
const selectedBranch = ref('')
const selectedRemote = ref('')
const selectedRemoteBranch = ref('')
const pushAllTags = ref(true)
const forcePush = ref(false)

// ─── Computed: target remote branch options ────────────────────────────
const remoteBranchOptions = computed(() => {
  if (!selectedRemote.value || !selectedBranch.value) return []
  const base = `${selectedRemote.value}/${selectedBranch.value}`
  return [
    { label: `default (${base})`, value: '' },
    { label: base, value: base },
    { label: `${selectedRemote.value}/main`, value: `${selectedRemote.value}/main` },
    { label: `${selectedRemote.value}/master`, value: `${selectedRemote.value}/master` },
  ]
})

// ─── Computed: disable state for Push button ───────────────────────────
const canPush = computed(() => {
  return !!selectedBranch.value && !!selectedRemote.value && !pushing.value
})

// ─── Fetch initial data ────────────────────────────────────────────────
async function fetchData() {
  loading.value = true
  try {
    const [branchesData, remotesData] = await Promise.all([
      api.get('/branches'),
      api.get('/remotes'),
    ])

    // Sort local branches: current first, then alphabetically
    const sorted = (branchesData.local || []).sort((a, b) => {
      if (a === branchesData.current) return -1
      if (b === branchesData.current) return 1
      return a.localeCompare(b)
    })
    localBranches.value = sorted

    // Set defaults
    if (branchesData.current) {
      selectedBranch.value = branchesData.current
    } else if (sorted.length > 0) {
      selectedBranch.value = sorted[0]
    }

    // Remotes
    const remoteNames = (remotesData || []).map(r => r.name)
    remotes.value = remoteNames

    if (remoteNames.length > 0) {
      selectedRemote.value = remoteNames[0]
    }
  } catch (e) {
    console.error('Failed to fetch push data:', e)
    showToast('error', 'Failed to load branches and remotes')
  } finally {
    loading.value = false
  }
}

// ─── When dialog opens, fetch data ─────────────────────────────────────
watch(() => props.show, (val) => {
  if (val) {
    fetchData()
    // Reset form
    pushAllTags.value = true
    forcePush.value = false
  }
})

// ─── Push action ───────────────────────────────────────────────────────
async function handlePush() {
  if (!canPush.value) return

  pushing.value = true
  try {
    const params = {
      remote: selectedRemote.value,
      branch: selectedBranch.value,
      remoteBranch: selectedRemoteBranch.value || undefined,
      tags: pushAllTags.value,
    }

    // Determine force push strategy
    if (forcePush.value) {
      params.force = 'force-with-lease'
    }

    await api.post('/push', params)

    showToast('success', `Pushed ${selectedBranch.value} → ${selectedRemote.value}`)
    emit('pushed')
    emit('close')
  } catch (e) {
    showToast('error', `Push failed: ${e.message}`, 6000)
  } finally {
    pushing.value = false
  }
}

// ─── Cancel ────────────────────────────────────────────────────────────
function handleCancel() {
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="push-overlay" @click.self="handleCancel">
      <div class="push-dialog">
        <!-- Header -->
        <div class="push-dialog-header">
          <div class="push-header-left">
            <span class="push-icon">⬆</span>
            <div class="push-header-text">
              <div class="push-title">Push</div>
              <div class="push-subtitle">Push your local changes to remote repository</div>
            </div>
          </div>
          <button class="push-close-btn" @click="handleCancel">×</button>
        </div>

        <!-- Body -->
        <div class="push-dialog-body">
          <div v-if="loading" class="push-loading">
            Loading branches and remotes…
          </div>
          <template v-else>
            <!-- Branch -->
            <div class="push-field">
              <label class="push-label">Branch</label>
              <select v-model="selectedBranch" class="push-select">
                <option v-for="b in localBranches" :key="b" :value="b">{{ b }}</option>
              </select>
              <div class="push-field-hint">Select the local branch to push</div>
            </div>

            <!-- Remote -->
            <div class="push-field">
              <label class="push-label">Remote</label>
              <select v-model="selectedRemote" class="push-select">
                <option v-for="r in remotes" :key="r" :value="r">{{ r }}</option>
              </select>
              <div class="push-field-hint">Select the remote server to push to</div>
            </div>

            <!-- To (remote branch) -->
            <div class="push-field">
              <label class="push-label">To</label>
              <select v-model="selectedRemoteBranch" class="push-select">
                <option v-for="opt in remoteBranchOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
              <div class="push-field-hint">Specify the target remote branch</div>
            </div>

            <!-- Options -->
            <div class="push-options">
              <div class="push-field">
                <label class="push-checkbox-label">
                  <input type="checkbox" v-model="pushAllTags" class="push-checkbox" />
                  <span>Push all tags (--tags)</span>
                </label>
                <div class="push-field-hint">Push all local tags to the remote repository</div>
              </div>

              <div class="push-field">
                <label class="push-checkbox-label">
                  <input type="checkbox" v-model="forcePush" class="push-checkbox" />
                  <span>Force push (--force-with-lease)</span>
                </label>
                <div class="push-field-hint push-warning-hint">
                  ⚠ Overwrite remote history. Use with caution.
                </div>
              </div>
            </div>
          </template>
        </div>

        <!-- Footer -->
        <div class="push-dialog-footer">
          <button class="push-btn push-btn-secondary" @click="handleCancel">Cancel</button>
          <button
            class="push-btn push-btn-primary"
            :disabled="!canPush"
            @click="handlePush"
          >
            {{ pushing ? 'Pushing…' : 'Push' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.push-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.push-dialog {
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
.push-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 14px;
  border-bottom: 1px solid #e8e8e8;
}

.push-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.push-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: linear-gradient(135deg, #007acc, #005fa3);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.push-header-text {
  display: flex;
  flex-direction: column;
}

.push-title {
  font-size: 15px;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1.3;
}

.push-subtitle {
  font-size: 11px;
  color: #888;
  line-height: 1.3;
  margin-top: 1px;
}

.push-close-btn {
  background: none;
  border: none;
  font-size: 20px;
  color: #999;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
}

.push-close-btn:hover {
  color: #333;
}

/* ── Body ────────────────────────────────────────────────────────────── */
.push-dialog-body {
  padding: 16px 20px;
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.push-loading {
  color: #999;
  font-style: italic;
  font-size: 12px;
  padding: 20px 0;
  text-align: center;
}

.push-field {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.push-label {
  font-size: 11px;
  font-weight: 600;
  color: #444;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.push-select {
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

.push-select:focus {
  border-color: #007acc;
  box-shadow: 0 0 0 2px rgba(0, 122, 204, 0.15);
}

.push-field-hint {
  font-size: 10px;
  color: #999;
  margin-top: 1px;
}

.push-warning-hint {
  color: #d4980a;
}

/* ── Checkboxes ──────────────────────────────────────────────────────── */
.push-options {
  margin-top: 4px;
  padding-top: 12px;
  border-top: 1px solid #eee;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.push-checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #333;
  cursor: pointer;
}

.push-checkbox {
  width: 15px;
  height: 15px;
  accent-color: #007acc;
  cursor: pointer;
  flex-shrink: 0;
}

/* ── Footer ──────────────────────────────────────────────────────────── */
.push-dialog-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 20px;
  border-top: 1px solid #e8e8e8;
  background-color: #fafafa;
}

.push-btn {
  padding: 6px 18px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 4px;
  border: 1px solid #ccc;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
}

.push-btn-secondary {
  background: #fff;
  color: #444;
}

.push-btn-secondary:hover {
  background: #f0f0f0;
  border-color: #aaa;
}

.push-btn-primary {
  background: #007acc;
  color: #fff;
  border-color: #005fa3;
}

.push-btn-primary:hover:not(:disabled) {
  background: #005fa3;
}

.push-btn-primary:disabled {
  background: #94c5e8;
  border-color: #7fb3d9;
  cursor: not-allowed;
}
</style>
