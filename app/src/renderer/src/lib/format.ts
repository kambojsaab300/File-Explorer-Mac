import type { Entry } from '@shared/types'

export function shortSize(n: number): string {
  const units = ['bytes', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  let v = n
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  if (i === 0) return `${n} bytes`
  return `${v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2)} ${units[i]}`
}

// Explorer's Details view always shows sizes in whole KB, rounded up.
export const kbSize = (n: number): string => `${Math.max(1, Math.ceil(n / 1024)).toLocaleString('en-US')} KB`

const pad = (n: number): string => String(n).padStart(2, '0')
export function fmtDate(ms: number): string {
  const d = new Date(ms)
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const TYPE_NAMES: Record<string, string> = {
  txt: 'Text Document', md: 'Markdown File', pdf: 'PDF Document', doc: 'DOC Document', docx: 'DOCX Document',
  xls: 'XLS Worksheet', xlsx: 'XLSX Worksheet', ppt: 'PPT Presentation', pptx: 'PPTX Presentation',
  zip: 'Compressed (zipped) Folder', png: 'PNG File', jpg: 'JPG File', jpeg: 'JPEG File', gif: 'GIF File',
  heic: 'HEIC File', mp3: 'MP3 File', m4a: 'M4A File', wav: 'WAV File', mp4: 'MP4 File', mov: 'MOV File',
  app: 'Application', dmg: 'Disk Image', pkg: 'Installer Package', sh: 'Shell Script', json: 'JSON File',
  js: 'JavaScript File', ts: 'TypeScript File', html: 'HTML Document', css: 'CSS File'
}

export function typeOf(e: Entry): string {
  if (e.kind === 'dir') return 'File folder'
  return TYPE_NAMES[e.ext] ?? (e.ext ? `${e.ext.toUpperCase()} File` : 'File')
}

const ICONS: Record<string, string> = {
  txt: 'file-text', md: 'file-text', rtf: 'file-text', pdf: 'file-pdf', doc: 'file-doc', docx: 'file-doc', pages: 'file-doc',
  xls: 'file-sheet', xlsx: 'file-sheet', csv: 'file-sheet', numbers: 'file-sheet', ppt: 'file-slides', pptx: 'file-slides', key: 'file-slides',
  zip: 'file-archive', rar: 'file-archive', '7z': 'file-archive', gz: 'file-archive', pkg: 'file-archive',
  png: 'file-image', jpg: 'file-image', jpeg: 'file-image', gif: 'file-image', heic: 'file-image', webp: 'file-image', svg: 'file-image',
  mp3: 'file-audio', m4a: 'file-audio', wav: 'file-audio', flac: 'file-audio',
  mp4: 'file-video', mov: 'file-video', mkv: 'file-video', avi: 'file-video',
  app: 'file-app', dmg: 'disk-image', iso: 'disk-image', ttf: 'file-font', otf: 'file-font',
  sh: 'file-code', js: 'file-code', ts: 'file-code', tsx: 'file-code', json: 'file-code', py: 'file-code', html: 'file-code', css: 'file-code', sql: 'file-code'
}

export function iconOf(e: Entry): string {
  if (e.kind === 'dir') return 'i-folder'
  if (e.kind === 'package') return e.ext === 'app' ? 'i-file-app' : 'i-folder'
  return `i-${ICONS[e.ext] ?? 'file-generic'}`
}
