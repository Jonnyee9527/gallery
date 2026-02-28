import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import type { ScanProgress, ScanStats, NfoImportResult, NfoConflict } from '../../../shared/types'

export const useScanStore = defineStore('scan', () => {
  const isScanning = ref(false)
  const isImportingNfo = ref(false)
  const progress = reactive<ScanProgress>({
    phase: 'done',
    current: 0,
    total: 0,
    currentFile: '',
    stats: { added: 0, updated: 0, skipped: 0, failed: 0 }
  })
  const lastStats = ref<ScanStats | null>(null)
  const nfoImportResult = ref<NfoImportResult | null>(null)
  const nfoConflicts = ref<NfoConflict[]>([])
  const showConflictDialog = ref(false)

  let unsubscribe: (() => void) | null = null

  function startListening(): void {
    if (unsubscribe) return
    unsubscribe = window.api.onScanProgress((p) => {
      progress.phase = p.phase
      progress.current = p.current
      progress.total = p.total
      progress.currentFile = p.currentFile
      progress.stats = { ...p.stats }

      if (p.phase === 'done' || p.phase === 'error' || p.phase === 'cancelled') {
        isScanning.value = false
        lastStats.value = { ...p.stats }
      }
    })
  }

  function stopListening(): void {
    if (unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }
  }

  async function startScan(): Promise<void> {
    isScanning.value = true
    lastStats.value = null
    startListening()
    try {
      const stats = await window.api.startScan()
      lastStats.value = stats
    } catch (err) {
      console.error('Scan failed:', err)
    } finally {
      isScanning.value = false
    }
  }

  async function cancelScan(): Promise<void> {
    await window.api.cancelScan()
  }

  async function importNfo(): Promise<void> {
    isImportingNfo.value = true
    nfoImportResult.value = null
    nfoConflicts.value = []
    try {
      const result = await window.api.importNfo()
      nfoImportResult.value = result
      if (result.conflicts.length > 0) {
        nfoConflicts.value = result.conflicts
        showConflictDialog.value = true
      }
    } catch (err) {
      console.error('NFO import failed:', err)
    } finally {
      isImportingNfo.value = false
    }
  }

  async function importNfoForce(movieIds: number[]): Promise<void> {
    isImportingNfo.value = true
    try {
      const result = await window.api.importNfoForce(movieIds)
      nfoImportResult.value = result
      nfoConflicts.value = []
      showConflictDialog.value = false
    } catch (err) {
      console.error('NFO force import failed:', err)
    } finally {
      isImportingNfo.value = false
    }
  }

  function dismissConflicts(): void {
    showConflictDialog.value = false
    nfoConflicts.value = []
  }

  return {
    isScanning,
    isImportingNfo,
    progress,
    lastStats,
    nfoImportResult,
    nfoConflicts,
    showConflictDialog,
    startScan,
    cancelScan,
    importNfo,
    importNfoForce,
    dismissConflicts,
    startListening,
    stopListening
  }
})
