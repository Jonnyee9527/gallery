import { getDatabase } from '../index'
import type { Tag } from '../../../shared/types'

export function getAllTags(): Tag[] {
  const db = getDatabase()
  return db.prepare('SELECT * FROM tags ORDER BY name').all() as Tag[]
}

export function createTag(name: string, isCustom: boolean = true): Tag {
  const db = getDatabase()
  db.prepare('INSERT OR IGNORE INTO tags (name, is_custom) VALUES (?, ?)').run(
    name,
    isCustom ? 1 : 0
  )
  return db.prepare('SELECT * FROM tags WHERE name = ?').get(name) as Tag
}

export function deleteTag(tagId: number): void {
  const db = getDatabase()
  db.prepare('DELETE FROM tags WHERE id = ?').run(tagId)
}

export function addTagToMovie(movieId: number, tagId: number): void {
  const db = getDatabase()
  db.prepare('INSERT OR IGNORE INTO movie_tags (movie_id, tag_id) VALUES (?, ?)').run(
    movieId,
    tagId
  )
}

export function removeTagFromMovie(movieId: number, tagId: number): void {
  const db = getDatabase()
  db.prepare('DELETE FROM movie_tags WHERE movie_id = ? AND tag_id = ?').run(movieId, tagId)
}
