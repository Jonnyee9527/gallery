import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/types'
import { startScan, cancelScan, importNfo } from '../scanner/scanManager'

export function registerScanHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.SCAN_START, async () => {
    return await startScan()
  })

  ipcMain.handle(IPC_CHANNELS.SCAN_CANCEL, () => {
    cancelScan()
    return true
  })

  // NFO 导入（首次，冲突项不覆盖）
  ipcMain.handle(IPC_CHANNELS.NFO_IMPORT, async () => {
    return await importNfo()
  })

  // NFO 强制覆盖（传入要覆盖的 movieId 列表）
  ipcMain.handle(IPC_CHANNELS.NFO_IMPORT_FORCE, async (_event, movieIds: number[]) => {
    return await importNfo(movieIds)
  })
}
