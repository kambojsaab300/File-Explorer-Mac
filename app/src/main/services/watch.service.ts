import { execFile } from 'node:child_process'
import { watch, type FSWatcher } from 'node:fs'
import { opendir } from 'node:fs/promises'
import { promisify } from 'node:util'
import type { Entry, Path } from '@shared/types'
import { joinPath } from '@shared/paths'
import { stat as entryOf } from './fs.service'

const execFileAsync = promisify(execFile)

// One watcher per open folder (not recursive), shared by every tab showing it.
const watchers = new Map<Path, { watcher: FSWatcher; listeners: Set<() => void>; timer?: NodeJS.Timeout }>()

export function subscribe(dir: Path, listener: () => void): () => void {
  let w = watchers.get(dir)
  if (!w) {
    try {
      const entry: { watcher: FSWatcher; listeners: Set<() => void>; timer?: NodeJS.Timeout } = {
        watcher: watch(dir, () => {
          // Copies fire many events; one refresh per burst is enough.
          clearTimeout(entry.timer)
          entry.timer = setTimeout(() => entry.listeners.forEach((l) => l()), 150)
        }),
        listeners: new Set()
      }
      entry.watcher.on('error', () => {})
      w = entry
      watchers.set(dir, w)
    } catch {
      // Unreadable or vanished folder: nothing to watch.
      return () => {}
    }
  }
  w.listeners.add(listener)
  return () => {
    const cur = watchers.get(dir)
    if (!cur) return
    cur.listeners.delete(listener)
    if (!cur.listeners.size) {
      clearTimeout(cur.timer)
      cur.watcher.close()
      watchers.delete(dir)
    }
  }
}

const SKIP_DIRS = new Set(['node_modules', '.git', 'Library'])
const MAX_RESULTS = 2000

let current: AbortController | null = null

export async function search(root: Path, query: string, showHidden = false): Promise<Entry[]> {
  current?.abort()
  const ctrl = new AbortController()
  current = ctrl
  const q = query.trim().toLowerCase()
  const out: Entry[] = []
  if (!q) return out

  // On macOS, try Spotlight index first (mdfind) for instant search
  if (process.platform === 'darwin') {
    try {
      const { stdout } = await execFileAsync('mdfind', ['-onlyin', root, '-name', query], {
        signal: ctrl.signal,
        timeout: 4000
      })
      const lines = stdout.split('\n').map((l) => l.trim()).filter(Boolean)
      if (lines.length) {
        for (const line of lines.slice(0, MAX_RESULTS)) {
          if (ctrl.signal.aborted) return []
          const e = await entryOf(line).catch(() => null)
          if (e && (showHidden || !e.hidden)) out.push(e)
        }
        return out
      }
    } catch {
      // Fallback to BFS recursive scan if unindexed
    }
  }

  // Breadth-first so near matches show up before deep ones when the cap is hit.
  const queue: Path[] = [root]
  while (queue.length && out.length < MAX_RESULTS) {
    if (ctrl.signal.aborted) return []
    const dir = queue.shift()!
    try {
      for await (const de of await opendir(dir, { bufferSize: 256 })) {
        if (!showHidden && de.name.startsWith('.')) continue
        const path = joinPath(dir, de.name)
        if (de.name.toLowerCase().includes(q)) out.push(await entryOf(path).catch(() => null as never))
        if (de.isDirectory() && !SKIP_DIRS.has(de.name) && !/\.(app|bundle|framework|photoslibrary)$/i.test(de.name)) queue.push(path)
      }
    } catch {
      // Permission denied or gone; keep searching elsewhere.
    }
  }
  return out.filter(Boolean)
}
