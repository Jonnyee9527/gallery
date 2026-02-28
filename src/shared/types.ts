// ===== Database / Domain Types =====

export interface Movie {
  id: number
  title: string
  original_title: string
  sort_title: string
  year: number | null
  plot: string
  rating_local: number | null
  rating_nfo: number | null
  runtime: number | null
  studio: string
  director: string
  file_path: string
  nfo_path: string
  poster_path: string
  fanart_path: string
  nfo_imported: number // 0 = 未导入, 1 = 已导入
  is_favorite: number // 0 or 1
  created_at: string
  updated_at: string
}

export interface Genre {
  id: number
  name: string
}

export interface Actor {
  id: number
  name: string
  thumb: string
}

export interface MovieActor extends Actor {
  role: string
  sort_order: number
}

export interface Tag {
  id: number
  name: string
  is_custom: number // 0 = NFO tag, 1 = user tag
}

export interface CustomField {
  id: number
  name: string
  field_type: 'text' | 'number' | 'date' | 'boolean'
}

export interface MovieCustomField {
  movie_id: number
  field_id: number
  value: string
}

export interface Directory {
  id: number
  path: string
  type: 'nfo' | 'video'
  label: string
}

export interface Setting {
  key: string
  value: string
}

// ===== Query / Filter Types =====

export interface MovieFilter {
  search?: string
  genres?: number[]
  tags?: number[]
  actors?: number[]
  yearFrom?: number
  yearTo?: number
  ratingFrom?: number
  ratingTo?: number
  isFavorite?: boolean
  customFields?: { fieldId: number; value: string }[]
  sortBy?: 'title' | 'year' | 'rating_local' | 'created_at' | 'sort_title'
  sortOrder?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface MovieDetail extends Movie {
  genres: Genre[]
  actors: MovieActor[]
  tags: Tag[]
  customFields: { field: CustomField; value: string }[]
}

// ===== Scan Types =====

export interface ScanProgress {
  phase: 'scanning' | 'parsing' | 'matching' | 'saving' | 'done' | 'error' | 'cancelled'
  current: number
  total: number
  currentFile: string
  stats: ScanStats
}

export interface ScanStats {
  added: number
  updated: number
  skipped: number
  failed: number
}

/** NFO 导入时，已有 NFO 数据的视频冲突项 */
export interface NfoConflict {
  movieId: number
  title: string
  filePath: string
  nfoPath: string
}

/** NFO 导入结果 */
export interface NfoImportResult {
  applied: number
  skipped: number
  failed: number
  conflicts: NfoConflict[]
}

// ===== NFO Parsed Data =====

export interface NfoParsedMovie {
  title: string
  originalTitle: string
  sortTitle: string
  year: number | null
  plot: string
  runtime: number | null
  genres: string[]
  tags: string[]
  studio: string
  director: string
  actors: { name: string; role: string; thumb: string; sortOrder: number }[]
  rating: number | null
  uniqueIds: { type: string; id: string }[]
  posterPath: string
  fanartPath: string
  nfoPath: string
}

// ===== IPC Channel Constants =====

export const IPC_CHANNELS = {
  // Movie
  MOVIE_LIST: 'movie:list',
  MOVIE_DETAIL: 'movie:detail',
  MOVIE_UPDATE_RATING: 'movie:updateRating',
  MOVIE_TOGGLE_FAVORITE: 'movie:toggleFavorite',
  MOVIE_DELETE: 'movie:delete',

  // Scan
  SCAN_START: 'scan:start',
  SCAN_CANCEL: 'scan:cancel',
  SCAN_PROGRESS: 'scan:progress',

  // NFO Import
  NFO_IMPORT: 'nfo:import',
  NFO_IMPORT_FORCE: 'nfo:importForce',

  // Tags
  TAG_LIST: 'tag:list',
  TAG_CREATE: 'tag:create',
  TAG_DELETE: 'tag:delete',
  TAG_ADD_TO_MOVIE: 'tag:addToMovie',
  TAG_REMOVE_FROM_MOVIE: 'tag:removeFromMovie',

  // Settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  SETTINGS_GET_DIRECTORIES: 'settings:getDirectories',
  SETTINGS_ADD_DIRECTORY: 'settings:addDirectory',
  SETTINGS_REMOVE_DIRECTORY: 'settings:removeDirectory',
  SETTINGS_SELECT_DIRECTORY: 'settings:selectDirectory',
  SETTINGS_SELECT_FILE: 'settings:selectFile',

  // Custom Fields
  CUSTOM_FIELD_LIST: 'customField:list',
  CUSTOM_FIELD_CREATE: 'customField:create',
  CUSTOM_FIELD_DELETE: 'customField:delete',
  CUSTOM_FIELD_SET_VALUE: 'customField:setValue',

  // File operations
  FILE_OPEN_PLAYER: 'file:openPlayer',
  FILE_OPEN_DIRECTORY: 'file:openDirectory',

  // Genres
  GENRE_LIST: 'genre:list',

  // Actors
  ACTOR_LIST: 'actor:list',

  // Database
  DB_RESET: 'db:reset'
} as const
