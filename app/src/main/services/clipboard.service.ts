import { clipboard, ClipboardItem } from 'electron'
import { fileURLToPath, pathToFileURL } from 'node:url'
import type { Path } from '@shared/types'

// Raw macOS pasteboard types go through Electron's "osclipboard" custom format.
const raw = (format: string): string => `electron application/osclipboard;format="${format}"`
const FILENAMES = raw('NSFilenamesPboardType')
const FILE_URL = raw('public.file-url')

const escapeXml = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// Finder reads the legacy NSFilenamesPboardType (a plist of paths) for multi-file paste.
// This relies on pasteboard internals, so verify it on each macOS release; see docs/06 §5.7.
export async function writeFiles(paths: Path[]): Promise<void> {
  if (process.platform !== 'darwin' || !paths.length) return
  const plist =
    '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">' +
    `<plist version="1.0"><array>${paths.map((p) => `<string>${escapeXml(p)}</string>`).join('')}</array></plist>`
  await clipboard.write([new ClipboardItem({ [FILENAMES]: plist, [FILE_URL]: pathToFileURL(paths[0]).href })])
}

export async function readFiles(): Promise<Path[]> {
  if (process.platform !== 'darwin') return []
  for (const item of await clipboard.read()) {
    if (item.types.includes(FILENAMES)) {
      const plist = await ((await item.getType(FILENAMES)) as Blob).text()
      return [...plist.matchAll(/<string>(.*?)<\/string>/g)].map((m) =>
        m[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
      )
    }
    if (item.types.includes(FILE_URL)) {
      const url = (await ((await item.getType(FILE_URL)) as Blob).text()).replace(/\0/g, '')
      if (url.startsWith('file://')) return [fileURLToPath(url)]
    }
  }
  return []
}
