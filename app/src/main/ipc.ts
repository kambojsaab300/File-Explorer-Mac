import { BrowserWindow, ipcMain } from 'electron'

// Every channel the renderer can reach is registered here, so argument
// validation has one home as the services are added.
export function registerIpc(): void {
  const fromSender = (e: Electron.IpcMainEvent): BrowserWindow | null =>
    BrowserWindow.fromWebContents(e.sender)

  ipcMain.on('window:minimize', (e) => fromSender(e)?.minimize())
  ipcMain.on('window:close', (e) => fromSender(e)?.close())
  ipcMain.on('window:toggle-maximize', (e) => {
    const win = fromSender(e)
    if (!win) return
    if (win.isMaximized()) win.unmaximize()
    else win.maximize()
  })
}
