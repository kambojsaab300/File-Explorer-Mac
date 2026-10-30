import { useMemo, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { Entry } from '@shared/types'
import { isSpecial, parentOf, toDisplay } from '@shared/paths'
import { api } from '@/api/client'
import { fmtDate, iconOf, kbSize, shortSize, typeOf } from '@/lib/format'
import { driveIcon, driveLabel, knownFolders } from '@/lib/locations'
import { locOf, sortedItems, useStore, useTab, type SortKey } from '@/store'
import { useOps } from '@/actions'
import { dragSource, dropTarget } from '@/dnd'
import { Icon } from './Icon'
import { Name } from './Name'

const openMenu = (e: React.MouseEvent, kind: 'item' | 'background'): void => {
  e.preventDefault()
  useOps.setState({ menu: { x: e.clientX, y: e.clientY, kind } })
}

export function openEntry(e: Entry, inNewTab = false): void {
  const { go, newTab } = useStore.getState()
  if (e.kind === 'dir') return inNewTab ? newTab(e.path) : go(e.path)
  void api.shell.open(e.path)
}

// Explorer selection rules: click selects one, Ctrl/⌘ toggles, Shift extends from the anchor.
function useClickSelect(order: string[]) {
  const tab = useTab()
  const select = useStore((s) => s.select)
  return (path: string, e: React.MouseEvent): void => {
    if (e.shiftKey && tab.anchor) {
      const a = order.indexOf(tab.anchor)
      const b = order.indexOf(path)
      select(order.slice(Math.min(a, b), Math.max(a, b) + 1))
    } else if (e.ctrlKey || e.metaKey) {
      select(tab.sel.includes(path) ? tab.sel.filter((p) => p !== path) : [...tab.sel, path], path)
    } else {
      select([path], path)
    }
  }
}

export function MainArea() {
  const tab = useTab()
  const loc = locOf(tab)

  let body: React.ReactNode
  if (loc === 'thispc') body = <ThisPC />
  else if (loc === 'home') body = <Home />
  else if (isSpecial(loc)) body = <Placeholder loc={loc} />
  else if (tab.status === 'error') body = <ErrorState />
  else body = <FolderView />

  return (
    <div className={`main v-${isSpecial(loc) ? 'page' : tab.view}`} tabIndex={-1}>
      {body}
    </div>
  )
}

function ThisPC() {
  const { volumes } = useStore()
  const tab = useTab()
  const go = useStore((s) => s.go)
  const onClick = useClickSelect(volumes.map((v) => v.mount))
  return (
    <div className="scroll">
      <div className="ghead">
        <Icon name="u-chevron-down" size={12} />
        <span>Devices and drives</span>
      </div>
      <div className="drives">
        {volumes.map((v) => {
          const used = v.total ? (v.total - v.free) / v.total : 0
          return (
            <div
              key={v.id}
              className={`drive it${tab.sel.includes(v.mount) ? ' sel' : ''}`}
              onClick={(e) => onClick(v.mount, e)}
              onDoubleClick={() => go(v.mount)}
            >
              <Icon name={driveIcon(v)} size={48} />
              <div className="meta">
                <span className="n">{driveLabel(v)}</span>
                <div className={`dbar${v.total && v.free / v.total < 0.1 ? ' low' : ''}`}>
                  <i style={{ width: `${(used * 100).toFixed(1)}%` }} />
                </div>
                <span className="free">
                  {shortSize(v.free)} free of {shortSize(v.total)}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Home() {
  const { places, go } = useStore()
  return (
    <div className="scroll">
      <div className="ghead">
        <Icon name="u-chevron-down" size={12} />
        <span>Quick access</span>
      </div>
      <div className="qa">
        {Object.entries(knownFolders(places)).map(([loc, k]) => (
          <div key={loc} className="it" onDoubleClick={() => go(loc)}>
            <Icon name={k.icon} size={48} />
            <div>
              <div>{k.label}</div>
              <div className="sub">Stored locally</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// macOS privacy protection (TCC) blocks Desktop, Documents, Downloads and external drives
// until the user allows it; point them at the right System Settings pane.
function ErrorState() {
  const tab = useTab()
  return (
    <div className="empty">
      <Icon name={tab.errorKind === 'permission' ? 'u-lock' : 'u-alert'} size={32} />
      <p>{tab.error}</p>
      {tab.errorKind === 'permission' && api.platform === 'darwin' && (
        <div className="dp-actions" style={{ justifyContent: 'center' }}>
          <button className="btn primary" onClick={() => api.app.openPrivacySettings('files')}>
            Grant access
          </button>
          <button className="btn" onClick={() => useStore.getState().refresh()}>
            Try again
          </button>
        </div>
      )}
    </div>
  )
}

function Placeholder({ loc }: { loc: string }) {
  const text: Record<string, string> = {
    gallery: 'Gallery arrives in version 1.1.',
    network: 'Network locations arrive in version 1.1.',
    trash: 'Trash browsing arrives with file operations.'
  }
  return <div className="empty">{text[loc]}</div>
}

function FolderView() {
  const tab = useTab()
  const items = useMemo(() => sortedItems(tab), [tab.items, tab.results, tab.sort, tab.search])
  const order = useMemo(() => items.map((e) => e.path), [items])
  const onClick = useClickSelect(order)
  const clearSel = useStore((s) => s.select)
  const clipboard = useOps((s) => s.clipboard)
  const cut = new Set(clipboard?.cut ? clipboard.paths : [])

  if (tab.status === 'loading' && !tab.items.length) return <div className="empty">Working on it…</div>

  const itemProps = (e: Entry) => ({
    className: `it${tab.sel.includes(e.path) ? ' sel' : ''}${cut.has(e.path) ? ' cut' : ''}`,
    onClick: (ev: React.MouseEvent) => onClick(e.path, ev),
    onDoubleClick: () => openEntry(e),
    onAuxClick: (ev: React.MouseEvent) => ev.button === 1 && openEntry(e, true),
    onContextMenu: (ev: React.MouseEvent) => {
      ev.stopPropagation()
      if (!tab.sel.includes(e.path)) clearSel([e.path], e.path)
      openMenu(ev, 'item')
    },
    ...dragSource(e.path),
    ...(e.kind === 'dir' ? dropTarget(e.path) : {})
  })

  // Right-click or drop on empty space targets the folder itself.
  const backgroundProps = {
    onClick: (e: React.MouseEvent) => e.target === e.currentTarget && clearSel([], null),
    onContextMenu: (e: React.MouseEvent) => {
      clearSel([], null)
      openMenu(e, 'background')
    },
    ...dropTarget(locOf(tab))
  }

  if (!items.length) {
    return (
      <div className="scroll" {...backgroundProps}>
        <div className="empty">{tab.search ? 'No items match your search.' : 'This folder is empty.'}</div>
      </div>
    )
  }

  if (tab.view === 'details') return <DetailsList items={items} itemProps={itemProps} backgroundProps={backgroundProps} />

  const size = tab.view === 'large' ? 96 : tab.view === 'medium' || tab.view === 'tiles' ? 48 : tab.view === 'content' ? 32 : 16
  return (
    <div className="scroll" {...backgroundProps}>
      <div className="items">
        {items.map((e) => (
          <div key={e.path} {...itemProps(e)}>
            {tab.view === 'content' ? (
              <>
                <div className="a">
                  <Icon name={iconOf(e)} size={size} />
                  <div className="tx">
                    <Name entry={e} />
                    {e.kind !== 'dir' && (
                      <div className="sub">
                        Type: <b>{typeOf(e)}</b>
                      </div>
                    )}
                  </div>
                </div>
                <div className="b">
                  <span>
                    Date modified: <b>{fmtDate(e.mtimeMs)}</b>
                  </span>
                  {e.kind === 'file' && (
                    <span>
                      Size: <b>{shortSize(e.size)}</b>
                    </span>
                  )}
                </div>
              </>
            ) : tab.view === 'tiles' ? (
              <>
                <Icon name={iconOf(e)} size={size} />
                <div className="tx">
                  <Name entry={e} />
                  <span className="sub">{typeOf(e)}</span>
                  {e.kind === 'file' && <span className="sub">{shortSize(e.size)}</span>}
                </div>
              </>
            ) : (
              <>
                <Icon name={iconOf(e)} size={size} />
                <Name entry={e} />
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

const COLUMNS: [SortKey, string][] = [
  ['name', 'Name'],
  ['date', 'Date modified'],
  ['type', 'Type'],
  ['size', 'Size']
]

function DetailsList(props: { items: Entry[]; itemProps: (e: Entry) => object; backgroundProps: object }) {
  const { items, itemProps, backgroundProps } = props
  const tab = useTab()
  const setSort = useStore((s) => s.setSort)
  const volumes = useStore((s) => s.volumes)
  // Search results come from many folders, so the third column shows where each one lives.
  const searching = !!(tab.search.trim() && tab.results)
  const scrollRef = useRef<HTMLDivElement>(null)
  // Rows are virtualised so folders with tens of thousands of entries stay smooth.
  const rows = useVirtualizer({ count: items.length, getScrollElement: () => scrollRef.current, estimateSize: () => 32, overscan: 12 })

  return (
    <div className="scroll" ref={scrollRef} {...backgroundProps}>
      <div className="hdr">
        {COLUMNS.map(([key, label]) => (
          <div key={key} onClick={() => setSort(key)}>
            {searching && key === 'type' ? 'Folder' : label}
            {tab.sort.key === key && (
              <span className="arrow">
                <Icon name={tab.sort.dir > 0 ? 'u-chevron-up' : 'u-chevron-down'} size={10} />
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="items" style={{ height: rows.getTotalSize(), position: 'relative' }}>
        {rows.getVirtualItems().map((r) => {
          const e = items[r.index]
          return (
            <div key={e.path} {...itemProps(e)} style={{ position: 'absolute', top: r.start, left: 6, right: 6 }}>
              <div>
                <Icon name={iconOf(e)} />
                <Name entry={e} />
              </div>
              <div>{fmtDate(e.mtimeMs)}</div>
              <div>{searching ? toDisplay(parentOf(e.path) ?? '/', volumes) : typeOf(e)}</div>
              <div>{e.kind === 'file' ? kbSize(e.size) : ''}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
