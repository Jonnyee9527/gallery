import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { IPC_CHANNELS } from '../shared/types'
import type {
  MovieFilter,
  Movie,
  MovieDetail,
  PaginatedResult,
  Tag,
  Directory,
  CustomField,
  ScanProgress,
  ScanStats
} from '../shared/types'

// Type-safe API exposed to renderer
const api = {
  // Movie
  getMovies: (filter: MovieFilter): Promise<PaginatedResult<Movie>> =>
    ipcRenderer.invoke(IPC_CHANNELS.MOVIE_LIST, filter),

  getMovieDetail: (id: number): Promise<MovieDetail | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.MOVIE_DETAIL, id),

  updateMovieRating: (movieId: number, rating: number): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.MOVIE_UPDATE_RATING, movieId, rating),

  toggleMovieFavorite: (movieId: number): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.MOVIE_TOGGLE_FAVORITE, movieId),

  deleteMovie: (movieId: number): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.MOVIE_DELETE, movieId),

  // Scan
  startScan: (): Promise<ScanStats> => ipcRenderer.invoke(IPC_CHANNELS.SCAN_START),

  cancelScan: (): Promise<boolean> => ipcRenderer.invoke(IPC_CHANNELS.SCAN_CANCEL),

  onScanProgress: (callback: (progress: ScanProgress) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, progress: ScanProgress): void =>
      callback(progress)
    ipcRenderer.on(IPC_CHANNELS.SCAN_PROGRESS, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.SCAN_PROGRESS, handler)
  },

  // Tags
  getTags: (): Promise<Tag[]> => ipcRenderer.invoke(IPC_CHANNELS.TAG_LIST),

  createTag: (name: string): Promise<Tag> => ipcRenderer.invoke(IPC_CHANNELS.TAG_CREATE, name),

  deleteTag: (tagId: number): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.TAG_DELETE, tagId),

  addTagToMovie: (movieId: number, tagId: number): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.TAG_ADD_TO_MOVIE, movieId, tagId),

  removeTagFromMovie: (movieId: number, tagId: number): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.TAG_REMOVE_FROM_MOVIE, movieId, tagId),

  // Settings
  getSetting: (key: string): Promise<string | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET, key),

  setSetting: (key: string, value: string): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET, key, value),

  getDirectories: (type?: 'nfo' | 'video'): Promise<Directory[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET_DIRECTORIES, type),

  addDirectory: (dir: { path: string; type: 'nfo' | 'video'; label: string }): Promise<Directory> =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_ADD_DIRECTORY, dir),

  removeDirectory: (id: number): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_REMOVE_DIRECTORY, id),

  selectDirectory: (): Promise<string | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SELECT_DIRECTORY),

  selectFile: (): Promise<string | null> => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SELECT_FILE),

  // Custom Fields
  getCustomFields: (): Promise<CustomField[]> => ipcRenderer.invoke(IPC_CHANNELS.CUSTOM_FIELD_LIST),

  createCustomField: (name: string, fieldType: string): Promise<CustomField> =>
    ipcRenderer.invoke(IPC_CHANNELS.CUSTOM_FIELD_CREATE, name, fieldType),

  deleteCustomField: (id: number): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.CUSTOM_FIELD_DELETE, id),

  setCustomFieldValue: (movieId: number, fieldId: number, value: string): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.CUSTOM_FIELD_SET_VALUE, movieId, fieldId, value),

  // File operations
  openPlayer: (filePath: string): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.FILE_OPEN_PLAYER, filePath),

  openDirectory: (filePath: string): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.FILE_OPEN_DIRECTORY, filePath),

  // Genres & Actors
  getGenres: (): Promise<{ id: number; name: string }[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.GENRE_LIST),

  getActors: (): Promise<{ id: number; name: string; thumb: string }[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.ACTOR_LIST),

  // Database
  resetDatabase: (): Promise<boolean> => ipcRenderer.invoke(IPC_CHANNELS.DB_RESET)
}

export type GalleryAPI = typeof api

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
