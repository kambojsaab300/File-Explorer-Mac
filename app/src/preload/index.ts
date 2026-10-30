import { contextBridge, ipcRenderer, webUtils } from 'electron'
import type { KhojAPI } from '@shared/types'

function subscribe<T>(channel: string, cb: (value: T) => void): () => void {
  const listener = (_: unknown, value: T): void => cb(value)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

let watchSeq = 0

const api: KhojAPI = {
  platform: process.platform,
  fs: {
    list: (dir, o) => ipcRenderer.invoke('fs:list', dir, o),
    stat: (p) => ipcRenderer.invoke('fs:stat', p),
    properties: (p) => ipcRenderer.invoke('fs:properties', p),
    setAttributes: (p, attrs) => ipcRenderer.invoke('fs:set-attributes', p, attrs),
    readPreview: (p) => ipcRenderer.invoke('fs:read-preview', p),
    computeHash: (p, algo) => ipcRenderer.invoke('fs:hash', p, algo),
    gitInfo: (dir) => ipcRenderer.invoke('fs:git-info', dir),
    mkdir: (parent, name) => ipcRenderer.invoke('fs:mkdir', parent, name),
    createSymlink: (target, linkPath) => ipcRenderer.invoke('fs:create-symlink', target, linkPath),
    rename: (p, name) => ipcRenderer.invoke('fs:rename', p, name),
    resolveInput: (text) => ipcRenderer.invoke('fs:resolve-input', text),
    places: () => ipcRenderer.invoke('fs:places'),
    search: (root, query, o) => ipcRenderer.invoke('fs:search', root, query, o),
    watch: (dir, cb) => {
      const id = String(++watchSeq)
      const listener = (_: unknown, changed: string): void => {
        if (changed === id) cb()
      }
      ipcRenderer.on('fs:changed', listener)
      ipcRenderer.send('fs:watch', id, dir)
      return () => {
        ipcRenderer.removeListener('fs:changed', listener)
        ipcRenderer.send('fs:unwatch', id)
      }
    }
  },
  clipboard: {
    writeFiles: (paths) => ipcRenderer.send('clipboard:write-files', paths),
    readFiles: () => ipcRenderer.invoke('clipboard:read-files')
  },
  app: {
    onMenu: (cb) => subscribe('menu:command', cb),
    setMacButtons: (on) => ipcRenderer.send('app:mac-buttons', on),
    openPrivacySettings: (pane) => ipcRenderer.send('app:privacy-settings', pane)
  },
  ops: {
    copy: (src, dest, conflict) => ipcRenderer.invoke('ops:copy', src, dest, conflict),
    move: (src, dest, conflict) => ipcRenderer.invoke('ops:move', src, dest, conflict),
    trash: (paths) => ipcRenderer.invoke('ops:trash', paths),
    deletePermanently: (paths) => ipcRenderer.invoke('ops:delete', paths),
    newFile: (parent, name) => ipcRenderer.invoke('ops:new-file', parent, name),
    compress: (sources, destZip) => ipcRenderer.invoke('ops:compress', sources, destZip),
    extract: (zipPath, destDir) => ipcRenderer.invoke('ops:extract', zipPath, destDir),
    batchRename: (renames) => ipcRenderer.invoke('ops:batch-rename', renames),
    emptyTrash: () => ipcRenderer.invoke('ops:empty-trash'),
    pause: (id) => ipcRenderer.send('ops:pause', id),
    resume: (id) => ipcRenderer.send('ops:resume', id),
    cancel: (id) => ipcRenderer.send('ops:cancel', id),
    onProgress: (cb) => subscribe('ops:progress', cb),
    onConflict: (cb) => {
      const listener = async (_: unknown, id: string, req: Parameters<typeof cb>[0]): Promise<void> => {
        ipcRenderer.send('ops:conflict-reply', id, await cb(req))
      }
      ipcRenderer.on('ops:conflict', listener)
      return () => ipcRenderer.removeListener('ops:conflict', listener)
    }
  },
  volumes: {
    list: () => ipcRenderer.invoke('volumes:list'),
    eject: (id) => ipcRenderer.invoke('volumes:eject', id),
    onChange: (cb) => subscribe('volumes:changed', cb)
  },
  shell: {
    open: (p) => ipcRenderer.invoke('shell:open', p),
    openWith: (p) => ipcRenderer.invoke('shell:open-with', p),
    reveal: (p) => ipcRenderer.send('shell:reveal', p),
    openTerminal: (dir) => ipcRenderer.send('shell:open-terminal', dir),
    share: (paths) => ipcRenderer.send('shell:share', paths),
    copyPaths: (paths, style) => ipcRenderer.send('shell:copy-paths', paths, style),
    startDrag: (paths) => ipcRenderer.send('shell:start-drag', paths),
    // File.path is gone in modern Electron; this is the supported way to get a dropped file's path.
    pathForFile: (file) => webUtils.getPathForFile(file).replace(/\\/g, '/')
  },
  window: {
    newWindow: () => ipcRenderer.send('window:new'),
    minimize: () => ipcRenderer.send('window:minimize'),
    toggleMaximize: () => ipcRenderer.send('window:toggle-maximize'),
    close: () => ipcRenderer.send('window:close'),
    quickLook: (p) => ipcRenderer.send('window:quick-look', p),
    onMaximized: (cb) => subscribe('window:maximized-changed', cb)
  },
  settings: {
    get: (key) => ipcRenderer.invoke('settings:get', key),
    set: (key, value) => ipcRenderer.invoke('settings:set', key, value)
  }
}

contextBridge.exposeInMainWorld('khoj', api)
