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
    properties: async (p) => {
      const e = entry(p, TREE[p] ? '/' : 1024)
      return {
        path: p,
        name: e.name,
        kind: e.kind,
        ext: e.ext,
        size: e.size,
        sizeOnDisk: 4096,
        locationWindows: 'C:\\Users\\you',
        locationMac: p,
        mtimeMs: e.mtimeMs,
        ctimeMs: e.birthtimeMs,
        atimeMs: e.mtimeMs,
        readonly: false,
        hidden: e.hidden,
        posixMode: '0755'
      }
    },
    setAttributes: async () => {},
    readPreview: async () => ({ kind: 'text', content: 'Mock preview content' }),
    computeHash: async () => 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    gitInfo: async () => ({ branch: 'main', root: HOME }),
    analyzeDisk: async (target) => ({
      rootPath: target,
      totalSize: 1_335_282_816,
      totalFiles: 42,
      totalFolders: 9,
      categories: {
        archives: { size: 1_298_000_000, count: 2, color: '#f97316', label: 'Archives' },
        documents: { size: 35_048_371, count: 6, color: '#eab308', label: 'Documents' },
        images: { size: 2_400_000, count: 4, color: '#22c55e', label: 'Images' },
        code: { size: 124_000, count: 18, color: '#3b82f6', label: 'Code & Dev' },
        video: { size: 0, count: 0, color: '#a855f7', label: 'Video' },
        audio: { size: 0, count: 0, color: '#06b6d4', label: 'Audio' },
        other: { size: 214_445, count: 12, color: '#94a3b8', label: 'Other & System' }
      },
      topFiles: [
        { name: 'Backup.zip', path: '/Volumes/MyDATA/Backup.zip', size: 1_200_000_000, extension: 'zip' },
        { name: 'Khoj-0.1.0.dmg', path: `${HOME}/Downloads/Khoj-0.1.0.dmg`, size: 98_000_000, extension: 'dmg' },
        { name: 'UI Issues.docx', path: '/Volumes/MyDATA/UI Issues.docx', size: 34_816, extension: 'docx' },
        { name: 'photo.jpg', path: `${HOME}/Downloads/photo.jpg`, size: 2_400_000, extension: 'jpg' },
        { name: 'Resume.pdf', path: `${HOME}/Documents/Resume.pdf`, size: 182_004, extension: 'pdf' },
        { name: 'Budget 2026.xlsx', path: `${HOME}/Documents/Budget 2026.xlsx`, size: 48_211, extension: 'xlsx' }
      ],
      tree: {
        name: baseName(target) || target,
        path: target,
        size: 1_335_282_816,
        kind: 'dir',
        extension: '',
        itemCount: 51,
        children: [
          { name: 'Backup.zip', path: `${target}/Backup.zip`, size: 1_200_000_000, kind: 'file', extension: 'zip' },
          {
            name: 'Dev',
            path: `${target}/Dev`,
            size: 102_000_000,
            kind: 'dir',
            extension: '',
            itemCount: 22,
            children: [
              { name: 'khoj', path: `${target}/Dev/khoj`, size: 98_000_000, kind: 'dir', extension: '', itemCount: 18 },
              { name: 'notes.md', path: `${target}/Dev/notes.md`, size: 4_096, kind: 'file', extension: 'md' },
              { name: 'deploy.sh', path: `${target}/Dev/deploy.sh`, size: 812, kind: 'file', extension: 'sh' }
            ]
          },
          { name: 'UI Issues.docx', path: `${target}/UI Issues.docx`, size: 34_816, kind: 'file', extension: 'docx' },
          { name: 'Projects', path: `${target}/Projects`, size: 33_248_000, kind: 'dir', extension: '', itemCount: 14 }
        ]
      }
    }),
    mkdir: async (parent, name) => joinPath(parent, name),
    createSymlink: async (target, linkPath) => linkPath,
    rename: async (p, name) => joinPath(p.slice(0, p.lastIndexOf('/')) || '/', name),
    resolveInput: async (text) => {
      const p = parseDisplay(text, VOLUMES, HOME)
      return p && p.includes('/') && !TREE[p] ? null : p
    },
    places: async () => ({
      home: HOME, desktop: `${HOME}/Desktop`, downloads: `${HOME}/Downloads`, documents: `${HOME}/Documents`,
      pictures: `${HOME}/Pictures`, music: `${HOME}/Music`, videos: `${HOME}/Movies`
    }),
    search: async (root, query) => {
      const q = query.toLowerCase()
      return Object.entries(TREE)
        .filter(([dir]) => dir === root || dir.startsWith(root + '/'))
        .flatMap(([dir, kids]) => Object.entries(kids).map(([n, v]) => entry(joinPath(dir, n), v)))
        .filter((e) => e.name.toLowerCase().includes(q))
    },
    watch: () => () => {}
  },
  clipboard: { writeFiles: () => {}, readFiles: async () => [] },
  app: { onMenu: () => () => {}, setMacButtons: () => {}, openPrivacySettings: note('privacy settings') },
  // The mock disk is read-only; file operations report success without changing anything.
  ops: {
    copy: async () => ({ state: 'done', moved: [] }),
    move: async () => ({ state: 'done', moved: [] }),
    trash: async (paths) => paths.map((from) => ({ from })),
    deletePermanently: async () => {},
    newFile: async (parent, name) => joinPath(parent, name),
    compress: async (paths, dest) => dest ?? `${paths[0]}.zip`,
    extract: async (p, dest) => dest ?? p.replace(/\.zip$/, ''),
    batchRename: async (renames) =>
      renames.map((r) => ({
        from: r.from,
        to: joinPath(r.from.slice(0, r.from.lastIndexOf('/')) || '/', r.newName)
      })),
    emptyTrash: async () => {},
    pause: () => {}, resume: () => {}, cancel: () => {},
    onProgress: () => () => {},
    onConflict: () => () => {}
  },
  volumes: { list: async () => sim(VOLUMES), eject: async () => note('eject')(), onChange: () => () => {} },
  shell: { open: async () => note('open')(), openWith: async () => note('open with')(), reveal: note('reveal'), openTerminal: note('terminal'), share: note('share'), copyPaths: note('copy as path'), startDrag: () => {}, pathForFile: () => '' },
  window: { newWindow: () => {}, minimize: () => {}, toggleMaximize: () => {}, close: () => {}, quickLook: note('quick look'), onMaximized: () => () => {} },
  settings: { get: async () => undefined, set: async () => {} },
  terminal: {
    exec: async (cmd, cwd = '/Volumes/MyDATA/Dev') => {
      const trimmed = cmd.trim()
      if (trimmed === 'pwd') return { stdout: `${cwd}\n`, stderr: '', code: 0, cwd }
      if (trimmed === 'git status') return { stdout: 'On branch main\nYour branch is up to date with \'origin/main\'.\n\nnothing to commit, working tree clean\n', stderr: '', code: 0, cwd }
      if (trimmed === 'ls' || trimmed === 'dir') return { stdout: 'khoj\nnotes.md\ndeploy.sh\nUI Issues.docx\nBackup.zip\n', stderr: '', code: 0, cwd }
      if (trimmed.startsWith('cd ')) {
        const next = trimmed.slice(3).trim()
        return { stdout: '', stderr: '', code: 0, cwd: next.startsWith('/') ? next : `${cwd}/${next}` }
      }
      return { stdout: `[khoj-terminal] Executed: ${cmd}\n`, stderr: '', code: 0, cwd }
    },
    setCwd: async (cwd) => cwd,
    getCwd: async () => '/Volumes/MyDATA/Dev',
    getDefaultShell: async () => '/bin/zsh'
  }
}
