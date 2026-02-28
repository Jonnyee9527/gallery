import { BrowserWindow } from 'electron'
import {
  scanVideoFiles,
  scanNfoFiles,
  findVideoForNfo,
  isDirectoryAccessible
} from './directoryScanner'
import { parseNfoFile } from './nfoParser'
import {
  insertMovieFromVideo,
  getExistingVideoPaths,
  applyNfoToMovie,
  getMoviesWithNfoImported
} from '../database/dao/movieDao'
import { getDirectories, removeDirectory } from '../database/dao/settingsDao'
import { getDatabase } from '../database/index'
import { IPC_CHANNELS } from '../../shared/types'
import type { ScanProgress, ScanStats, NfoImportResult } from '../../shared/types'

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

/**
 * 扫描视频目录 — 将所有新视频文件入库（标题取文件名）
 */
export async function startScan(): Promise<ScanStats> {
  if (scanning) throw new Error('Scan already in progress')

  scanning = true
  cancelRequested = false
  const stats: ScanStats = { added: 0, updated: 0, skipped: 0, failed: 0 }

  try {
    const videoDirs = getDirectories('video')

    // Check accessibility
    const inaccessible = videoDirs.filter((d) => !isDirectoryAccessible(d.path))
    if (inaccessible.length > 0) {
      throw new Error(`以下目录不可访问: ${inaccessible.map((d) => d.path).join(', ')}`)
    }

    sendProgress({
      phase: 'scanning',
      current: 0,
      total: 0,
      currentFile: '正在扫描视频目录...',
      stats
    })

    const videoFiles = scanVideoFiles(videoDirs.map((d) => d.path))
    const existingPaths = getExistingVideoPaths()

    // Filter new videos only
    const newVideos = videoFiles.filter((p) => !existingPaths.has(p))
    const total = newVideos.length
    stats.skipped = videoFiles.length - total

    if (total === 0) {
      sendProgress({ phase: 'done', current: 0, total: 0, currentFile: '', stats })
      return stats
    }

    const db = getDatabase()
    const batchInsert = db.transaction(() => {
      for (let i = 0; i < newVideos.length; i++) {
        if (cancelRequested) {
          sendProgress({ phase: 'cancelled', current: i, total, currentFile: '', stats })
          return
        }

        const videoPath = newVideos[i]
        sendProgress({ phase: 'saving', current: i + 1, total, currentFile: videoPath, stats })

        try {
          insertMovieFromVideo(videoPath)
          stats.added++
        } catch {
          stats.failed++
        }
      }
    })

    batchInsert()

    if (!cancelRequested) {
      sendProgress({ phase: 'done', current: total, total, currentFile: '', stats })
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

/**
 * 导入 NFO 目录 — 解析 NFO、按文件名匹配视频、写入元数据
 * 已有 NFO 数据的视频会放入 conflicts 返回给前端确认
 */
export async function importNfo(forceMovieIds?: number[]): Promise<NfoImportResult> {
  const result: NfoImportResult = { applied: 0, skipped: 0, failed: 0, conflicts: [] }
  const forceSet = forceMovieIds ? new Set(forceMovieIds) : null

  const nfoDirs = getDirectories('nfo')
  if (nfoDirs.length === 0) return result

  const inaccessible = nfoDirs.filter((d) => !isDirectoryAccessible(d.path))
  if (inaccessible.length > 0) {
    throw new Error(`以下 NFO 目录不可访问: ${inaccessible.map((d) => d.path).join(', ')}`)
  }

  // Collect all NFO files
  const nfoPaths = scanNfoFiles(nfoDirs.map((d) => d.path))
  if (nfoPaths.length === 0) return result

  // Get all existing video paths for matching
  const existingVideoPaths = getExistingVideoPaths()
  const videoPathArray = Array.from(existingVideoPaths)

  // Get movies that already have NFO data
  const nfoImportedMap = getMoviesWithNfoImported()

  const db = getDatabase()
  const batch = db.transaction(() => {
    for (const nfoPath of nfoPaths) {
      try {
        const parsed = parseNfoFile(nfoPath)
        if (!parsed) {
          result.failed++
          continue
        }

        // Match NFO to existing video by filename
        const matchedVideo = findVideoForNfo(nfoPath, videoPathArray)
        if (!matchedVideo) {
          result.skipped++
          continue
        }

        // Check if this video already has NFO data
        const movieInfo = nfoImportedMap.get(matchedVideo)
        if (movieInfo && movieInfo.nfoImported) {
          // If forceSet provided, only overwrite those explicitly requested
          if (forceSet && forceSet.has(movieInfo.id)) {
            applyNfoToMovie(movieInfo.id, parsed)
            result.applied++
          } else if (!forceSet) {
            // First pass: report conflict
            result.conflicts.push({
              movieId: movieInfo.id,
              title: movieInfo.title,
              filePath: matchedVideo,
              nfoPath
            })
          }
          continue
        }

        if (movieInfo) {
          applyNfoToMovie(movieInfo.id, parsed)
          result.applied++
        } else {
          result.skipped++
        }
      } catch {
        result.failed++
      }
    }
  })

  batch()

  // NFO directories are one-time — remove them after import
  // Only remove if no conflicts (all processed) or if this is a force call
  if (result.conflicts.length === 0) {
    for (const dir of nfoDirs) {
      removeDirectory(dir.id)
    }
  }

  return result
}
