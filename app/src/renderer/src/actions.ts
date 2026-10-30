// File operations as the user sees them: clipboard, Undo, rename, delete and the
// dialogs they open. The explorer store (store.ts) stays focused on navigation.
import { create } from 'zustand'
import type { ConflictAnswer, ConflictRequest, Entry, OpProgress, OpResult, Path } from '@shared/types'
import { baseName, isSpecial, parentOf, variantName, volumeOf } from '@shared/paths'
import { api } from './api/client'
import { locOf, useStore, visibleEntries } from './store'

type UndoRecord =
  | { type: 'rename'; from: Path; to: Path }
  | { type: 'create'; path: Path }
  | { type: 'copy'; created: Path[] }
  | { type: 'move'; moved: { from: Path; to: Path }[] }
  | { type: 'trash'; items: { from: Path; trashedTo: Path }[] }

export interface MenuState {
  x: number
  y: number
  kind: 'item' | 'background' | 'new'
}

interface OpsState {
  clipboard: { paths: Path[]; cut: boolean } | null
  undoStack: UndoRecord[]
  renaming: Path | null
  progress: OpProgress | null
  conflict: { req: ConflictRequest; resolve: (a: ConflictAnswer) => void } | null
  confirm: { title: string; message: string; yes: string; onYes: () => void } | null
  error: string | null
  menu: MenuState | null
}

export const useOps = create<OpsState>(() => ({
  clipboard: null,
  undoStack: [],
  renaming: null,
  progress: null,
  conflict: null,
  confirm: null,
  error: null,
  menu: null
}))

const set = useOps.setState
const pushUndo = (r: UndoRecord): void => set((s) => ({ undoStack: [...s.undoStack.slice(-49), r] }))
const refresh = (): void => useStore.getState().refresh()

function tab() {
  const s = useStore.getState()
  return s.tabs[s.active]
}

// The folder the user is looking at, or null on pages like This PC where files can't be created.
export function currentDir(): Path | null {
  const loc = locOf(tab())
  return isSpecial(loc) ? null : loc
}

export const selectedPaths = (): Path[] => tab().sel
export const selectedEntries = (): Entry[] => visibleEntries(tab()).filter((e) => tab().sel.includes(e.path))

export function explain(e: unknown): string {
  const err = e as { code?: string; message?: string }
  const text = `${err?.code ?? ''} ${err?.message ?? e}`
  if (/EACCES|EPERM/.test(text)) return 'You need permission to perform this action. Check Privacy & Security settings on your Mac.'
  if (/ENOSPC/.test(text)) return 'There is not enough space on the destination drive.'
  if (/EROFS/.test(text)) return 'The disk is write-protected.'
  if (/ENAMETOOLONG/.test(text)) return 'The file name is too long.'
  if (/EEXIST/.test(text)) return 'There is already a file with the same name in this location.'
  if (/EBUSY/.test(text)) return 'The action can’t be completed because the file is open in another app.'
  return err?.message ?? String(e)
}

const fail = (e: unknown): void => set({ error: explain(e) })

// Wire main-process events into dialogs once, at startup.
export function initOps(): void {
  api.ops.onProgress((p) => set({ progress: p.state === 'running' ? p : null }))
  api.ops.onConflict((req) => new Promise((resolve) => set({ conflict: { req, resolve } })))
}

function uniqueIn(dir: Entry[], name: string): string {
  const taken = new Set(dir.map((e) => e.name.toLowerCase()))
  if (!taken.has(name.toLowerCase())) return name
  for (let n = 1; ; n++) {
    const candidate = variantName(name, 'number', n)
    if (!taken.has(candidate.toLowerCase())) return candidate
  }
}

async function createThen(make: (dir: Path, name: string) => Promise<Path>, name: string): Promise<void> {
  const dir = currentDir()
  if (!dir) return
  try {
    const path = await make(dir, uniqueIn(tab().items, name))
    pushUndo({ type: 'create', path })
    refresh()
    useStore.getState().select([path], path)
    set({ renaming: path })
  } catch (e) {
    fail(e)
  }
}

export const newFolder = (): Promise<void> => createThen(api.fs.mkdir, 'New folder')
export const newTextFile = (): Promise<void> => createThen(api.ops.newFile, 'New Text Document.txt')

export function startRename(): void {
  const sel = selectedPaths()
  if (sel.length === 1 && currentDir()) set({ renaming: sel[0] })
}

