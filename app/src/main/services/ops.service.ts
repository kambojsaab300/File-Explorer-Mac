import { app, shell } from 'electron'
import { execFile } from 'node:child_process'
import { constants } from 'node:fs'
import { copyFile, lstat, mkdir, readdir, readlink, rename, rm, stat, symlink, writeFile } from 'node:fs/promises'
import { promisify } from 'node:util'
import { randomUUID } from 'node:crypto'
import { normalize } from 'node:path'
import type { Conflict, ConflictAnswer, ConflictRequest, OpProgress, OpResult, Path, TrashResult } from '@shared/types'
import { baseName, joinPath, parentOf, variantName, withoutExt } from '@shared/paths'
import { stat as entryOf } from './fs.service'

const execFileAsync = promisify(execFile)

type AskConflict = (req: ConflictRequest) => Promise<ConflictAnswer>

interface Job {
  progress: OpProgress
  paused: boolean
  cancelled: boolean
  resume?: () => void
}

const jobs = new Map<string, Job>()
const exists = (p: Path): Promise<boolean> => lstat(p).then(() => true, () => false)

async function freeName(dir: Path, name: string, style: 'copy' | 'number'): Promise<Path> {
  for (let n = 1; ; n++) {
    const candidate = joinPath(dir, variantName(name, style, n))
    if (!(await exists(candidate))) return candidate
  }
}

async function measure(p: Path): Promise<{ bytes: number; items: number }> {
  const st = await lstat(p)
  if (!st.isDirectory()) return { bytes: st.size, items: 1 }
  let bytes = 0
  let items = 1
  for (const name of await readdir(p)) {
    const sub = await measure(joinPath(p, name))
    bytes += sub.bytes
    items += sub.items
  }
  return { bytes, items }
}

export function pause(opId: string): void {
  const job = jobs.get(opId)
  if (job) job.paused = true
}

export function resume(opId: string): void {
  const job = jobs.get(opId)
  if (!job) return
  job.paused = false
  job.resume?.()
}

export function cancel(opId: string): void {
  const job = jobs.get(opId)
  if (!job) return
  job.cancelled = true
  job.resume?.()
}

class Cancelled extends Error {}

