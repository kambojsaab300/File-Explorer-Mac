import { app, BrowserWindow, ipcMain, shell, type WebContents } from 'electron'
import * as clipboard from './services/clipboard.service'
import * as watch from './services/watch.service'
import { randomUUID } from 'node:crypto'
import { isAbsolute } from 'node:path'
import type { ConflictAnswer, ConflictRequest } from '@shared/types'
import * as fsService from './services/fs.service'
import * as ops from './services/ops.service'
import * as shellService from './services/shell.service'
import { getSetting, setSetting } from './services/settings.service'
import { ejectVolume, listVolumes, watchVolumes } from './services/volumes.service'

// The renderer is untrusted input: every path is checked before it reaches the file system.
function path(p: unknown): string {
  if (typeof p !== 'string' || !p || p.includes('\0') || !isAbsolute(p)) throw new Error('Invalid path')
  return p
}

function fileName(n: unknown): string {
  if (typeof n !== 'string' || !n.trim() || n.includes('\0') || n.includes('/') || n === '.' || n === '..') {
    throw new Error('Invalid name')
  }
  return n
}

const paths = (list: unknown): string[] => {
  if (!Array.isArray(list)) throw new Error('Invalid path list')
  return list.map(path)
}

// Conflict prompts are a round trip: main asks the window that started the job and
// waits for the user's choice in the Replace or Skip dialog.
const pendingConflicts = new Map<string, (a: ConflictAnswer) => void>()
const askConflict = (wc: WebContents) => (req: ConflictRequest) =>
  new Promise<ConflictAnswer>((resolve) => {
    const id = randomUUID()
    pendingConflicts.set(id, resolve)
    wc.send('ops:conflict', id, req)
  })

const CHOICES = new Set(['replace', 'skip', 'keep-both', 'cancel'])

export function registerIpc(): void {
  const fromSender = (e: Electron.IpcMainEvent): BrowserWindow | null => BrowserWindow.fromWebContents(e.sender)

  ipcMain.on('window:minimize', (e) => fromSender(e)?.minimize())
  ipcMain.on('window:close', (e) => fromSender(e)?.close())
  ipcMain.on('window:toggle-maximize', (e) => {
    const win = fromSender(e)
    if (!win) return
    if (win.isMaximized()) win.unmaximize()
    else win.maximize()
  })

  ipcMain.handle('fs:list', (_, dir, opts) => fsService.list(path(dir), { hidden: !!opts?.hidden }))
  ipcMain.handle('fs:stat', (_, p) => fsService.stat(path(p)))
  ipcMain.handle('fs:mkdir', (_, parent, name) => fsService.mkdir(path(parent), fileName(name)))
  ipcMain.handle('fs:rename', (_, p, name) => fsService.rename(path(p), fileName(name)))
  ipcMain.handle('fs:resolve-input', (_, text) => fsService.resolveInput(String(text ?? '')))
  ipcMain.handle('fs:places', () => fsService.places())

  ipcMain.handle('volumes:list', () => listVolumes())
  ipcMain.handle('volumes:eject', async (_, id) => {
    const vol = (await listVolumes()).find((v) => v.id === id)
    if (!vol?.ejectable) throw new Error('This drive cannot be ejected.')
    await ejectVolume(vol.mount)
  })
  watchVolumes((vols) => BrowserWindow.getAllWindows().forEach((w) => w.webContents.send('volumes:changed', vols)))

  ipcMain.handle('shell:open', (_, p) => shellService.open(path(p)))
  ipcMain.on('shell:reveal', (_, p) => shellService.reveal(path(p)))
  ipcMain.on('shell:open-terminal', (_, p) => shellService.openTerminal(path(p)))
  ipcMain.on('shell:copy-paths', (_, list, style) => void shellService.copyPaths(paths(list), style === 'posix' ? 'posix' : 'windows'))

  ipcMain.on('shell:start-drag', async (e, list) => {
    const files = paths(list)
    if (!files.length) return
    e.sender.startDrag({ file: files[0], files, icon: await app.getFileIcon(files[0], { size: 'normal' }) })
  })

  for (const kind of ['copy', 'move'] as const) {
    ipcMain.handle(`ops:${kind}`, (e, src, dest, conflict) =>
      ops.transfer(
        kind,
        paths(src),
        path(dest),
        ['replace', 'skip', 'keep-both'].includes(conflict) ? conflict : 'ask',
        (p) => !e.sender.isDestroyed() && e.sender.send('ops:progress', p),
        askConflict(e.sender)
      )
    )
  }
  ipcMain.on('ops:conflict-reply', (_, id, answer) => {
    const resolve = pendingConflicts.get(id)
    pendingConflicts.delete(id)
    resolve?.({ choice: CHOICES.has(answer?.choice) ? answer.choice : 'cancel', applyToAll: !!answer?.applyToAll })
  })
  ipcMain.handle('ops:trash', (_, list) => ops.trash(paths(list)))
  ipcMain.handle('ops:delete', (_, list) => ops.deletePermanently(paths(list)))
  ipcMain.handle('ops:new-file', (_, parent, name) => ops.newFile(path(parent), fileName(name)))
  ipcMain.on('ops:pause', (_, id) => ops.pause(String(id)))
  ipcMain.on('ops:resume', (_, id) => ops.resume(String(id)))
  ipcMain.on('ops:cancel', (_, id) => ops.cancel(String(id)))

  ipcMain.handle('fs:search', (_, root, query, opts) => watch.search(path(root), String(query ?? ''), !!opts?.hidden))

  // Watch subscriptions are keyed by an id the renderer picks, and dropped with the window.
  const unwatchers = new Map<string, () => void>()
  ipcMain.on('fs:watch', (e, id, dir) => {
    const key = `${e.sender.id}:${id}`
    const sender = e.sender
    unwatchers.set(key, watch.subscribe(path(dir), () => !sender.isDestroyed() && sender.send('fs:changed', id)))
    sender.once('destroyed', () => {
      unwatchers.get(key)?.()
      unwatchers.delete(key)
    })
  })
  ipcMain.on('fs:unwatch', (e, id) => {
    const key = `${e.sender.id}:${id}`
    unwatchers.get(key)?.()
    unwatchers.delete(key)
  })

  ipcMain.on('clipboard:write-files', (_, list) => clipboard.writeFiles(paths(list)))
  ipcMain.handle('clipboard:read-files', () => clipboard.readFiles())

  ipcMain.on('app:mac-buttons', (e, on) => {
    if (process.platform === 'darwin') fromSender(e)?.setWindowButtonVisibility(!!on)
  })
  ipcMain.on('app:privacy-settings', (_, pane) => {
    if (process.platform !== 'darwin') return
    const anchor = pane === 'fulldisk' ? 'Privacy_AllFiles' : 'Privacy_FilesAndFolders'
    void shell.openExternal(`x-apple.systempreferences:com.apple.preference.security?${anchor}`)
  })

  ipcMain.handle('settings:get', (_, key) => getSetting(String(key)))
  ipcMain.handle('settings:set', (_, key, value) => setSetting(String(key), value))
}
