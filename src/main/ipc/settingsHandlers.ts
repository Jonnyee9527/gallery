import { ipcMain, dialog, BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '../../shared/types'
import {
  getSetting,
  setSetting,
  getDirectories,
  addDirectory,
  removeDirectory,
  getCustomFields,
  createCustomField,
  deleteCustomField,
  setCustomFieldValue,
  getAllGenres,
  getAllActors
} from '../database/dao/settingsDao'
import { resetDatabase } from '../database/index'

export function registerSettingsHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, (_event, key: string) => {
    return getSetting(key)
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS_SET, (_event, key: string, value: string) => {
    setSetting(key, value)
    return true
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET_DIRECTORIES, (_event, type?: 'nfo' | 'video') => {
    return getDirectories(type)
  })

  ipcMain.handle(
    IPC_CHANNELS.SETTINGS_ADD_DIRECTORY,
    (_event, dir: { path: string; type: 'nfo' | 'video'; label: string }) => {
      return addDirectory(dir)
    }
  )

  ipcMain.handle(IPC_CHANNELS.SETTINGS_REMOVE_DIRECTORY, (_event, id: number) => {
    removeDirectory(id)
    return true
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS_SELECT_DIRECTORY, async () => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return null
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS_SELECT_FILE, async () => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return null
    const result = await dialog.showOpenDialog(win, {
      properties: ['openFile'],
      filters: [{ name: 'Executable', extensions: ['exe', 'app', ''] }]
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  // Custom Fields
  ipcMain.handle(IPC_CHANNELS.CUSTOM_FIELD_LIST, () => {
    return getCustomFields()
  })

  ipcMain.handle(IPC_CHANNELS.CUSTOM_FIELD_CREATE, (_event, name: string, fieldType: string) => {
    return createCustomField(name, fieldType)
  })

  ipcMain.handle(IPC_CHANNELS.CUSTOM_FIELD_DELETE, (_event, id: number) => {
    deleteCustomField(id)
    return true
  })

  ipcMain.handle(
    IPC_CHANNELS.CUSTOM_FIELD_SET_VALUE,
    (_event, movieId: number, fieldId: number, value: string) => {
      setCustomFieldValue(movieId, fieldId, value)
      return true
    }
  )

  // Genres & Actors
  ipcMain.handle(IPC_CHANNELS.GENRE_LIST, () => {
    return getAllGenres()
  })

  ipcMain.handle(IPC_CHANNELS.ACTOR_LIST, () => {
    return getAllActors()
  })

  // Database operations
  ipcMain.handle(IPC_CHANNELS.DB_RESET, () => {
    resetDatabase()
    return true
  })
}
