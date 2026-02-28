import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import type { ScanProgress, ScanStats } from '../../../shared/types'

export const useScanStore = defineStore('scan', () => {
  const isScanning = ref(false)
  const progress = reactive<ScanProgress>({
    phase: 'done',
    current: 0,
    total: 0,
    currentFile: '',
    stats: { added: 0, updated: 0, skipped: 0, failed: 0 }
  })
  const lastStats = ref<ScanStats | null>(null)

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

  return { isScanning, progress, lastStats, startScan, cancelScan, startListening, stopListening }
})
