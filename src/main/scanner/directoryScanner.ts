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

/** 扫描视频文件 */
export function scanVideoFiles(directories: string[]): string[] {
  const videoFiles: string[] = []
  for (const dir of directories) {
    if (!fs.existsSync(dir)) continue
    scanDirectoryForExtensions(dir, VIDEO_EXTENSIONS, videoFiles)
  }
  return videoFiles
}

export function scanNfoFiles(directories: string[]): string[] {
  const nfoFiles: string[] = []
  for (const dir of directories) {
    if (!fs.existsSync(dir)) continue
    scanDirectoryForExtensions(dir, new Set(['.nfo']), nfoFiles)
  }
  return nfoFiles
}

function scanDirectoryForExtensions(dir: string, extensions: Set<string>, results: string[]): void {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        scanDirectoryForExtensions(fullPath, extensions, results)
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase()
        if (extensions.has(ext)) {
          results.push(fullPath)
        }
      }
    }
  } catch {
    // Skip inaccessible directories
  }
}

/** 在 NFO 同目录或指定视频目录中，按文件名匹配视频 */
export function findVideoForNfo(nfoPath: string, videoFilePaths: string[]): string {
  const nfoBaseName = path.basename(nfoPath, path.extname(nfoPath)).toLowerCase()

  // First, check same directory as NFO
  const nfoDir = path.dirname(nfoPath)
  const localMatch = findVideoInDirectory(nfoDir, nfoBaseName)
  if (localMatch) return localMatch

  // Then search in known video paths by basename
  for (const vp of videoFilePaths) {
    const ext = path.extname(vp).toLowerCase()
    const base = path.basename(vp, ext).toLowerCase()
    if (base === nfoBaseName) return vp
  }

  return ''
}

/** 在 NFO 同目录下查找封面图 */
export function findNfoImages(nfoPath: string): { posterPath: string; fanartPath: string } {
  const dir = path.dirname(nfoPath)
  const base = path.basename(nfoPath, path.extname(nfoPath))
  const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp']

  let posterPath = ''
  let fanartPath = ''

  for (const ext of IMAGE_EXTENSIONS) {
    if (!posterPath) {
      const p = path.join(dir, `poster${ext}`)
      if (fs.existsSync(p)) posterPath = p
    }
    if (!posterPath) {
      const p = path.join(dir, `${base}-poster${ext}`)
      if (fs.existsSync(p)) posterPath = p
    }
    if (!fanartPath) {
      const p = path.join(dir, `fanart${ext}`)
      if (fs.existsSync(p)) fanartPath = p
    }
    if (!fanartPath) {
      const p = path.join(dir, `${base}-fanart${ext}`)
      if (fs.existsSync(p)) fanartPath = p
    }
    if (!fanartPath) {
      const p = path.join(dir, `thumb${ext}`)
      if (fs.existsSync(p)) fanartPath = p
    }
  }

  return { posterPath, fanartPath }
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

export function isDirectoryAccessible(dirPath: string): boolean {
  try {
    fs.accessSync(dirPath, fs.constants.R_OK)
    return true
  } catch {
    return false
  }
}
