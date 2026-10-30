// Stand-in for the main process when the UI runs in a plain browser (vite dev
// without Electron). Mirrors a small slice of the prototype's mock disk.
import type { Entry, KhojAPI, Volume } from '@shared/types'
import { baseName, extOf, joinPath, parseDisplay } from '@shared/paths'

const GB = 1024 ** 3
const HOME = '/Users/you'
const now = Date.now()

const VOLUMES: Volume[] = [
  { id: '/', name: 'Macintosh HD', mount: '/', letter: 'C', kind: 'system', fsType: 'apfs', total: 374 * GB, free: 110 * GB, readonly: false, ejectable: false },
  { id: '/Volumes/MyDATA', name: 'MyDATA', mount: '/Volumes/MyDATA', letter: 'E', kind: 'external', fsType: 'exfat', total: 99.9 * GB, free: 59 * GB, readonly: false, ejectable: true },
  { id: '/Volumes/BACKUP', name: 'BACKUP', mount: '/Volumes/BACKUP', letter: 'F', kind: 'usb', fsType: 'exfat', total: 29.8 * GB, free: 2.1 * GB, readonly: false, ejectable: true }
]

// Directory -> children; a trailing "/" marks a folder, a number is the file size.
const TREE: Record<string, Record<string, number | '/'>> = {
  '/': { Applications: '/', Users: '/', Library: '/' },
  '/Users': { you: '/' },
  [HOME]: { Desktop: '/', Documents: '/', Downloads: '/', Movies: '/', Music: '/', Pictures: '/' },
  [`${HOME}/Documents`]: { 'Budget 2026.xlsx': 48_211, 'Notes.txt': 2_140, 'Resume.pdf': 182_004 },
  [`${HOME}/Downloads`]: { 'Khoj-0.1.0.dmg': 98_000_000, 'photo.jpg': 2_400_000 },
  '/Volumes/MyDATA': { Dev: '/', Projects: '/', 'UI Issues.docx': 34_816, 'Backup.zip': 1_200_000_000 },
  '/Volumes/MyDATA/Dev': { khoj: '/', 'notes.md': 4_096, 'deploy.sh': 812 },
  '/Volumes/BACKUP': { 'Old Photos': '/' }
}

function entry(path: string, v: number | '/'): Entry {
  const name = baseName(path)
  const dir = v === '/'
  return {
    name, path, kind: dir ? 'dir' : 'file', ext: dir ? '' : extOf(name), size: dir ? 0 : v,
    mtimeMs: now - (name.length % 9) * 86_400_000, birthtimeMs: now - 90 * 86_400_000,
    hidden: name.startsWith('.'), readonly: false
  }
}

const sim = <T>(v: T): Promise<T> => new Promise((r) => setTimeout(() => r(v), 30))
const note = (what: string) => () => console.info(`[mock] ${what} needs the real app`)

export const mockApi: KhojAPI = {
  platform: 'darwin',
  fs: {
    list: async (dir) => sim(Object.entries(TREE[dir] ?? {}).map(([n, v]) => entry(joinPath(dir, n), v))),
    stat: async (p) => sim(entry(p, '/')),
    mkdir: async (parent, name) => joinPath(parent, name),
    rename: async (p, name) => joinPath(p.slice(0, p.lastIndexOf('/')) || '/', name),
    resolveInput: async (text) => {
      const p = parseDisplay(text, VOLUMES, HOME)
      return p && p.includes('/') && !TREE[p] ? null : p
    },
    places: async () => ({
      home: HOME, desktop: `${HOME}/Desktop`, downloads: `${HOME}/Downloads`, documents: `${HOME}/Documents`,
      pictures: `${HOME}/Pictures`, music: `${HOME}/Music`, videos: `${HOME}/Movies`
    })
  },
  // The mock disk is read-only; file operations report success without changing anything.
  ops: {
    copy: async () => ({ state: 'done', moved: [] }),
    move: async () => ({ state: 'done', moved: [] }),
    trash: async (paths) => paths.map((from) => ({ from })),
    deletePermanently: async () => {},
    newFile: async (parent, name) => joinPath(parent, name),
    pause: () => {}, resume: () => {}, cancel: () => {},
    onProgress: () => () => {},
    onConflict: () => () => {}
  },
  volumes: { list: async () => sim(VOLUMES), eject: async () => note('eject')(), onChange: () => () => {} },
  shell: { open: async () => note('open')(), reveal: note('reveal'), openTerminal: note('terminal'), copyPaths: note('copy as path'), startDrag: () => {}, pathForFile: () => '' },
  window: { minimize: () => {}, toggleMaximize: () => {}, close: () => {}, onMaximized: () => () => {} },
  settings: { get: async () => undefined, set: async () => {} }
}
