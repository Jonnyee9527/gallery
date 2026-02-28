import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/types'
import {
  getAllTags,
  createTag,
  deleteTag,
  addTagToMovie,
  removeTagFromMovie
} from '../database/dao/tagDao'

export function registerTagHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.TAG_LIST, () => {
    return getAllTags()
  })

  ipcMain.handle(IPC_CHANNELS.TAG_CREATE, (_event, name: string) => {
    return createTag(name, true)
  })

  ipcMain.handle(IPC_CHANNELS.TAG_DELETE, (_event, tagId: number) => {
    deleteTag(tagId)
    return true
  })

  ipcMain.handle(IPC_CHANNELS.TAG_ADD_TO_MOVIE, (_event, movieId: number, tagId: number) => {
    addTagToMovie(movieId, tagId)
    return true
  })

  ipcMain.handle(IPC_CHANNELS.TAG_REMOVE_FROM_MOVIE, (_event, movieId: number, tagId: number) => {
    removeTagFromMovie(movieId, tagId)
    return true
  })
}
