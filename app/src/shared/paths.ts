// Path helpers shared by main and renderer. Internal paths are POSIX-style
// ("/Volumes/MyDATA/Dev"; on a Windows dev box "C:/Users"). Drive letters only
// exist on screen, so every conversion needs the current volume list.
import type { Path, SpecialLocation, Volume } from './types'

export const SPECIAL_LABELS: Record<SpecialLocation, string> = {
  home: 'Home',
  gallery: 'Gallery',
  recent: 'Recent files',
  thispc: 'This PC',
  network: 'Network',
  trash: 'Trash'
}

export function isSpecial(loc: string): loc is SpecialLocation {
  return loc in SPECIAL_LABELS
}

const isDriveRoot = (p: Path): boolean => p === '/' || /^[A-Za-z]:\/$/.test(p)

export function joinPath(dir: Path, name: string): Path {
  return dir.endsWith('/') ? dir + name : `${dir}/${name}`
}

export function parentOf(p: Path): Path | null {
  if (isDriveRoot(p)) return null
  const parent = p.slice(0, p.lastIndexOf('/'))
  if (parent === '') return '/'
  return /^[A-Za-z]:$/.test(parent) ? parent + '/' : parent
}

export function baseName(p: Path): string {
  return p.slice(p.lastIndexOf('/') + 1)
}

export function extOf(name: string): string {
  const i = name.lastIndexOf('.')
  return i > 0 ? name.slice(i + 1).toLowerCase() : ''
}

export function withoutExt(name: string): string {
  const i = name.lastIndexOf('.')
  return i > 0 ? name.slice(0, i) : name
}

// Explorer naming: pasting into the same folder gives "a - Copy.txt", "a - Copy (2).txt";
// "keep both" on a conflict gives "a (2).txt".
export function variantName(name: string, style: 'copy' | 'number' | 'shortcut', n = 1): string {
  const ext = extOf(name)
  const base = ext ? name.slice(0, -(ext.length + 1)) : name
  const suffix = ext ? '.' + name.slice(-ext.length) : ''
  if (style === 'shortcut') return `${base} - Shortcut${n > 1 ? ` (${n})` : ''}${suffix}`
  if (style === 'copy') return `${base} - Copy${n > 1 ? ` (${n})` : ''}${suffix}`
  return `${base} (${n + 1})${suffix}`
}

export function volumeOf(p: Path, vols: Volume[]): Volume | undefined {
  // Longest mount wins, so "/Volumes/MyDATA/x" beats "/".
  let best: Volume | undefined
  for (const v of vols) {
    const prefix = v.mount.endsWith('/') ? v.mount : v.mount + '/'
    if ((p === v.mount || p.startsWith(prefix)) && (!best || v.mount.length > best.mount.length)) best = v
  }
  return best
}

export function toDisplay(p: string, vols: Volume[], letters = true): string {
  if (isSpecial(p)) return SPECIAL_LABELS[p]
  const v = volumeOf(p, vols)
  if (!letters || !v) return p
  const rest = p.slice(v.mount.length).split('/').filter(Boolean).join('\\')
  return `${v.letter}:\\${rest}`
}

// Accepts what people type into a Windows address bar ("E:\Dev", "Recycle Bin")
// as well as Mac paths ("~/Downloads", "/Volumes/X"). Existence is not checked here.
export function parseDisplay(input: string, vols: Volume[], home: Path): Path | SpecialLocation | null {
  let s = input.trim()
  if (!s) return null
  const low = s.toLowerCase()
  for (const [key, label] of Object.entries(SPECIAL_LABELS)) {
    if (low === key || low === label.toLowerCase()) return key as SpecialLocation
  }
  if (low === 'recycle bin') return 'trash'
  if (low === 'this mac' || low === 'computer') return 'thispc'
  if (low === 'recent files' || low === 'recents') return 'recent'

  if (s === '~' || s.startsWith('~/') || s.startsWith('~\\')) s = home + s.slice(1)

  const drive = s.match(/^([a-zA-Z]):(?:[\\/](.*))?$/)
  if (drive) {
    const v = vols.find((v) => v.letter === drive[1].toUpperCase())
    if (!v) return null
    const rest = (drive[2] ?? '').split(/[\\/]/).filter(Boolean)
    return rest.reduce(joinPath, v.mount)
  }

  s = s.replace(/\\/g, '/')
  if (s.length > 1 && !isDriveRoot(s)) s = s.replace(/\/+$/, '')
  return s.startsWith('/') || /^[A-Za-z]:\//.test(s) ? s : null
}
