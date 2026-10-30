import { app, BrowserWindow } from 'electron'
import { createMainWindow } from './window'
import { registerIpc } from './ipc'

app.whenReady().then(() => {
  registerIpc()
  createMainWindow({ macButtons: false })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow({ macButtons: false })
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
