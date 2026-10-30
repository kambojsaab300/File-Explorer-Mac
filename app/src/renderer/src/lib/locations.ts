import type { Places, Volume } from '@shared/types'
import { baseName, isSpecial, joinPath, SPECIAL_LABELS, volumeOf } from '@shared/paths'

const SPECIAL_ICONS = { home: 'i-home', gallery: 'i-gallery', thispc: 'i-this-mac', network: 'i-network', trash: 'i-trash' }

const DRIVE_ICONS: Record<Volume['kind'], string> = {
  system: 'i-drive-system', external: 'i-drive-external', usb: 'i-drive-usb', network: 'i-drive-network', image: 'i-disk-image'
}
export const driveIcon = (v: Volume): string => DRIVE_ICONS[v.kind]
export const driveLabel = (v: Volume): string => `${v.name} (${v.letter}:)`

// Well-known folders get Windows names and icons ("Movies" shows as "Videos").
export function knownFolders(p: Places | null): Record<string, { label: string; icon: string }> {
  if (!p) return {}
  return {
    [p.desktop]: { label: 'Desktop', icon: 'i-desktop' },
    [p.downloads]: { label: 'Downloads', icon: 'i-downloads' },
    [p.documents]: { label: 'Documents', icon: 'i-documents' },
    [p.pictures]: { label: 'Pictures', icon: 'i-pictures' },
    [p.music]: { label: 'Music', icon: 'i-music' },
    [p.videos]: { label: 'Videos', icon: 'i-videos' }
  }
}

export function locLabel(loc: string, vols: Volume[], places: Places | null): string {
  if (isSpecial(loc)) return SPECIAL_LABELS[loc]
  const known = knownFolders(places)[loc]
  if (known) return known.label
  const vol = vols.find((v) => v.mount === loc)
  return vol ? driveLabel(vol) : baseName(loc) || loc
}

export function locIcon(loc: string, vols: Volume[], places: Places | null): string {
  if (isSpecial(loc)) return SPECIAL_ICONS[loc]
  const vol = vols.find((v) => v.mount === loc)
  if (vol) return driveIcon(vol)
  return knownFolders(places)[loc]?.icon ?? 'i-folder'
}

export interface Crumb {
  label: string
  loc: string
}

export function crumbsFor(loc: string, vols: Volume[], places: Places | null): { root: string; segs: Crumb[] } {
  if (isSpecial(loc)) return { root: SPECIAL_ICONS[loc], segs: [{ label: SPECIAL_LABELS[loc], loc }] }

  const known = knownFolders(places)
  const walk = (base: string, rest: string, segs: Crumb[]): Crumb[] => {
    let acc = base
    for (const part of rest.split('/').filter(Boolean)) {
      acc = joinPath(acc, part)
      segs.push({ label: known[acc]?.label ?? part, loc: acc })
    }
    return segs
  }

  // Inside the home folder the breadcrumb starts at the user, like Explorer's "C:\Users\you" shortcut.
  const home = places?.home
  if (home && (loc === home || loc.startsWith(home + '/'))) {
    return { root: 'i-home', segs: walk(home, loc.slice(home.length), [{ label: baseName(home), loc: home }]) }
  }

  const vol = volumeOf(loc, vols)
  if (!vol) return { root: 'i-folder', segs: [{ label: loc, loc }] }
  const segs = walk(vol.mount, loc.slice(vol.mount.length), [
    { label: 'This PC', loc: 'thispc' },
    { label: driveLabel(vol), loc: vol.mount }
  ])
  return { root: 'i-this-mac', segs }
}
