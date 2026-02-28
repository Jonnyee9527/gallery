import { ipcMain, shell } from 'electron'
import { spawn } from 'child_process'
import path from 'path'
import { IPC_CHANNELS } from '../../shared/types'
import { getSetting } from '../database/dao/settingsDao'

export function registerFileHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.FILE_OPEN_PLAYER, (_event, filePath: string) => {
    const playerPath = getSetting('externalPlayerPath')
    if (playerPath) {
      spawn(playerPath, [filePath], { detached: true, stdio: 'ignore' }).unref()
    } else {
      shell.openPath(filePath)
    }
    return true
  })

  ipcMain.handle(IPC_CHANNELS.FILE_OPEN_DIRECTORY, (_event, filePath: string) => {
    const dir = path.dirname(filePath)
    shell.openPath(dir)
    return true
  })
}
