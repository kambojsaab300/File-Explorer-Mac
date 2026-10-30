import { app } from 'electron'
import type { Dirent, Stats } from 'node:fs'
import { lstat, mkdir as mkdirFs, opendir, rename as renameFs, stat as statFs } from 'node:fs/promises'
import type { Entry, Path, SpecialLocation } from '@shared/types'
import { baseName, extOf, joinPath, parentOf, parseDisplay } from '@shared/paths'
import { listVolumes } from './volumes.service'

// macOS shows these directories as single files.
const PACKAGE_EXTS = new Set(['app', 'bundle', 'framework', 'photoslibrary', 'pages', 'numbers', 'key', 'rtfd', 'plugin', 'kext'])

const toPosix = (p: string): Path => p.replace(/\\/g, '/')

function toEntry(path: Path, st: Stats): Entry {
  const name = baseName(path) || path
  const ext = extOf(name)
  let kind: Entry['kind'] = st.isSymbolicLink() ? 'symlink' : st.isDirectory() ? 'dir' : 'file'
  if (kind === 'dir' && PACKAGE_EXTS.has(ext)) kind = 'package'
  return {
    name,
    path,
    kind,
    ext: kind === 'dir' ? '' : ext,
    size: kind === 'file' ? st.size : 0,
    mtimeMs: st.mtimeMs,
    birthtimeMs: st.birthtimeMs,
    hidden: name.startsWith('.'),
    readonly: (st.mode & 0o200) === 0
  }
}

export async function list(dir: Path, opts: { hidden?: boolean } = {}): Promise<Entry[]> {
  const out: Entry[] = []
  const batch: Promise<void>[] = []
  const add = async (de: Dirent): Promise<void> => {
    const path = joinPath(dir, de.name)
    try {
      let st = await lstat(path)
      // Show symlinked folders as folders, the way Explorer shows junctions.
      if (st.isSymbolicLink()) st = await statFs(path).catch(() => st)
      out.push(toEntry(path, st))
    } catch {
      // Vanished or unreadable between readdir and stat; skip it.
    }
  }

  for await (const de of await opendir(dir, { bufferSize: 256 })) {
    if (!opts.hidden && de.name.startsWith('.')) continue
    batch.push(add(de))
    if (batch.length >= 64) await Promise.all(batch.splice(0))
  }
  await Promise.all(batch)
  return out
}

export async function stat(p: Path): Promise<Entry> {
  return toEntry(p, await statFs(p))
}

export async function mkdir(parent: Path, name: string): Promise<Path> {
  const path = joinPath(parent, name)
  await mkdirFs(path)
  return path
}

export async function rename(p: Path, newName: string): Promise<Path> {
  const target = joinPath(parentOf(p) ?? '/', newName)
  await renameFs(p, target)
  return target
}

export async function resolveInput(text: string): Promise<Path | SpecialLocation | null> {
  const parsed = parseDisplay(text, await listVolumes(), toPosix(app.getPath('home')))
  if (!parsed || !parsed.includes('/')) return parsed
  const st = await statFs(parsed).catch(() => null)
  return st?.isDirectory() ? parsed : null
}

export function places(): Record<string, Path> {
  const get = (k: Parameters<typeof app.getPath>[0]): Path => toPosix(app.getPath(k))
  return {
    home: get('home'),
    desktop: get('desktop'),
    downloads: get('downloads'),
    documents: get('documents'),
    pictures: get('pictures'),
    music: get('music'),
    videos: get('videos')
  }
}
