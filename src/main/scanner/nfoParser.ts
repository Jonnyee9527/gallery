import { XMLParser } from 'fast-xml-parser'
import fs from 'fs'
import path from 'path'
import type { NfoParsedMovie } from '../../shared/types'

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  isArray: (name) => {
    // These fields can be multiple
    return ['genre', 'tag', 'actor', 'uniqueid'].includes(name)
  }
})

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp']

function findImage(dir: string, baseName: string, suffixes: string[]): string {
  for (const suffix of suffixes) {
    for (const ext of IMAGE_EXTENSIONS) {
      const candidate = path.join(dir, `${baseName}${suffix}${ext}`)
      if (fs.existsSync(candidate)) {
        return candidate
      }
    }
  }
  return ''
}

export function parseNfoFile(nfoPath: string): NfoParsedMovie | null {
  try {
    const content = fs.readFileSync(nfoPath, 'utf-8')
    const parsed = parser.parse(content)
    const movie = parsed.movie
    if (!movie) return null

    const dir = path.dirname(nfoPath)
    const nfoBaseName = path.basename(nfoPath, path.extname(nfoPath))

    // Extract actors
    const rawActors = movie.actor || []
    const actors = (Array.isArray(rawActors) ? rawActors : [rawActors]).map(
      (a: Record<string, unknown>, idx: number) => ({
        name: String(a.name || ''),
        role: String(a.role || ''),
        thumb: String(a.thumb || ''),
        sortOrder: idx
      })
    )

    // Extract genres
    const rawGenres = movie.genre || []
    const genres = (Array.isArray(rawGenres) ? rawGenres : [rawGenres])
      .map((g: unknown) => String(g))
      .filter((g: string) => g.length > 0)

    // Extract tags
    const rawTags = movie.tag || []
    const tags = (Array.isArray(rawTags) ? rawTags : [rawTags])
      .map((t: unknown) => String(t))
      .filter((t: string) => t.length > 0)

    // Extract uniqueids
    const rawIds = movie.uniqueid || []
    const uniqueIds = (Array.isArray(rawIds) ? rawIds : [rawIds]).map(
      (u: Record<string, unknown>) => ({
        type: String(u['@_type'] || 'unknown'),
        id: String(u['#text'] || u || '')
      })
    )

    // Find poster & fanart
    // Priority: poster.jpg, <nfoBaseName>-poster.jpg
    const posterPath = findImage(dir, 'poster', ['']) || findImage(dir, nfoBaseName, ['-poster'])
    const fanartPath =
      findImage(dir, 'fanart', ['']) ||
      findImage(dir, nfoBaseName, ['-fanart']) ||
      findImage(dir, 'thumb', [''])

    // Extract rating
    let rating: number | null = null
    if (movie.rating !== undefined && movie.rating !== null) {
      const r = parseFloat(String(movie.rating))
      if (!isNaN(r)) rating = r
    }
    // Also check ratings/rating/value structure (Jellyfin format)
    if (rating === null && movie.ratings?.rating) {
      const r = movie.ratings.rating
      const val = r.value ?? r['#text']
      if (val !== undefined) {
        const parsed = parseFloat(String(val))
        if (!isNaN(parsed)) rating = parsed
      }
    }

    return {
      title: String(movie.title || ''),
      originalTitle: String(movie.originaltitle || ''),
      sortTitle: String(movie.sorttitle || movie.title || ''),
      year: movie.year ? parseInt(String(movie.year), 10) || null : null,
      plot: String(movie.plot || ''),
      runtime: movie.runtime ? parseInt(String(movie.runtime), 10) || null : null,
      genres,
      tags,
      studio: String(movie.studio || ''),
      director: String(movie.director || ''),
      actors,
      rating,
      uniqueIds,
      posterPath,
      fanartPath,
      nfoPath
    }
  } catch {
    return null
  }
}
