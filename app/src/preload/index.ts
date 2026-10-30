import { contextBridge, ipcRenderer } from 'electron'
import type { KhojAPI } from '@shared/types'

function subscribe<T>(channel: string, cb: (value: T) => void): () => void {
  const listener = (_: unknown, value: T): void => cb(value)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

// `ops` arrives with Phase 2 (copy / move / trash).
const api: Omit<KhojAPI, 'ops'> = {
  platform: process.platform,
  fs: {
    list: (dir, o) => ipcRenderer.invoke('fs:list', dir, o),
    stat: (p) => ipcRenderer.invoke('fs:stat', p),
    mkdir: (parent, name) => ipcRenderer.invoke('fs:mkdir', parent, name),
    rename: (p, name) => ipcRenderer.invoke('fs:rename', p, name),
    resolveInput: (text) => ipcRenderer.invoke('fs:resolve-input', text),
    places: () => ipcRenderer.invoke('fs:places')
  },
  volumes: {
    list: () => ipcRenderer.invoke('volumes:list'),
    eject: (id) => ipcRenderer.invoke('volumes:eject', id),
    onChange: (cb) => subscribe('volumes:changed', cb)
  },
  shell: {
    open: (p) => ipcRenderer.invoke('shell:open', p),
    reveal: (p) => ipcRenderer.send('shell:reveal', p),
    openTerminal: (dir) => ipcRenderer.send('shell:open-terminal', dir),
    copyPaths: (paths, style) => ipcRenderer.send('shell:copy-paths', paths, style)
  },
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    toggleMaximize: () => ipcRenderer.send('window:toggle-maximize'),
    close: () => ipcRenderer.send('window:close'),
    onMaximized: (cb) => subscribe('window:maximized-changed', cb)
  },
  settings: {
    get: (key) => ipcRenderer.invoke('settings:get', key),
    set: (key, value) => ipcRenderer.invoke('settings:set', key, value)
  }
}

contextBridge.exposeInMainWorld('khoj', api)
