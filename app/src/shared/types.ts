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

export type SpecialLocation = 'thispc' | 'home' | 'gallery' | 'network' | 'trash'

type Unsubscribe = () => void

export interface KhojAPI {
  platform: NodeJS.Platform
  fs: {
    list(dir: Path, o?: { hidden?: boolean }): Promise<Entry[]>
    stat(p: Path): Promise<Entry>
    mkdir(parent: Path, name: string): Promise<Path>
    rename(p: Path, newName: string): Promise<Path>
    resolveInput(text: string): Promise<Path | SpecialLocation | null>
  }
  ops: {
    copy(src: Path[], dest: Path, conflict: Conflict): Promise<string>
    move(src: Path[], dest: Path, conflict: Conflict): Promise<string>
    trash(paths: Path[]): Promise<void>
    deletePermanently(paths: Path[]): Promise<void>
    pause(opId: string): void
    resume(opId: string): void
    cancel(opId: string): void
    onProgress(cb: (p: OpProgress) => void): Unsubscribe
  }
  volumes: {
    list(): Promise<Volume[]>
    eject(id: string): Promise<void>
    onChange(cb: (v: Volume[]) => void): Unsubscribe
  }
  shell: {
    open(p: Path): Promise<void>
    reveal(p: Path): void
    openTerminal(dir: Path): void
    copyPaths(paths: Path[], style: 'windows' | 'posix'): void
  }
  window: {
    minimize(): void
    toggleMaximize(): void
    close(): void
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
