import { getDatabase } from '../index'
import type { Directory, CustomField } from '../../../shared/types'

// Settings
export function getSetting(key: string): string | null {
  const db = getDatabase()
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    | { value: string }
    | undefined
  return row?.value ?? null
}

export function setSetting(key: string, value: string): void {
  const db = getDatabase()
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run(key, value)
}

// Directories
export function getDirectories(type?: 'nfo' | 'video'): Directory[] {
  const db = getDatabase()
  if (type) {
    return db.prepare('SELECT * FROM directories WHERE type = ?').all(type) as Directory[]
  }
  return db.prepare('SELECT * FROM directories').all() as Directory[]
}

export function addDirectory(dir: Omit<Directory, 'id'>): Directory {
  const db = getDatabase()
  const result = db
    .prepare('INSERT INTO directories (path, type, label) VALUES (?, ?, ?)')
    .run(dir.path, dir.type, dir.label)
  return {
    id: Number(result.lastInsertRowid),
    ...dir
  }
}

export function removeDirectory(id: number): void {
  const db = getDatabase()
  db.prepare('DELETE FROM directories WHERE id = ?').run(id)
}

// Custom Fields
export function getCustomFields(): CustomField[] {
  const db = getDatabase()
  return db.prepare('SELECT * FROM custom_fields ORDER BY name').all() as CustomField[]
}

export function createCustomField(name: string, fieldType: string): CustomField {
  const db = getDatabase()
  const result = db
    .prepare('INSERT INTO custom_fields (name, field_type) VALUES (?, ?)')
    .run(name, fieldType)
  return {
    id: Number(result.lastInsertRowid),
    name,
    field_type: fieldType as CustomField['field_type']
  }
}

export function deleteCustomField(id: number): void {
  const db = getDatabase()
  db.prepare('DELETE FROM custom_fields WHERE id = ?').run(id)
}

export function setCustomFieldValue(movieId: number, fieldId: number, value: string): void {
  const db = getDatabase()
  db.prepare(
    'INSERT INTO movie_custom_fields (movie_id, field_id, value) VALUES (?, ?, ?) ON CONFLICT(movie_id, field_id) DO UPDATE SET value = excluded.value'
  ).run(movieId, fieldId, value)
}

// Genres
export function getAllGenres(): { id: number; name: string }[] {
  const db = getDatabase()
  return db.prepare('SELECT * FROM genres ORDER BY name').all() as { id: number; name: string }[]
}

// Actors
export function getAllActors(): { id: number; name: string; thumb: string }[] {
  const db = getDatabase()
  return db.prepare('SELECT * FROM actors ORDER BY name').all() as {
    id: number
    name: string
    thumb: string
  }[]
}
