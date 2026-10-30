import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { api } from '@/api/client'
import {
  compressSelected, copy, copyAsPath, currentDir, deleteSelected, newFolder, newTextFile,
  openExtractDialog, openInTerminal, paste, revealSelected, selectedEntries, showProperties,
  startRename, undo, useOps
} from '@/actions'
import { useStore } from '@/store'
import { Icon } from './Icon'
import { openEntry } from './MainArea'

interface Item {
  label: string
  icon?: string
  accel?: string
  disabled?: boolean
  run: () => void
}

const isMac = navigator.platform.startsWith('Mac')
const mod = isMac ? '⌘' : 'Ctrl+'

function itemMenu(): { row: Item[]; list: (Item | '-')[] } {
  const sel = selectedEntries()
  const one = sel.length === 1 ? sel[0] : null
  const { clipboard } = useOps.getState()
  const isZip = !!one?.name.toLowerCase().endsWith('.zip')
  const isPackage =
    one?.kind === 'package' ||
    (one && ['.app', '.bundle', '.framework', '.photoslibrary'].some((ext) => one.name.toLowerCase().endsWith(ext)))

  return {
    // Windows 11 puts the common verbs in an icon row at the top of the menu.
    row: [
      { label: 'Cut', icon: 'u-cut', run: () => copy(true) },
      { label: 'Copy', icon: 'u-copy', run: () => copy() },
      { label: 'Rename', icon: 'u-rename', disabled: sel.length === 0, run: startRename },
      { label: 'Delete', icon: 'u-delete', run: () => void deleteSelected() }
    ],
    list: [
      { label: 'Open', icon: 'u-open-with', accel: 'Enter', disabled: !one, run: () => one && openEntry(one) },
      ...(one?.kind === 'dir' ? [{ label: 'Open in new tab', icon: 'u-tab-new', run: () => openEntry(one, true) }] : []),
      ...(isPackage ? [{ label: 'Show package contents', icon: 'u-folder', run: () => useStore.getState().go(one!.path) }] : []),
      ...(one?.kind === 'file' ? [{ label: 'Quick Look', icon: 'u-quicklook', accel: 'Space', run: () => api.window.quickLook(one.path) }] : []),
      ...(one ? [{ label: 'Open with...', icon: 'u-open-with', run: () => void api.shell.openWith(one.path) }] : []),
      ...(one?.kind === 'dir'
        ? [
            {
              label: useStore.getState().pinned.includes(one.path) ? 'Unpin from Quick access' : 'Pin to Quick access',
              icon: useStore.getState().pinned.includes(one.path) ? 'u-unpin' : 'u-pin',
              run: () => useStore.getState().togglePin(one.path)
            }
          ]
        : []),
      ...(isZip ? [{ label: 'Extract All...', icon: 'u-extract', run: () => openExtractDialog(one?.path) }] : []),
      { label: 'Compress to ZIP file', icon: 'u-zip', run: () => void compressSelected() },
      '-',
      ...(one?.kind === 'dir' && clipboard ? [{ label: 'Paste into folder', icon: 'u-paste', run: () => void paste(one.path) }] : []),
      { label: 'Copy as path', icon: 'u-link', accel: 'Ctrl+Shift+C', run: copyAsPath },
      { label: 'Show in Finder', icon: 'u-folder', run: revealSelected },
      { label: 'Open in Terminal', icon: 'u-terminal', run: openInTerminal },
      '-',
      { label: 'Properties', icon: 'u-properties', accel: 'Alt+Enter', run: () => void showProperties(one?.path) }
    ]
  }
}

function backgroundMenu(): (Item | '-')[] {
  const { clipboard, undoStack } = useOps.getState()
  const canWrite = !!currentDir()
  return [
    { label: 'Refresh', icon: 'u-refresh', accel: 'F5', run: () => useStore.getState().refresh() },
    '-',
    { label: 'Paste', icon: 'u-paste', accel: `${mod}V`, disabled: !clipboard || !canWrite, run: () => void paste() },
    { label: 'Undo', icon: 'u-undo', accel: `${mod}Z`, disabled: !undoStack.length, run: () => void undo() },
    '-',
    { label: 'New folder', icon: 'u-new-folder', accel: `${mod}Shift+N`, disabled: !canWrite, run: () => void newFolder() },
    { label: 'New text document', icon: 'u-new-file', disabled: !canWrite, run: () => void newTextFile() },
    '-',
    { label: 'Copy as path', icon: 'u-link', disabled: !canWrite, run: copyAsPath },
    { label: 'Open in Terminal', icon: 'u-terminal', disabled: !canWrite, run: openInTerminal },
    '-',
    { label: 'Properties', icon: 'u-properties', accel: 'Alt+Enter', disabled: !currentDir(), run: () => void showProperties(currentDir() ?? undefined) }
  ]
}

const newMenu = (): (Item | '-')[] => [
  { label: 'Folder', icon: 'u-new-folder', accel: `${mod}Shift+N`, run: () => void newFolder() },
  '-',
  { label: 'Text Document', icon: 'u-new-file', run: () => void newTextFile() }
]

export function ContextMenu() {
  const menu = useOps((s) => s.menu)
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const close = (): void => useOps.setState({ menu: null })

  // Keep the menu on screen when opened near the right or bottom edge.
  useLayoutEffect(() => {
    if (!menu || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    setPos({ x: Math.min(menu.x, innerWidth - r.width - 4), y: Math.min(menu.y, innerHeight - r.height - 4) })
  }, [menu])

  useEffect(() => {
    if (!menu) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') close()
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [menu])

  if (!menu) return null
  const { row, list } =
    menu.kind === 'item' ? itemMenu() : { row: [], list: menu.kind === 'new' ? newMenu() : backgroundMenu() }
  const run = (item: Item) => () => {
    close()
    item.run()
  }

  return (
    <div className="menu-scrim" onMouseDown={close} onContextMenu={(e) => (e.preventDefault(), close())}>
      <div className="menu" ref={ref} style={{ left: pos.x, top: pos.y }} onMouseDown={(e) => e.stopPropagation()}>
        {row.length > 0 && (
          <>
            <div className="menu-row">
              {row.map((item) => (
                <button key={item.label} title={item.label} disabled={item.disabled} onClick={run(item)}>
                  <Icon name={item.icon!} />
                </button>
              ))}
            </div>
            <div className="msep" />
          </>
        )}
        {list.map((item, i) =>
          item === '-' ? (
            <div key={i} className="msep" />
          ) : (
            <button key={item.label} className="mi" disabled={item.disabled} onClick={run(item)}>
              <span className="mi-icon">{item.icon && <Icon name={item.icon} />}</span>
              {item.label}
              {item.accel && <span className="acc">{item.accel}</span>}
            </button>
          )
        )}
      </div>
    </div>
  )
}