const INVALID = /[\\/:*?"<>|]/

export async function commitRename(path: Path, newName: string): Promise<void> {
  set({ renaming: null })
  const name = newName.trim()
  if (!name || name === baseName(path)) return
  if (INVALID.test(name)) return fail('A file name can’t contain any of the following characters: \\ / : * ? " < > |')
  try {
    const to = await api.fs.rename(path, name)
    pushUndo({ type: 'rename', from: path, to })
    refresh()
    useStore.getState().select([to], to)
  } catch (e) {
    fail(e)
  }
}

export function copy(cut = false): void {
  const paths = selectedPaths().filter((p) => !isSpecial(p))
  if (!paths.length) return
  set({ clipboard: { paths, cut } })
  // Also on the system pasteboard so ⌘V works in Finder (Finder pastes it as a copy).
  api.clipboard.writeFiles(paths)
}

export async function transfer(kind: 'copy' | 'move', src: Path[], dest: Path): Promise<OpResult | null> {
  if (!src.length) return null
  try {
    const result = await (kind === 'copy' ? api.ops.copy : api.ops.move)(src, dest, 'ask')
    set({ progress: null })
    if (result.moved.length) pushUndo(kind === 'copy' ? { type: 'copy', created: result.moved.map((m) => m.to) } : { type: 'move', moved: result.moved })
    if (result.state === 'error') fail(result.error)
    refresh()
    return result
  } catch (e) {
    set({ progress: null })
    fail(e)
    return null
  }
}

export async function paste(dest = currentDir()): Promise<void> {
  if (!dest) return
  let { clipboard } = useOps.getState()
  // Files copied in Finder after our own copy win, the same as any other app's clipboard.
  const fromFinder = await api.clipboard.readFiles().catch(() => [])
  if (fromFinder.length && fromFinder.join('\0') !== clipboard?.paths.join('\0')) clipboard = { paths: fromFinder, cut: false }
  if (!clipboard) return
  const result = await transfer(clipboard.cut ? 'move' : 'copy', clipboard.paths, dest)
  // A cut is used up once it lands; a copy can be pasted again.
  if (clipboard.cut && result?.state === 'done') set({ clipboard: null })
}

// Windows drag rule: same drive moves, another drive copies. Option forces copy, ⌘/Shift forces move.
export function dropKind(src: Path[], dest: Path, e: { altKey: boolean; metaKey: boolean; shiftKey: boolean }): 'copy' | 'move' {
  if (e.altKey) return 'copy'
  if (e.metaKey || e.shiftKey) return 'move'
  const vols = useStore.getState().volumes
  const destVol = volumeOf(dest, vols)?.id
  return src.every((p) => volumeOf(p, vols)?.id === destVol) ? 'move' : 'copy'
}

export async function deleteSelected(permanent = false): Promise<void> {
  const paths = selectedPaths().filter((p) => !isSpecial(p))
  if (!paths.length || !currentDir()) return

  if (permanent) {
    const what = paths.length === 1 ? `“${baseName(paths[0])}”` : `these ${paths.length} items`
    set({
      confirm: {
        title: 'Delete permanently?',
        message: `Are you sure you want to permanently delete ${what}? This can’t be undone.`,
        yes: 'Delete',
        onYes: () => void api.ops.deletePermanently(paths).then(refresh, fail)
      }
    })
    return
  }

  try {
    const results = await api.ops.trash(paths)
    const items = results.filter((r): r is { from: Path; trashedTo: Path } => !!r.trashedTo)
    if (items.length) pushUndo({ type: 'trash', items })
  } catch (e) {
    fail(e)
  }
  useStore.getState().select([], null)
  refresh()
}

// Puts `path` back at `original`, moving across drives and restoring the old name if needed.
async function putBack(path: Path, original: Path): Promise<void> {
  const dir = parentOf(original) ?? '/'
  const result = await api.ops.move([path], dir, 'keep-both')
  const landed = result.moved[0]?.to ?? path
  if (baseName(landed) !== baseName(original)) await api.fs.rename(landed, baseName(original)).catch(() => {})
}

export async function undo(): Promise<void> {
  const stack = useOps.getState().undoStack
  const last = stack[stack.length - 1]
  if (!last) return
  set({ undoStack: stack.slice(0, -1) })
  try {
    switch (last.type) {
      case 'rename':
        await api.fs.rename(last.to, baseName(last.from))
        break
      case 'create':
        await api.ops.trash([last.path])
        break
      case 'copy':
        await api.ops.trash(last.created)
        break
      case 'move':
        for (const m of [...last.moved].reverse()) await putBack(m.to, m.from)
        break
      case 'trash':
        for (const t of last.items) await putBack(t.trashedTo, t.from)
        break
    }
  } catch (e) {
    fail(e)
  }
  refresh()
}

export function copyAsPath(): void {
  const paths = selectedPaths().filter((p) => !isSpecial(p))
  const dir = currentDir()
  api.shell.copyPaths(paths.length ? paths : dir ? [dir] : [], 'windows')
}

export function openInTerminal(): void {
  const sel = selectedEntries()
  const dir = sel.length === 1 && sel[0].kind === 'dir' ? sel[0].path : currentDir()
  if (dir) api.shell.openTerminal(dir)
}

export function revealSelected(): void {
  const first = selectedPaths()[0] ?? currentDir()
  if (first && !isSpecial(first)) api.shell.reveal(first)
}
