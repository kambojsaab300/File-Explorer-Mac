import { clipboard, shell } from 'electron'
import { execFile, spawn } from 'node:child_process'
import { normalize } from 'node:path'
import type { Path } from '@shared/types'
import { toDisplay } from '@shared/paths'
import { listVolumes } from './volumes.service'

export async function open(p: Path): Promise<void> {
  const err = await shell.openPath(normalize(p))
  if (err) throw new Error(err)
}

export function reveal(p: Path): void {
  shell.showItemInFolder(normalize(p))
}

export function openTerminal(dir: Path): void {
  if (process.platform === 'darwin') execFile('open', ['-a', 'Terminal', dir])
  else if (process.platform === 'win32') spawn('cmd.exe', ['/c', 'start', 'cmd.exe'], { cwd: dir, detached: true })
}

export async function copyPaths(paths: Path[], style: 'windows' | 'posix'): Promise<void> {
  const vols = style === 'windows' ? await listVolumes() : []
  const lines = paths.map((p) => (style === 'windows' ? `"${toDisplay(p, vols)}"` : p))
  clipboard.writeText(lines.join('\n'))
}
