import { BrowserWindow, nativeTheme, shell } from 'electron'
import { join } from 'node:path'

export function createMainWindow(opts: { macButtons: boolean }): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 640,
    minHeight: 400,
    // We draw Windows-style chrome ourselves; the OS title bar has to go.
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 14, y: 10 },
    ...(process.platform === 'darwin'
      ? { vibrancy: 'under-window' as const, visualEffectState: 'followWindow' as const }
      : {}),
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#202020' : '#F3F3F3',
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      spellcheck: false
    }
  })

  if (process.platform === 'darwin') win.setWindowButtonVisibility(opts.macButtons)

  win.once('ready-to-show', () => win.show())
  win.on('maximize', () => win.webContents.send('window:maximized-changed', true))
  win.on('unmaximize', () => win.webContents.send('window:maximized-changed', false))

  // The app never loads remote content.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url)
    return { action: 'deny' }
  })
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('http://localhost')) e.preventDefault()
  })

  if (process.env.ELECTRON_RENDERER_URL) win.loadURL(process.env.ELECTRON_RENDERER_URL)
  else win.loadFile(join(__dirname, '../renderer/index.html'))

  return win
}
