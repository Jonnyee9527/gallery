import { getDatabase } from '../index'
import path from 'path'
import type {
  Movie,
  MovieDetail,
  MovieFilter,
  PaginatedResult,
  Genre,
  Tag,
  MovieActor,
  CustomField,
  NfoParsedMovie
} from '../../../shared/types'

export function getMovies(filter: MovieFilter): PaginatedResult<Movie> {
  const db = getDatabase()
  const page = filter.page || 1
  const pageSize = filter.pageSize || 50
  const offset = (page - 1) * pageSize

  const conditions: string[] = []
  const params: unknown[] = []

  if (filter.search) {
    conditions.push('(m.title LIKE ? OR m.original_title LIKE ?)')
    params.push(`%${filter.search}%`, `%${filter.search}%`)
  }

  if (filter.yearFrom != null) {
    conditions.push('m.year >= ?')
    params.push(filter.yearFrom)
  }
  if (filter.yearTo != null) {
    conditions.push('m.year <= ?')
    params.push(filter.yearTo)
  }
  if (filter.ratingFrom != null) {
    conditions.push('m.rating_local >= ?')
    params.push(filter.ratingFrom)
  }
  if (filter.ratingTo != null) {
    conditions.push('m.rating_local <= ?')
    params.push(filter.ratingTo)
  }
  if (filter.isFavorite != null) {
    conditions.push('m.is_favorite = ?')
    params.push(filter.isFavorite ? 1 : 0)
  }

  if (filter.genres && filter.genres.length > 0) {
    const placeholders = filter.genres.map(() => '?').join(',')
    conditions.push(
      `m.id IN (SELECT movie_id FROM movie_genres WHERE genre_id IN (${placeholders}))`
    )
    params.push(...filter.genres)
  }

  if (filter.tags && filter.tags.length > 0) {
    const placeholders = filter.tags.map(() => '?').join(',')
    conditions.push(`m.id IN (SELECT movie_id FROM movie_tags WHERE tag_id IN (${placeholders}))`)
    params.push(...filter.tags)
  }

  if (filter.actors && filter.actors.length > 0) {
    const placeholders = filter.actors.map(() => '?').join(',')
    conditions.push(
      `m.id IN (SELECT movie_id FROM movie_actors WHERE actor_id IN (${placeholders}))`
    )
    params.push(...filter.actors)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const sortBy = filter.sortBy || 'created_at'
  const sortOrder = filter.sortOrder || 'desc'

  const countSql = `SELECT COUNT(*) as count FROM movies m ${whereClause}`
  const total = (db.prepare(countSql).get(...params) as { count: number }).count

  const querySql = `SELECT m.* FROM movies m ${whereClause} ORDER BY m.${sortBy} ${sortOrder} LIMIT ? OFFSET ?`
  const items = db.prepare(querySql).all(...params, pageSize, offset) as Movie[]

  return { items, total, page, pageSize }
}

export function getMovieDetail(id: number): MovieDetail | null {
  const db = getDatabase()
  const movie = db.prepare('SELECT * FROM movies WHERE id = ?').get(id) as Movie | undefined
  if (!movie) return null

  const genres = db
    .prepare(
      'SELECT g.* FROM genres g JOIN movie_genres mg ON g.id = mg.genre_id WHERE mg.movie_id = ?'
    )
    .all(id) as Genre[]

  const actors = db
    .prepare(
      'SELECT a.id, a.name, a.thumb, ma.role, ma.sort_order FROM actors a JOIN movie_actors ma ON a.id = ma.actor_id WHERE ma.movie_id = ? ORDER BY ma.sort_order'
    )
    .all(id) as MovieActor[]

  const tags = db
    .prepare('SELECT t.* FROM tags t JOIN movie_tags mt ON t.id = mt.tag_id WHERE mt.movie_id = ?')
    .all(id) as Tag[]

  const customFieldRows = db
    .prepare(
      `SELECT cf.id, cf.name, cf.field_type, mcf.value
       FROM custom_fields cf
       JOIN movie_custom_fields mcf ON cf.id = mcf.field_id
       WHERE mcf.movie_id = ?`
    )
    .all(id) as (CustomField & { value: string })[]

  const customFields = customFieldRows.map((row) => ({
    field: { id: row.id, name: row.name, field_type: row.field_type },
    value: row.value
  }))

  return { ...movie, genres, actors, tags, customFields }
}

export function updateMovieRating(movieId: number, rating: number): void {
  const db = getDatabase()
  db.prepare("UPDATE movies SET rating_local = ?, updated_at = datetime('now') WHERE id = ?").run(
    rating,
    movieId
  )
}

export function toggleMovieFavorite(movieId: number): boolean {
  const db = getDatabase()
  const movie = db.prepare('SELECT is_favorite FROM movies WHERE id = ?').get(movieId) as
    | { is_favorite: number }
    | undefined
  if (!movie) return false
  const newVal = movie.is_favorite ? 0 : 1
  db.prepare("UPDATE movies SET is_favorite = ?, updated_at = datetime('now') WHERE id = ?").run(
    newVal,
    movieId
  )
  return newVal === 1
}

export function deleteMovie(movieId: number): void {
  const db = getDatabase()
  db.prepare('DELETE FROM movies WHERE id = ?').run(movieId)
}

export function insertMovieFromVideo(videoPath: string): number {
  const db = getDatabase()
  const ext = path.extname(videoPath)
  const title = path.basename(videoPath, ext)

  const result = db
    .prepare(`INSERT INTO movies (title, sort_title, file_path) VALUES (?, ?, ?)`)
    .run(title, title, videoPath)

  return Number(result.lastInsertRowid)
}

export function getExistingVideoPaths(): Set<string> {
  const db = getDatabase()
  const rows = db.prepare("SELECT file_path FROM movies WHERE file_path != ''").all() as {
    file_path: string
  }[]
  return new Set(rows.map((r) => r.file_path))
}

/** 返回所有视频的 file_path → { id, title, nfoImported } 映射 */
export function getMoviesWithNfoImported(): Map<
  string,
  { id: number; title: string; nfoImported: boolean }
> {
  const db = getDatabase()
  const rows = db
    .prepare("SELECT id, title, file_path, nfo_imported FROM movies WHERE file_path != ''")
    .all() as { id: number; title: string; file_path: string; nfo_imported: number }[]
  const map = new Map<string, { id: number; title: string; nfoImported: boolean }>()
  for (const r of rows) {
    map.set(r.file_path, { id: r.id, title: r.title, nfoImported: r.nfo_imported === 1 })
  }
  return map
}

/** 将 NFO 解析数据应用到已有的电影记录 */
export function applyNfoToMovie(movieId: number, parsed: NfoParsedMovie): void {
  const db = getDatabase()

  db.prepare(
    `
    UPDATE movies SET
      title = ?, original_title = ?, sort_title = ?, year = ?,
      plot = ?, rating_nfo = ?, runtime = ?, studio = ?, director = ?,
      nfo_path = ?, poster_path = ?, fanart_path = ?,
      nfo_imported = 1, updated_at = datetime('now')
    WHERE id = ?
  `
  ).run(
    parsed.title,
    parsed.originalTitle,
    parsed.sortTitle || parsed.title,
    parsed.year,
    parsed.plot,
    parsed.rating,
    parsed.runtime,
    parsed.studio,
    parsed.director,
    parsed.nfoPath,
    parsed.posterPath,
    parsed.fanartPath,
    movieId
  )

  // Clear existing NFO-sourced relations
  db.prepare('DELETE FROM movie_genres WHERE movie_id = ?').run(movieId)
  db.prepare('DELETE FROM movie_actors WHERE movie_id = ?').run(movieId)
  db.prepare(
    'DELETE FROM movie_tags WHERE movie_id = ? AND tag_id IN (SELECT id FROM tags WHERE is_custom = 0)'
  ).run(movieId)

  // Insert genres
  const insertGenre = db.prepare('INSERT OR IGNORE INTO genres (name) VALUES (?)')
  const getGenreId = db.prepare('SELECT id FROM genres WHERE name = ?')
  const insertMovieGenre = db.prepare(
    'INSERT OR IGNORE INTO movie_genres (movie_id, genre_id) VALUES (?, ?)'
  )
  for (const genre of parsed.genres) {
    insertGenre.run(genre)
    const row = getGenreId.get(genre) as { id: number }
    insertMovieGenre.run(movieId, row.id)
  }

  // Insert actors
  const insertActor = db.prepare(
    'INSERT INTO actors (name, thumb) VALUES (?, ?) ON CONFLICT(name) DO UPDATE SET thumb = excluded.thumb'
  )
  const getActorId = db.prepare('SELECT id FROM actors WHERE name = ?')
  const insertMovieActor = db.prepare(
    'INSERT OR IGNORE INTO movie_actors (movie_id, actor_id, role, sort_order) VALUES (?, ?, ?, ?)'
  )
  for (const actor of parsed.actors) {
    insertActor.run(actor.name, actor.thumb)
    const row = getActorId.get(actor.name) as { id: number }
    insertMovieActor.run(movieId, row.id, actor.role, actor.sortOrder)
  }

  // Insert tags (from NFO, is_custom = 0)
  const insertTag = db.prepare('INSERT OR IGNORE INTO tags (name, is_custom) VALUES (?, 0)')
  const getTagId = db.prepare('SELECT id FROM tags WHERE name = ?')
  const insertMovieTag = db.prepare(
    'INSERT OR IGNORE INTO movie_tags (movie_id, tag_id) VALUES (?, ?)'
  )
  for (const tag of parsed.tags) {
    insertTag.run(tag)
    const row = getTagId.get(tag) as { id: number }
    insertMovieTag.run(movieId, row.id)
  }
}
