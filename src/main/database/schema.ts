import Database from 'better-sqlite3'

export function createSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS movies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL DEFAULT '',
      original_title TEXT NOT NULL DEFAULT '',
      sort_title TEXT NOT NULL DEFAULT '',
      year INTEGER,
      plot TEXT NOT NULL DEFAULT '',
      rating_local REAL,
      rating_nfo REAL,
      runtime INTEGER,
      studio TEXT NOT NULL DEFAULT '',
      director TEXT NOT NULL DEFAULT '',
      file_path TEXT NOT NULL DEFAULT '',
      nfo_path TEXT NOT NULL DEFAULT '' UNIQUE,
      poster_path TEXT NOT NULL DEFAULT '',
      fanart_path TEXT NOT NULL DEFAULT '',
      is_favorite INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_movies_title ON movies(title);
    CREATE INDEX IF NOT EXISTS idx_movies_year ON movies(year);
    CREATE INDEX IF NOT EXISTS idx_movies_rating_local ON movies(rating_local);
    CREATE INDEX IF NOT EXISTS idx_movies_file_path ON movies(file_path);
    CREATE INDEX IF NOT EXISTS idx_movies_sort_title ON movies(sort_title);

    CREATE TABLE IF NOT EXISTS genres (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS movie_genres (
      movie_id INTEGER NOT NULL,
      genre_id INTEGER NOT NULL,
      PRIMARY KEY (movie_id, genre_id),
      FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
      FOREIGN KEY (genre_id) REFERENCES genres(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS actors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      thumb TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS movie_actors (
      movie_id INTEGER NOT NULL,
      actor_id INTEGER NOT NULL,
      role TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (movie_id, actor_id),
      FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
      FOREIGN KEY (actor_id) REFERENCES actors(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      is_custom INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS movie_tags (
      movie_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (movie_id, tag_id),
      FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS custom_fields (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      field_type TEXT NOT NULL DEFAULT 'text'
    );

    CREATE TABLE IF NOT EXISTS movie_custom_fields (
      movie_id INTEGER NOT NULL,
      field_id INTEGER NOT NULL,
      value TEXT NOT NULL DEFAULT '',
      PRIMARY KEY (movie_id, field_id),
      FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
      FOREIGN KEY (field_id) REFERENCES custom_fields(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS directories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('nfo', 'video')),
      label TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL DEFAULT ''
    );
  `)
}
