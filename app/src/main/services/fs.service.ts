import { app } from 'electron'
import { createReadStream, type Dirent, type Stats } from 'node:fs'
import { chmod, lstat, mkdir as mkdirFs, open as openFs, opendir, readdir, readFile, rename as renameFs, stat as statFs, symlink as symlinkFs } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import type { DiskAnalysisResult, DiskUsageItem, Entry, FileProperties, GitRepoInfo, Path, PreviewData, SpecialLocation } from '@shared/types'
import { baseName, extOf, joinPath, parentOf, parseDisplay, toDisplay } from '@shared/paths'
import { listVolumes } from './volumes.service'

// High-speed in-memory directory listing cache
interface CacheItem {
  timestamp: number
  entries: Entry[]
}
const listCache = new Map<string, CacheItem>()

export function invalidateListCache(targetDir?: string): void {
  if (targetDir) {
    listCache.delete(targetDir)
    for (const key of listCache.keys()) {
      if (key.startsWith(targetDir)) listCache.delete(key)
    }
  } else {
    listCache.clear()
  }
}

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

export async function list(dir: Path, opts: { hidden?: boolean; refresh?: boolean } = {}): Promise<Entry[]> {
  const targetDir =
    dir === 'trash'
      ? process.platform === 'darwin'
        ? joinPath(places().home, '.Trash')
        : app.getPath('temp')
      : dir

  const cacheKey = `${targetDir}:${opts.hidden ? '1' : '0'}`
  if (!opts.refresh) {
    const cached = listCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < 3000) {
      return cached.entries
    }
  } else {
    invalidateListCache(targetDir)
  }

  const out: Entry[] = []
  try {
    const dirents = await readdir(targetDir, { withFileTypes: true })
    const visible = opts.hidden ? dirents : dirents.filter((de) => !de.name.startsWith('.'))
    const concurrency = 128
    for (let i = 0; i < visible.length; i += concurrency) {
      const chunk = visible.slice(i, i + concurrency)
      await Promise.all(
        chunk.map(async (de) => {
          const path = joinPath(targetDir, de.name)
          try {
            let st = await lstat(path)
            if (st.isSymbolicLink()) st = await statFs(path).catch(() => st)
            out.push(toEntry(path, st))
          } catch {
            // Unreadable or vanished
          }
        })
      )
    }
  } catch {
    // Empty or unreadable
  }
  listCache.set(cacheKey, { timestamp: Date.now(), entries: out })
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
  invalidateListCache(parent)
  return path
}

export async function rename(p: Path, newName: string): Promise<Path> {
  const parent = parentOf(p) ?? '/'
  const target = joinPath(parent, newName)
  const currentName = baseName(p)
  if (currentName.toLowerCase() === newName.toLowerCase() && currentName !== newName) {
    const tempTarget = joinPath(parent, `${newName}.khoj-tmp-${Date.now()}`)
    await renameFs(p, tempTarget)
    await renameFs(tempTarget, target)
    invalidateListCache(parent)
    return target
  }
  await renameFs(p, target)
  invalidateListCache(parent)
  return target
}

