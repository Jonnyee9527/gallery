import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/types'
import { startScan, cancelScan } from '../scanner/scanManager'

export function registerScanHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.SCAN_START, async () => {
    return await startScan()
  })

  ipcMain.handle(IPC_CHANNELS.SCAN_CANCEL, () => {
    cancelScan()
    return true
  })
}
