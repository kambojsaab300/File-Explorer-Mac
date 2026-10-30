import { app } from 'electron'
import type { Dirent, Stats } from 'node:fs'
import { chmod, lstat, mkdir as mkdirFs, open as openFs, opendir, readFile, rename as renameFs, stat as statFs } from 'node:fs/promises'
import type { Entry, FileProperties, Path, PreviewData, SpecialLocation } from '@shared/types'
import { baseName, extOf, joinPath, parentOf, parseDisplay, toDisplay } from '@shared/paths'
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
  const targetDir =
    dir === 'trash'
      ? process.platform === 'darwin'
        ? joinPath(places().home, '.Trash')
        : app.getPath('temp')
      : dir
  const out: Entry[] = []
  const batch: Promise<void>[] = []
  const add = async (de: Dirent): Promise<void> => {
    const path = joinPath(targetDir, de.name)
    try {
      let st = await lstat(path)
      // Show symlinked folders as folders, the way Explorer shows junctions.
      if (st.isSymbolicLink()) st = await statFs(path).catch(() => st)
      out.push(toEntry(path, st))
    } catch {
      // Vanished or unreadable between readdir and stat; skip it.
    }
  }

  try {
    for await (const de of await opendir(targetDir, { bufferSize: 256 })) {
      if (!opts.hidden && de.name.startsWith('.')) continue
      batch.push(add(de))
      if (batch.length >= 64) await Promise.all(batch.splice(0))
    }
    await Promise.all(batch)
  } catch {
    // Empty or unreadable
  }
  return out
}

export async function stat(p: Path): Promise<Entry> {
  return toEntry(p, await statFs(p))
}

export async function properties(p: Path): Promise<FileProperties> {
  const st = await statFs(p)
  const name = baseName(p) || p
  const ext = extOf(name)
  let kind: Entry['kind'] = st.isDirectory() ? 'dir' : 'file'
  if (kind === 'dir' && PACKAGE_EXTS.has(ext)) kind = 'package'

  const vols = await listVolumes()
  const parent = parentOf(p) ?? p
  const locationWindows = toDisplay(parent, vols)
  const locationMac = parent

  let itemCount: { files: number; folders: number } | undefined
  let calculatedSize = st.size
  if (kind === 'dir') {
    let files = 0
    let folders = 0
    let totalBytes = 0
    async function scan(dir: Path, depth: number): Promise<void> {
      if (depth > 4 || files + folders > 3000) return
      try {
        const entries = await opendir(dir, { bufferSize: 128 })
        for await (const de of entries) {
          if (de.isDirectory()) {
            folders++
            await scan(joinPath(dir, de.name), depth + 1)
          } else {
            files++
            try {
              const s = await statFs(joinPath(dir, de.name))
              totalBytes += s.size
            } catch {
              // ignore unreadable
            }
          }
        }
      } catch {
        // ignore unreadable
      }
    }
    await scan(p, 0)
    itemCount = { files, folders }
    calculatedSize = totalBytes
  }

  const sizeOnDisk = Math.ceil(Math.max(calculatedSize, 4096) / 4096) * 4096
  const posixMode = '0' + (st.mode & 0o777).toString(8)

  return {
    path: p,
    name,
    kind,
    ext,
    size: calculatedSize,
    sizeOnDisk,
    locationWindows,
    locationMac,
    mtimeMs: st.mtimeMs,
    ctimeMs: st.ctimeMs,
    atimeMs: st.atimeMs,
    readonly: (st.mode & 0o200) === 0,
    hidden: name.startsWith('.'),
    posixMode,
    itemCount
  }
}

export async function setAttributes(p: Path, attrs: { hidden?: boolean; readonly?: boolean }): Promise<void> {
  if (typeof attrs.readonly === 'boolean') {
    const st = await statFs(p)
    const newMode = attrs.readonly ? st.mode & ~0o222 : st.mode | 0o200
    await chmod(p, newMode)
  }
  if (typeof attrs.hidden === 'boolean') {
    const name = baseName(p)
    const isCurrentlyHidden = name.startsWith('.')
    if (attrs.hidden && !isCurrentlyHidden) {
      const parent = parentOf(p) ?? '/'
      await renameFs(p, joinPath(parent, '.' + name))
    } else if (!attrs.hidden && isCurrentlyHidden) {
      const parent = parentOf(p) ?? '/'
      await renameFs(p, joinPath(parent, name.slice(1)))
    }
  }
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

export async function readPreview(p: Path): Promise<PreviewData> {
  const name = baseName(p)
  const ext = extOf(name)
  const textExts = new Set([
    'txt', 'md', 'json', 'ts', 'js', 'tsx', 'jsx', 'html', 'css',
    'sh', 'py', 'yml', 'yaml', 'xml', 'log', 'ini', 'conf', 'env', 'sql'
  ])
  const imageExts = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'])

  try {
    if (imageExts.has(ext)) {
      const data = await readFile(p)
      const mime = ext === 'svg' ? 'image/svg+xml' : `image/${ext === 'jpg' ? 'jpeg' : ext}`
      return {
        kind: 'image',
        mime,
        content: `data:${mime};base64,${data.toString('base64')}`
      }
    }

    if (textExts.has(ext)) {
      const fh = await openFs(p, 'r')
      try {
        const buf = Buffer.alloc(16 * 1024)
        const { bytesRead } = await fh.read(buf, 0, buf.length, 0)
        return {
          kind: 'text',
          content: buf.subarray(0, bytesRead).toString('utf8')
        }
      } finally {
        await fh.close()
      }
    }
  } catch {
    // Unreadable
  }

  return { kind: 'binary' }
}
