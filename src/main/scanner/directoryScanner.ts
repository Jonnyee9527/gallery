import fs from 'fs'
import path from 'path'

const VIDEO_EXTENSIONS = new Set([
  '.mp4',
  '.mkv',
  '.avi',
  '.wmv',
  '.mov',
  '.ts',
  '.flv',
  '.m4v',
  '.rmvb',
  '.rm',
  '.mpg',
  '.mpeg',
  '.webm',
  '.iso'
])

export function scanNfoFiles(directories: string[]): string[] {
  const nfoFiles: string[] = []

  for (const dir of directories) {
    if (!fs.existsSync(dir)) continue
    scanDirectoryRecursive(dir, nfoFiles)
  }

  return nfoFiles
}

function scanDirectoryRecursive(dir: string, results: string[]): void {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        scanDirectoryRecursive(fullPath, results)
      } else if (entry.isFile() && path.extname(entry.name).toLowerCase() === '.nfo') {
        results.push(fullPath)
      }
    }
  } catch {
    // Skip inaccessible directories
  }
}

export function findVideoFile(nfoPath: string, videoDirectories: string[]): string {
  const nfoBaseName = path.basename(nfoPath, path.extname(nfoPath)).toLowerCase()

  // First, check same directory as NFO
  const nfoDir = path.dirname(nfoPath)
  const localMatch = findVideoInDirectory(nfoDir, nfoBaseName)
  if (localMatch) return localMatch

  // Then search in configured video directories
  for (const videoDir of videoDirectories) {
    if (!fs.existsSync(videoDir)) continue
    const match = findVideoRecursive(videoDir, nfoBaseName)
    if (match) return match
  }

  return ''
}

function findVideoInDirectory(dir: string, baseName: string): string {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isFile()) continue
      const ext = path.extname(entry.name).toLowerCase()
      const entryBase = path.basename(entry.name, ext).toLowerCase()
      if (entryBase === baseName && VIDEO_EXTENSIONS.has(ext)) {
        return path.join(dir, entry.name)
      }
    }
  } catch {
    // Skip
  }
  return ''
}

function findVideoRecursive(dir: string, baseName: string): string {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        const match = findVideoRecursive(fullPath, baseName)
        if (match) return match
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase()
        const entryBase = path.basename(entry.name, ext).toLowerCase()
        if (entryBase === baseName && VIDEO_EXTENSIONS.has(ext)) {
          return fullPath
        }
      }
    }
  } catch {
    // Skip
  }
  return ''
}

export function isDirectoryAccessible(dirPath: string): boolean {
  try {
    fs.accessSync(dirPath, fs.constants.R_OK)
    return true
  } catch {
    return false
  }
}
