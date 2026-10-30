// IPC contract between main and renderer. See docs/06-technical-architecture.md §4.
// Paths are always POSIX inside the app; drive letters are display-only.

export type Path = string

export interface Entry {
  name: string
  path: Path
  kind: 'file' | 'dir' | 'symlink' | 'package'
  size: number
  mtimeMs: number
  birthtimeMs: number
  hidden: boolean
  readonly: boolean
  ext: string
  cloud?: 'local' | 'cloud-only' | 'downloading'
  hasSubdirs?: boolean
}

export interface Volume {
  id: string
  name: string
  mount: Path
  letter: string
  kind: 'system' | 'external' | 'usb' | 'network' | 'image'
  fsType: string
  total: number
  free: number
  readonly: boolean
  ejectable: boolean
}

export interface PreviewData {
  kind: 'text' | 'image' | 'audio' | 'video' | 'pdf' | 'binary'
  mime?: string
  content?: string
  size?: number
  lineCount?: number
  truncated?: boolean
}

export interface OpProgress {
  opId: string
  kind: 'copy' | 'move' | 'delete'
  bytesDone: number
  bytesTotal: number
  itemsDone: number
  itemsTotal: number
  current: string
  speedBps: number
  state: 'running' | 'paused' | 'done' | 'error' | 'cancelled'
  error?: { code: string; path: string; message: string }
}

export type Conflict = 'replace' | 'skip' | 'keep-both' | 'ask'

export interface ConflictRequest {
  opId: string
  src: Entry
  dest: Entry
  remaining: number
}
export interface ConflictAnswer {
  choice: Exclude<Conflict, 'ask'> | 'cancel'
  applyToAll: boolean
}

// What an operation actually did, so the renderer can undo it.
export interface OpResult {
  state: 'done' | 'cancelled' | 'error'
  moved: { from: Path; to: Path }[]
  error?: OpProgress['error']
}

export interface TrashResult {
  from: Path
  // Where the item landed in the Trash, when the OS lets us find out (needed for Undo).
  trashedTo?: Path
}

export type SpecialLocation = 'thispc' | 'home' | 'gallery' | 'network' | 'trash'

export interface Places {
  home: Path
  desktop: Path
  downloads: Path
  documents: Path
  pictures: Path
  music: Path
  videos: Path
}

type Unsubscribe = () => void

export interface FileProperties {
  path: Path
  name: string
  kind: Entry['kind']
  ext: string
  size: number
  sizeOnDisk?: number
  locationWindows: string
  locationMac: string
  mtimeMs: number
  ctimeMs: number
  atimeMs: number
  readonly: boolean
  hidden: boolean
  posixMode?: string
  owner?: string
  itemCount?: { files: number; folders: number }
}

// Commands the native macOS menu bar sends to the focused window.
export type MenuCommand =
  | 'new-tab' | 'close-tab' | 'new-folder' | 'new-file' | 'rename' | 'trash' | 'undo'
  | 'cut' | 'copy' | 'paste' | 'select-all' | 'copy-path' | 'refresh' | 'back' | 'forward' | 'up'
  | 'go-home' | 'go-thispc' | 'go-downloads' | 'focus-address' | 'details-pane' | 'options'
  | 'view-details' | 'view-large' | 'view-list' | 'view-tiles' | 'view-content'

export interface KhojAPI {
  platform: NodeJS.Platform
  fs: {
    list(dir: Path, o?: { hidden?: boolean }): Promise<Entry[]>
    stat(p: Path): Promise<Entry>
    properties(p: Path): Promise<FileProperties>
    setAttributes(p: Path, attrs: { hidden?: boolean; readonly?: boolean }): Promise<void>
    readPreview(p: Path): Promise<PreviewData>
    computeHash(p: Path, algo?: 'sha256' | 'md5'): Promise<string>
    mkdir(parent: Path, name: string): Promise<Path>
    rename(p: Path, newName: string): Promise<Path>
    resolveInput(text: string): Promise<Path | SpecialLocation | null>
    places(): Promise<Places>
    // Recursive name search under `root`. Starting a new search cancels the previous one.
    search(root: Path, query: string, o?: { hidden?: boolean }): Promise<Entry[]>
    // Calls back (debounced) whenever something inside `dir` changes.
    watch(dir: Path, cb: () => void): Unsubscribe
  }
  clipboard: {
    // Puts files on the system pasteboard so Finder can paste them too.
    writeFiles(paths: Path[]): void
    readFiles(): Promise<Path[]>
  }
  app: {
    onMenu(cb: (command: MenuCommand) => void): Unsubscribe
    setMacButtons(on: boolean): void
    openPrivacySettings(pane: 'files' | 'fulldisk'): void
  }
  ops: {
    // Resolves when the whole job finishes; progress streams through onProgress meanwhile.
    copy(src: Path[], dest: Path, conflict: Conflict): Promise<OpResult>
    move(src: Path[], dest: Path, conflict: Conflict): Promise<OpResult>
    trash(paths: Path[]): Promise<TrashResult[]>
    deletePermanently(paths: Path[]): Promise<void>
    newFile(parent: Path, name: string): Promise<Path>
    compress(sources: Path[], destZip?: Path): Promise<Path>
    extract(zipPath: Path, destDir?: Path): Promise<Path>
    batchRename(renames: { from: Path; newName: string }[]): Promise<{ from: Path; to: Path }[]>
    emptyTrash(): Promise<void>
    pause(opId: string): void
    resume(opId: string): void
    cancel(opId: string): void
    onProgress(cb: (p: OpProgress) => void): Unsubscribe
    onConflict(cb: (c: ConflictRequest) => Promise<ConflictAnswer>): Unsubscribe
  }
  volumes: {
    list(): Promise<Volume[]>
    eject(id: string): Promise<void>
    onChange(cb: (v: Volume[]) => void): Unsubscribe
  }
  shell: {
    open(p: Path): Promise<void>
    openWith(p: Path): Promise<void>
    reveal(p: Path): void
    openTerminal(dir: Path): void
    copyPaths(paths: Path[], style: 'windows' | 'posix'): void
    startDrag(paths: Path[]): void
    pathForFile(file: File): string
  }
  window: {
    minimize(): void
    toggleMaximize(): void
    close(): void
    quickLook(p: Path): void
    onMaximized(cb: (maximized: boolean) => void): Unsubscribe
  }
  settings: {
    get<T>(key: string): Promise<T | undefined>
    set<T>(key: string, value: T): Promise<void>
  }
}

declare global {
  interface Window {
    khoj: KhojAPI
  }
}
