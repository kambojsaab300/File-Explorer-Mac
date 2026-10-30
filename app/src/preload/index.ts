import { contextBridge, ipcRenderer } from 'electron'
import type { KhojAPI } from '@shared/types'

// Services land here as they are implemented; until then the renderer can
// feature-detect with `'fs' in window.khoj`.
const api: Pick<KhojAPI, 'platform' | 'window'> = {
  platform: process.platform,
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    toggleMaximize: () => ipcRenderer.send('window:toggle-maximize'),
    close: () => ipcRenderer.send('window:close'),
    onMaximized: (cb) => {
      const listener = (_: unknown, maximized: boolean): void => cb(maximized)
      ipcRenderer.on('window:maximized-changed', listener)
      return () => ipcRenderer.removeListener('window:maximized-changed', listener)
    }
  }
}

contextBridge.exposeInMainWorld('khoj', api)
