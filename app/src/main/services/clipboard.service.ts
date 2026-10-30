import { clipboard } from 'electron'
import { fileURLToPath, pathToFileURL } from 'node:url'
import type { Path } from '@shared/types'

const escapeXml = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// Finder reads the legacy NSFilenamesPboardType (a plist of paths) for multi-file paste.
// Undocumented in Electron, so verify on each macOS release; see docs/06 §5.7.
export function writeFiles(paths: Path[]): void {
  if (process.platform !== 'darwin' || !paths.length) return
  const plist =
    '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">' +
    `<plist version="1.0"><array>${paths.map((p) => `<string>${escapeXml(p)}</string>`).join('')}</array></plist>`
  clipboard.clear()
  clipboard.writeBuffer('NSFilenamesPboardType', Buffer.from(plist, 'utf8'))
  clipboard.writeBuffer('public.file-url', Buffer.from(pathToFileURL(paths[0]).href, 'utf8'))
}

export function readFiles(): Path[] {
  if (process.platform !== 'darwin') return []
  const plist = clipboard.readBuffer('NSFilenamesPboardType').toString('utf8')
  const fromPlist = [...plist.matchAll(/<string>(.*?)<\/string>/g)].map((m) =>
    m[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
  )
  if (fromPlist.length) return fromPlist
  const url = clipboard.readBuffer('public.file-url').toString('utf8').replace(/\0/g, '')
  return url.startsWith('file://') ? [fileURLToPath(url)] : []
}