export async function createSymlink(target: Path, linkPath: Path): Promise<Path> {
  await symlinkFs(target, linkPath)
  return linkPath
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
  const ext = extOf(name).toLowerCase()
  const textExts = new Set([
    'txt', 'md', 'markdown', 'json', 'ts', 'js', 'tsx', 'jsx', 'html', 'css',
    'scss', 'less', 'sh', 'bash', 'zsh', 'py', 'yml', 'yaml', 'xml', 'log',
    'ini', 'conf', 'env', 'sql', 'csv', 'c', 'cpp', 'h', 'hpp', 'java',
    'rs', 'go', 'toml', 'lua', 'swift', 'kt', 'php', 'rb', 'bat', 'cmd',
    'ps1', 'plist', 'rtf', 'diff', 'patch'
  ])
  const imageExts = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'ico', 'bmp', 'avif'])
  const audioExts = new Set(['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'])
  const videoExts = new Set(['mp4', 'webm', 'mov', 'm4v', 'ogv'])

  try {
    const st = await statFs(p)
    const size = st.size

    if (imageExts.has(ext) && size <= 25 * 1024 * 1024) {
      const data = await readFile(p)
      const mime = ext === 'svg' ? 'image/svg+xml' : ext === 'jpg' ? 'image/jpeg' : `image/${ext}`
      return {
        kind: 'image',
        mime,
        content: `data:${mime};base64,${data.toString('base64')}`,
        size
      }
    }

    if (audioExts.has(ext) && size <= 30 * 1024 * 1024) {
      const data = await readFile(p)
      const mime = ext === 'mp3' ? 'audio/mpeg' : ext === 'm4a' ? 'audio/mp4' : `audio/${ext}`
      return {
        kind: 'audio',
        mime,
        content: `data:${mime};base64,${data.toString('base64')}`,
        size
      }
    }

    if (videoExts.has(ext) && size <= 40 * 1024 * 1024) {
      const data = await readFile(p)
      const mime = ext === 'mov' ? 'video/quicktime' : `video/${ext}`
      return {
        kind: 'video',
        mime,
        content: `data:${mime};base64,${data.toString('base64')}`,
        size
      }
    }

    if (ext === 'pdf' && size <= 20 * 1024 * 1024) {
      const data = await readFile(p)
      return {
        kind: 'pdf',
        mime: 'application/pdf',
        content: `data:application/pdf;base64,${data.toString('base64')}`,
        size
      }
    }

    if (textExts.has(ext)) {
      const fh = await openFs(p, 'r')
      try {
        const maxRead = 64 * 1024
        const buf = Buffer.alloc(Math.min(size, maxRead))
        const { bytesRead } = await fh.read(buf, 0, buf.length, 0)
        const text = buf.subarray(0, bytesRead).toString('utf8')
        const lines = text.split('\n')
        return {
          kind: 'text',
          mime: 'text/plain',
          content: text,
          lineCount: lines.length,
          truncated: size > bytesRead,
          size
        }
      } finally {
        await fh.close()
      }
    }

    return { kind: 'binary', size }
  } catch {
    // Unreadable
  }

  return { kind: 'binary' }
}

export async function computeHash(p: Path, algo: 'sha256' | 'md5' = 'sha256'): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash(algo)
    const stream = createReadStream(p)
    stream.on('data', (chunk) => hash.update(chunk))
    stream.on('end', () => resolve(hash.digest('hex')))
    stream.on('error', reject)
  })
}

export async function gitInfo(dir: Path): Promise<GitRepoInfo | null> {
  let curr = dir
  for (let i = 0; i < 6; i++) {
    const gitDir = joinPath(curr, '.git')
    try {
      const st = await statFs(gitDir)
      if (st.isDirectory()) {
        const headContent = await readFile(joinPath(gitDir, 'HEAD'), 'utf8')
        let branch = headContent.trim()
        if (branch.startsWith('ref: refs/heads/')) {
          branch = branch.slice(16).trim()
        } else if (branch.length > 7) {
          branch = branch.slice(0, 7)
        }
        return { branch, root: curr }
      } else if (st.isFile()) {
        const content = await readFile(gitDir, 'utf8')
        const match = content.match(/gitdir:\s*(.+)/)
        if (match) {
          const resolvedGitDir = joinPath(curr, match[1].trim())
          const headContent = await readFile(joinPath(resolvedGitDir, 'HEAD'), 'utf8')
          let branch = headContent.trim()
          if (branch.startsWith('ref: refs/heads/')) {
            branch = branch.slice(16).trim()
          } else if (branch.length > 7) {
            branch = branch.slice(0, 7)
          }
          return { branch, root: curr }
        }
      }
    } catch {
      // not a git dir, continue up
    }
    const parent = parentOf(curr)
    if (!parent || parent === curr) break
    curr = parent
  }
  return null
}

