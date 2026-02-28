import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'
import { createSchema } from './schema'

let db: Database.Database | null = null

export function getDatabase(): Database.Database {
  if (!db) {
    const dbPath = path.join(app.getPath('userData'), 'gallery.db')
    db = new Database(dbPath)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    createSchema(db)
  }
  return db
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}

export function resetDatabase(): void {
  const database = getDatabase()
  const tables = database
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    .all() as { name: string }[]

  database.exec('PRAGMA foreign_keys = OFF')
  for (const table of tables) {
    database.exec(`DROP TABLE IF EXISTS "${table.name}"`)
  }
  database.exec('PRAGMA foreign_keys = ON')

  createSchema(database)
}