export async function transfer(
  kind: 'copy' | 'move',
  sources: Path[],
  dest: Path,
  conflict: Conflict,
  emit: (p: OpProgress) => void,
  ask: AskConflict
): Promise<OpResult> {
  const opId = randomUUID()
  const job: Job = {
    paused: false,
    cancelled: false,
    progress: { opId, kind, bytesDone: 0, bytesTotal: 0, itemsDone: 0, itemsTotal: 0, current: '', speedBps: 0, state: 'running' }
  }
  jobs.set(opId, job)
  const p = job.progress
  const started = Date.now()
  let lastEmit = 0
  const report = (force = false): void => {
    const now = Date.now()
    if (!force && now - lastEmit < 100) return
    lastEmit = now
    p.speedBps = p.bytesDone / Math.max(0.001, (now - started) / 1000)
    emit({ ...p })
  }

  // Waits here while paused; throws if the user cancelled.
  const checkpoint = async (): Promise<void> => {
    while (job.paused && !job.cancelled) await new Promise<void>((r) => (job.resume = r))
    if (job.cancelled) throw new Cancelled()
  }

  async function copyTree(from: Path, to: Path): Promise<void> {
    await checkpoint()
    const st = await lstat(from)
    p.current = baseName(from)
    if (st.isDirectory()) {
      await mkdir(to)
      p.itemsDone++
      for (const name of await readdir(from)) await copyTree(joinPath(from, name), joinPath(to, name))
      return
    }
    if (st.isSymbolicLink()) {
      await symlink(await readlink(from), to)
    } else {
      // Big files copy on the thread pool; poll the destination size so the bar keeps moving.
      const before = p.bytesDone
      const timer = setInterval(() => {
        void stat(to).then((s) => {
          p.bytesDone = before + s.size
          report()
        }, () => {})
      }, 250)
      try {
        // FICLONE makes same-volume APFS copies instant; libuv uses copyfile(3) on macOS so metadata survives.
        await copyFile(from, to, constants.COPYFILE_EXCL | constants.COPYFILE_FICLONE)
      } catch (e) {
        await rm(to, { force: true })
        throw e
      } finally {
        clearInterval(timer)
      }
      p.bytesDone = before + st.size
    }
    p.itemsDone++
    report()
  }

  const moved: OpResult['moved'] = []
  let policy: Conflict = conflict

  try {
    for (const src of sources) {
      const m = await measure(src)
      p.bytesTotal += m.bytes
      p.itemsTotal += m.items
    }
    report(true)

    for (const [i, src] of sources.entries()) {
      await checkpoint()
      const sameFolder = parentOf(src) === dest
      if (kind === 'move' && sameFolder) continue
      if (dest === src || dest.startsWith(src + '/')) {
        throw Object.assign(new Error('The destination folder is a subfolder of the source folder.'), { code: 'EINVAL', path: src })
      }

      let target = joinPath(dest, baseName(src))
      if (kind === 'copy' && sameFolder) {
        target = await freeName(dest, baseName(src), 'copy')
      } else if (await exists(target)) {
        let choice = policy
        if (choice === 'ask') {
          const answer = await ask({ opId, src: await entryOf(src), dest: await entryOf(target), remaining: sources.length - i })
          if (answer.choice === 'cancel') throw new Cancelled()
          choice = answer.choice
          if (answer.applyToAll) policy = choice
        }
        if (choice === 'skip') continue
        if (choice === 'keep-both') target = await freeName(dest, baseName(src), 'number')
        else await rm(target, { recursive: true })
      }

      if (kind === 'move') {
        try {
          await rename(src, target)
          const m = await measure(target)
          p.bytesDone += m.bytes
          p.itemsDone += m.items
          moved.push({ from: src, to: target })
          report()
          continue
        } catch (e) {
          // Different volume: fall through to copy, then remove the source.
          if ((e as NodeJS.ErrnoException).code !== 'EXDEV') throw e
        }
      }

      try {
        await copyTree(src, target)
      } catch (e) {
        await rm(target, { recursive: true, force: true })
        throw e
      }
      if (kind === 'move') await rm(src, { recursive: true })
      moved.push({ from: src, to: target })
    }

    p.state = 'done'
    report(true)
    return { state: 'done', moved }
  } catch (e) {
    if (e instanceof Cancelled) {
      p.state = 'cancelled'
      report(true)
      return { state: 'cancelled', moved }
    }
    const err = e as NodeJS.ErrnoException & { path?: string }
    p.state = 'error'
    p.error = { code: err.code ?? 'EUNKNOWN', path: err.path ?? p.current, message: err.message }
    report(true)
    return { state: 'error', moved, error: p.error }
  } finally {
    jobs.delete(opId)
  }
}

// After trashing, find where the item landed so Undo can put it back. macOS may block
// reading the Trash without Full Disk Access; then Undo for that item is unavailable.
async function locateInTrash(from: Path, trashedAt: number): Promise<Path | undefined> {
  if (process.platform !== 'darwin') return undefined
  const vol = from.match(/^\/Volumes\/[^/]+/)?.[0]
  const trashDir = vol ? `${vol}/.Trashes/${process.getuid?.()}` : joinPath(app.getPath('home'), '.Trash')
  const name = baseName(from)
  const dot = name.lastIndexOf('.')
  const stem = dot > 0 ? name.slice(0, dot) : name
  try {
    const candidates = (await readdir(trashDir)).filter((n) => n === name || n.startsWith(stem + ' '))
    let best: { path: Path; time: number } | undefined
    for (const n of candidates) {
      const path = joinPath(trashDir, n)
      const st = await lstat(path)
      const time = st.ctimeMs
      if (time >= trashedAt - 2000 && (!best || time > best.time)) best = { path, time }
    }
    return best?.path
  } catch {
    return undefined
  }
}