const EXT_CATEGORIES: Record<string, { label: string; color: string; exts: Set<string> }> = {
  video: {
    label: 'Video',
    color: '#a855f7',
    exts: new Set(['mp4', 'mov', 'mkv', 'avi', 'webm', 'wmv', 'm4v', 'flv'])
  },
  images: {
    label: 'Images',
    color: '#22c55e',
    exts: new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'heic', 'svg', 'tiff', 'raw', 'bmp', 'ico'])
  },
  audio: {
    label: 'Audio',
    color: '#06b6d4',
    exts: new Set(['mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg', 'wma', 'aiff'])
  },
  documents: {
    label: 'Documents',
    color: '#eab308',
    exts: new Set(['pdf', 'docx', 'xlsx', 'pptx', 'doc', 'xls', 'ppt', 'txt', 'csv', 'md', 'rtf', 'pages', 'numbers', 'key'])
  },
  archives: {
    label: 'Archives',
    color: '#f97316',
    exts: new Set(['zip', 'tar', 'gz', 'dmg', 'pkg', 'iso', '7z', 'rar', 'bz2', 'xz'])
  },
  code: {
    label: 'Code & Dev',
    color: '#3b82f6',
    exts: new Set(['ts', 'tsx', 'js', 'jsx', 'py', 'json', 'html', 'css', 'rs', 'go', 'c', 'cpp', 'h', 'java', 'swift', 'kt', 'sql', 'sh', 'yaml', 'yml', 'xml'])
  }
}

export async function analyzeDisk(target: Path): Promise<DiskAnalysisResult> {
  const normTarget = toPosix(target)
  let totalFiles = 0
  let totalFolders = 0
  const allFiles: Array<{ name: string; path: Path; size: number; extension: string }> = []

  const categories: Record<string, { size: number; count: number; color: string; label: string }> = {
    video: { size: 0, count: 0, color: '#a855f7', label: 'Video' },
    images: { size: 0, count: 0, color: '#22c55e', label: 'Images' },
    audio: { size: 0, count: 0, color: '#06b6d4', label: 'Audio' },
    documents: { size: 0, count: 0, color: '#eab308', label: 'Documents' },
    archives: { size: 0, count: 0, color: '#f97316', label: 'Archives' },
    code: { size: 0, count: 0, color: '#3b82f6', label: 'Code & Dev' },
    other: { size: 0, count: 0, color: '#94a3b8', label: 'Other & System' }
  }

  function categorize(ext: string, size: number) {
    const cleanExt = ext.toLowerCase()
    let found = false
    for (const [key, cat] of Object.entries(EXT_CATEGORIES)) {
      if (cat.exts.has(cleanExt)) {
        categories[key].size += size
        categories[key].count += 1
        found = true
        break
      }
    }
    if (!found) {
      categories.other.size += size
      categories.other.count += 1
    }
  }

  async function walk(dirPath: Path, depth = 0): Promise<DiskUsageItem> {
    const nodeName = baseName(dirPath) || dirPath
    let dirSize = 0
    let dirItemCount = 0
    const children: DiskUsageItem[] = []

    try {
      const dirEntries = await opendir(dirPath, { bufferSize: 128 })
      for await (const de of dirEntries) {
        const full = joinPath(dirPath, de.name)
        try {
          const st = await lstat(full)
          if (st.isSymbolicLink()) continue

          if (st.isDirectory()) {
            totalFolders += 1
            if (depth < 4) {
              const child = await walk(full, depth + 1)
              dirSize += child.size
              dirItemCount += 1 + (child.itemCount || 0)
              children.push(child)
            } else {
              dirItemCount += 1
              children.push({
                name: de.name,
                path: full,
                size: st.size,
                kind: 'dir',
                extension: '',
                itemCount: 1
              })
            }
          } else if (st.isFile()) {
            totalFiles += 1
            dirSize += st.size
            dirItemCount += 1
            const ext = extOf(de.name)
            categorize(ext, st.size)
            allFiles.push({ name: de.name, path: full, size: st.size, extension: ext })

            if (depth < 4) {
              children.push({
                name: de.name,
                path: full,
                size: st.size,
                kind: 'file',
                extension: ext
              })
            }
          }
        } catch {
          // Skip unreadable files
        }
      }
    } catch {
      // Permission or missing directory error
    }

    children.sort((a, b) => b.size - a.size)

    return {
      name: nodeName,
      path: dirPath,
      size: dirSize,
      kind: 'dir',
      extension: '',
      itemCount: dirItemCount,
      children
    }
  }

  const tree = await walk(normTarget, 0)
  allFiles.sort((a, b) => b.size - a.size)
  const topFiles = allFiles.slice(0, 15)

  return {
    rootPath: normTarget,
    totalSize: tree.size,
    totalFiles,
    totalFolders,
    categories,
    topFiles,
    tree
  }
}
