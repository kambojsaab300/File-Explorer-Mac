import { app, BrowserWindow } from 'electron'
import { createMainWindow } from './window'
import { registerIpc } from './ipc'
import { buildMenu } from './menu'
import { getSetting } from './services/settings.service'

// Native desktop graphics & I/O performance switches
app.commandLine.appendSwitch('enable-gpu-rasterization')
app.commandLine.appendSwitch('enable-zero-copy')
app.commandLine.appendSwitch('disable-renderer-backgrounding')
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows')
app.commandLine.appendSwitch('ignore-gpu-blocklist')

const open = (): BrowserWindow => createMainWindow({ macButtons: getSetting<boolean>('macButtons') ?? false })

app.whenReady().then(() => {
  registerIpc()
  buildMenu()
  open()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) open()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
