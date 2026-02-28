import { BrowserWindow } from 'electron'
import { scanNfoFiles, findVideoFile, isDirectoryAccessible } from './directoryScanner'
import { parseNfoFile } from './nfoParser'
import { upsertMovieFromNfo, getExistingNfoPaths } from '../database/dao/movieDao'
import { getDirectories } from '../database/dao/settingsDao'
import { getDatabase } from '../database/index'
import { IPC_CHANNELS } from '../../shared/types'
import type { ScanProgress, ScanStats } from '../../shared/types'

let scanning = false
let cancelRequested = false

export function isScanRunning(): boolean {
  return scanning
}

export function cancelScan(): void {
  cancelRequested = true
}

function sendProgress(progress: ScanProgress): void {
  const windows = BrowserWindow.getAllWindows()
  for (const win of windows) {
    win.webContents.send(IPC_CHANNELS.SCAN_PROGRESS, progress)
  }
}

export async function startScan(): Promise<ScanStats> {
  if (scanning) throw new Error('Scan already in progress')

  scanning = true
  cancelRequested = false

  const stats: ScanStats = { added: 0, updated: 0, skipped: 0, failed: 0 }

  try {
    const nfoDirs = getDirectories('nfo')
    const videoDirs = getDirectories('video')

    // Check directory accessibility
    const inaccessible = [...nfoDirs, ...videoDirs].filter((d) => !isDirectoryAccessible(d.path))
    if (inaccessible.length > 0) {
      const names = inaccessible.map((d) => d.path).join(', ')
      throw new Error(`以下目录不可访问: ${names}`)
    }

    // Phase 1: Scan NFO files
    sendProgress({
      phase: 'scanning',
      current: 0,
      total: 0,
      currentFile: '正在扫描目录...',
      stats
    })

    const nfoPaths = scanNfoFiles(nfoDirs.map((d) => d.path))
    const existingPaths = getExistingNfoPaths()

    // Filter for incremental scan
    const nfoToProcess = nfoPaths.filter((p) => !existingPaths.has(p))
    const total = nfoToProcess.length
    stats.skipped = nfoPaths.length - total

    if (total === 0) {
      sendProgress({ phase: 'done', current: 0, total: 0, currentFile: '', stats })
      return stats
    }

    // Phase 2: Parse & save
    const db = getDatabase()
    const videoDirPaths = videoDirs.map((d) => d.path)

    const batchInsert = db.transaction(() => {
      for (let i = 0; i < nfoToProcess.length; i++) {
        if (cancelRequested) {
          sendProgress({
            phase: 'cancelled',
            current: i,
            total,
            currentFile: '',
            stats
          })
          return
        }

        const nfoPath = nfoToProcess[i]

        sendProgress({
          phase: 'parsing',
          current: i + 1,
          total,
          currentFile: nfoPath,
          stats
        })

        try {
          const parsed = parseNfoFile(nfoPath)
          if (!parsed) {
            stats.failed++
            continue
          }

          // Find matching video
          const videoPath = findVideoFile(nfoPath, videoDirPaths)

          upsertMovieFromNfo(parsed, videoPath)
          stats.added++
        } catch {
          stats.failed++
        }
      }
    })

    batchInsert()

    if (!cancelRequested) {
      sendProgress({
        phase: 'done',
        current: total,
        total,
        currentFile: '',
        stats
      })
    }

    return stats
  } catch (err) {
    sendProgress({
      phase: 'error',
      current: 0,
      total: 0,
      currentFile: err instanceof Error ? err.message : String(err),
      stats
    })
    throw err
  } finally {
    scanning = false
    cancelRequested = false
  }
}