export async function trash(paths: Path[]): Promise<TrashResult[]> {
  const results: TrashResult[] = []
  for (const from of paths) {
    const at = Date.now()
    // Electron's shell APIs want native separators (backslashes on a Windows dev box).
    await shell.trashItem(normalize(from))
    results.push({ from, trashedTo: await locateInTrash(from, at) })
  }
  return results
}

export async function deletePermanently(paths: Path[]): Promise<void> {
  for (const p of paths) await rm(p, { recursive: true })
}

export async function newFile(parent: Path, name: string): Promise<Path> {
  const path = joinPath(parent, name)
  await writeFile(path, '', { flag: 'wx' })
  return path
}

export async function compress(sources: Path[], destZip?: Path): Promise<Path> {
  if (sources.length === 0) throw new Error('No files specified to compress')
  const first = sources[0]
  const parent = parentOf(first) ?? '/'
  let target = destZip
  if (!target) {
    const defaultBase = sources.length === 1 ? withoutExt(baseName(first)) : 'Archive'
    target = await freeName(parent, `${defaultBase}.zip`, 'number')
  }

  if (process.platform === 'darwin') {
    if (sources.length === 1) {
      await execFileAsync('ditto', ['-c', '-k', '--sequesterRsrc', '--keepParent', first, target])
    } else {
      const basenames = sources.map((s) => baseName(s))
      await execFileAsync('zip', ['-r', '-q', target, ...basenames], { cwd: parent })
    }
  } else {
    // Windows / Linux: bsdtar supports zip creation
    const basenames = sources.map((s) => baseName(s))
    await execFileAsync('tar', ['-a', '-c', '-f', target, ...basenames], { cwd: parent })
  }

  return target
}

export async function extract(zipPath: Path, destDir?: Path): Promise<Path> {
  const parent = parentOf(zipPath) ?? '/'
  let target = destDir
  if (!target) {
    const folderName = withoutExt(baseName(zipPath))
    target = await freeName(parent, folderName, 'number')
  }
  await mkdir(target, { recursive: true })

  if (process.platform === 'darwin') {
    await execFileAsync('ditto', ['-x', '-k', zipPath, target])
  } else {
    await execFileAsync('tar', ['-xf', zipPath, '-C', target])
  }

  return target
}

export async function emptyTrash(): Promise<void> {
  if (process.platform === 'darwin') {
    await execFileAsync('osascript', ['-e', 'tell application "Finder" to empty trash']).catch(async () => {
      const trashDir = joinPath(app.getPath('home').replace(/\\/g, '/'), '.Trash')
      const entries = await readdir(trashDir).catch(() => [])
      for (const e of entries) await rm(joinPath(trashDir, e), { recursive: true, force: true }).catch(() => {})
    })
  }
}

export async function batchRename(renames: { from: Path; newName: string }[]): Promise<{ from: Path; to: Path }[]> {
  const plan: { from: Path; to: Path; temp?: Path }[] = []
  const results: { from: Path; to: Path }[] = []

  for (const item of renames) {
    const parent = parentOf(item.from) ?? '/'
    const to = joinPath(parent, item.newName)
    if (item.from === to) {
      results.push({ from: item.from, to })
      continue
    }
    plan.push({ from: item.from, to })
  }

  // To avoid overwriting in cycles (e.g. A -> B and B -> C), rename colliding targets to temp names first
  const sourceSet = new Set(plan.map((p) => p.from))
  for (const step of plan) {
    if (sourceSet.has(step.to)) {
      const temp = joinPath(parentOf(step.from) ?? '/', `__khoj_tmp_${randomUUID()}__`)
      await rename(step.from, temp)
      step.temp = temp
    }
  }

  for (const step of plan) {
    const src = step.temp ?? step.from
    await rename(src, step.to)
    results.push({ from: step.from, to: step.to })
  }

  return results
}

