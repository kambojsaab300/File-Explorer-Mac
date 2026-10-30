import { execFile } from 'node:child_process'
import { watch, type FSWatcher } from 'node:fs'
import { access, lstat, readdir, statfs } from 'node:fs/promises'
import { promisify } from 'node:util'
import type { Volume } from '@shared/types'
import { getSetting, setSetting } from './settings.service'

const run = promisify(execFile)
type Letters = Record<string, string>

async function sizeOf(mount: string): Promise<{ total: number; free: number }> {
  try {
    const s = await statfs(mount)
    return { total: s.blocks * s.bsize, free: s.bavail * s.bsize }
  } catch {
    return { total: 0, free: 0 }
  }
}

async function macMounts(): Promise<Omit<Volume, 'letter'>[]> {
  const out: Omit<Volume, 'letter'>[] = [
    { id: '/', name: 'Macintosh HD', mount: '/', kind: 'system', fsType: 'apfs', readonly: false, ejectable: false, ...(await sizeOf('/')) }
  ]
  for (const name of await readdir('/Volumes').catch(() => [])) {
    const mount = `/Volumes/${name}`
    // "/Volumes/Macintosh HD" is a symlink back to "/"; it is already listed.
    if ((await lstat(mount).catch(() => null))?.isSymbolicLink() !== false) continue
    out.push({ id: mount, name, mount, kind: 'external', fsType: '', readonly: false, ejectable: true, ...(await sizeOf(mount)) })
  }
  return out
}

// Dev fallback so the app is usable on a Windows machine.
async function windowsMounts(): Promise<Omit<Volume, 'letter'>[]> {
  const out: Omit<Volume, 'letter'>[] = []
  for (const l of 'CDEFGHIJKLMNOPQRSTUVWXYZ') {
    const mount = `${l}:/`
    if (!(await access(mount).then(() => true, () => false))) continue
    out.push({ id: mount, name: l === 'C' ? 'Local Disk' : `Drive ${l}`, mount, kind: l === 'C' ? 'system' : 'external', fsType: '', readonly: false, ejectable: false, ...(await sizeOf(mount)) })
  }
  return out
}

function assignLetters(vols: Omit<Volume, 'letter'>[]): Volume[] {
  if (process.platform === 'win32') return vols.map((v) => ({ ...v, letter: v.mount[0] }))

  // Letters stick to a volume across mounts, like Windows does; "/" is always C:.
  const saved = getSetting<Letters>('driveLetters') ?? {}
  const taken = new Set(['C', ...vols.map((v) => saved[v.id]).filter(Boolean)])
  let changed = false
  const result = vols.map((v) => {
    if (v.mount === '/') return { ...v, letter: 'C' }
    let letter = saved[v.id]
    if (!letter) {
      letter = [...'DEFGHIJKLMNOPQRSTUVWXYZ'].find((l) => !taken.has(l)) ?? '?'
      taken.add(letter)
      saved[v.id] = letter
      changed = true
    }
    return { ...v, letter }
  })
  if (changed) void setSetting('driveLetters', saved)
  return result
}

export async function listVolumes(): Promise<Volume[]> {
  return assignLetters(process.platform === 'darwin' ? await macMounts() : await windowsMounts())
}

export async function ejectVolume(mount: string): Promise<void> {
  if (process.platform !== 'darwin') throw new Error('Eject is only supported on macOS')
  try {
    await run('diskutil', ['eject', mount])
  } catch (e) {
    const busy = /busy|in use/i.test(String((e as { stderr?: string }).stderr ?? e))
    throw new Error(busy ? 'This device is currently in use.' : 'The device could not be ejected.')
  }
}

let watcher: FSWatcher | null = null

export function watchVolumes(onChange: (v: Volume[]) => void): void {
  if (process.platform !== 'darwin' || watcher) return
  let timer: NodeJS.Timeout | undefined
  watcher = watch('/Volumes', () => {
    clearTimeout(timer)
    timer = setTimeout(() => void listVolumes().then(onChange), 500)
  })
}
