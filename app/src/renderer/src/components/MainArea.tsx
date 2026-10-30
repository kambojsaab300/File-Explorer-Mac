import { useEffect, useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { Entry } from '@shared/types'
import { baseName, isSpecial, parentOf, toDisplay } from '@shared/paths'
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
  else if (loc === 'gallery') body = <Gallery />
  else if (loc === 'network') body = <NetworkView />
  else if (loc === 'trash') body = <FolderView />
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
  const { places, volumes, go, pinned } = useStore()
  const [tab, setTab] = useState<'recent' | 'favorites'>('recent')
  const [recents, setRecents] = useState<Entry[]>([])
  const [loading, setLoading] = useState(false)

  const quick = Object.entries(knownFolders(places))
  const customPinned = (pinned ?? []).filter((p) => !quick.some(([loc]) => loc === p))

  useEffect(() => {
    let cancelled = false
    async function loadRecent(): Promise<void> {
      if (!places) return
      setLoading(true)
      try {
        const targets = [places.desktop, places.documents, places.downloads]
        const lists = await Promise.all(targets.map((dir) => api.fs.list(dir).catch(() => [])))
        if (cancelled) return
        const files = lists.flat().filter((e) => e.kind === 'file')
        files.sort((a, b) => b.mtimeMs - a.mtimeMs)
        setRecents(files.slice(0, 15))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void loadRecent()
    return () => {
      cancelled = true
    }
  }, [places])

  return (
    <div className="scroll">
      <div className="ghead">
        <Icon name="u-chevron-down" size={12} />
        <span>Quick access</span>
      </div>
      <div className="qa">
        {quick.map(([loc, k]) => (
          <div key={loc} className="it" onDoubleClick={() => go(loc)}>
            <Icon name={k.icon} size={48} />
            <div>
              <div>{k.label}</div>
              <div className="sub">Stored locally</div>
            </div>
          </div>
        ))}
        {customPinned.map((p) => (
          <div key={p} className="it" onDoubleClick={() => go(p)}>
            <Icon name="i-folder-pinned" size={48} />
            <div>
              <div>{baseName(p)}</div>
              <div className="sub">Pinned folder</div>
            </div>
          </div>
        ))}
      </div>

      <div className="pills" style={{ marginTop: 12 }}>
        <button className={`pill${tab === 'recent' ? ' on' : ''}`} onClick={() => setTab('recent')}>
          Recent
        </button>
        <button className={`pill${tab === 'favorites' ? ' on' : ''}`} onClick={() => setTab('favorites')}>
          Favorites
        </button>
      </div>

      {tab === 'recent' && (
        <div className="v-details" style={{ margin: '0 12px 24px' }}>
          <div className="hdr">
            <div>Name</div>
            <div>Date modified</div>
            <div>Location</div>
            <div>Size</div>
          </div>
          <div className="items">
            {recents.map((e) => (
              <div key={e.path} className="it" onDoubleClick={() => openEntry(e)}>
                <div>
                  <Icon name={iconOf(e)} />
                  <span className="nm">{e.name}</span>
                </div>
                <div>{fmtDate(e.mtimeMs)}</div>
                <div>{toDisplay(parentOf(e.path) ?? '/', volumes)}</div>
                <div>{kbSize(e.size)}</div>
              </div>
            ))}
            {!recents.length && !loading && (
              <div className="empty" style={{ padding: '24px 0' }}>
                No recent files found.
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'favorites' && (
        <div className="empty" style={{ padding: '36px 0' }}>
          Right-click any folder to pin it to Quick access, or star files to see them here.
        </div>
      )}
    </div>
  )
}

function Gallery() {
  const { places } = useStore()
  const [images, setImages] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function loadImages(): Promise<void> {
      if (!places?.pictures) return
      setLoading(true)
      try {
        const entries = await api.fs.list(places.pictures, { hidden: false }).catch(() => [])
        const imageExts = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'svg', 'bmp'])
        const filtered = entries.filter((e) => e.kind === 'file' && imageExts.has(e.ext))
        filtered.sort((a, b) => b.mtimeMs - a.mtimeMs)
        if (!cancelled) setImages(filtered)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void loadImages()
    return () => {
      cancelled = true
    }
  }, [places?.pictures])

  const groups: Record<string, Entry[]> = {}
  for (const img of images) {
    const d = new Date(img.mtimeMs)
    const key = d.toLocaleString('en-US', { month: 'long', year: 'numeric' })
    if (!groups[key]) groups[key] = []
    groups[key].push(img)
  }

  return (
    <div className="scroll">
      {Object.entries(groups).map(([month, items]) => (
        <div key={month} style={{ marginBottom: 16 }}>
          <div className="ghead">
            <Icon name="u-chevron-down" size={12} />
            <span>{month}</span>
          </div>
          <div className="gal">
            {items.map((e) => (
              <div key={e.path} className="it" title={e.name} onDoubleClick={() => openEntry(e)}>
                <Icon name={iconOf(e)} size={64} />
                <span className="gal-name">{e.name}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
      {!images.length && !loading && (
        <div className="empty" style={{ padding: '48px 0' }}>
          <Icon name="i-gallery" size={48} />
          <p style={{ marginTop: 12 }}>No pictures found in your Pictures folder.</p>
        </div>
      )}
    </div>
  )
}

function NetworkView() {
  const { volumes } = useStore()
  const [mappingOpen, setMappingOpen] = useState(false)
  const [server, setServer] = useState('')
  const netDrives = volumes.filter((v) => v.kind === 'network')

  return (
    <div className="scroll">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 14 }}>
        <div className="ghead">
          <Icon name="u-chevron-down" size={12} />
          <span>Network locations</span>
        </div>
        <button className="btn" style={{ height: 28, fontSize: 12, gap: 6 }} onClick={() => setMappingOpen(true)}>
          <Icon name="i-drive-network" size={16} />
          Map network drive...
        </button>
      </div>

      <div className="drives">
        <div className="drive it" onDoubleClick={() => void api.shell.open('smb://')}>
          <Icon name="i-network" size={48} />
          <div className="meta">
            <div className="n">Local Network</div>
            <div className="free">Browse Bonjour &amp; SMB shares</div>
          </div>
        </div>
        {netDrives.map((v) => (
          <div key={v.id} className="drive it" onDoubleClick={() => useStore.getState().go(v.mount)}>
            <Icon name="i-drive-network" size={48} />
            <div className="meta">
              <div className="n">{driveLabel(v)}</div>
              <div className="free">Connected share</div>
            </div>
          </div>
        ))}
      </div>

      {mappingOpen && (
        <div className="scrim" onMouseDown={() => setMappingOpen(false)}>
          <div className="dlg" role="dialog" onMouseDown={(e) => e.stopPropagation()} style={{ width: 480 }}>
            <div className="bd">
              <h2>Map Network Drive</h2>
              <div className="muted" style={{ marginBottom: 14, fontSize: 13 }}>
                What network folder would you like to map? Specify the server address (e.g. smb://server/share).
              </div>
              <div style={{ marginBottom: 8, fontSize: 13 }}>Folder address:</div>
              <input
                type="text"
                placeholder="smb://192.168.1.100/share"
                value={server}
                onChange={(e) => setServer(e.target.value)}
                style={{
                  width: '100%',
                  height: 32,
                  padding: '0 8px',
                  borderRadius: 4,
                  border: '1px solid var(--c-overlay-border)',
                  background: 'var(--c-bg)',
                  color: 'var(--c-text)',
                  fontSize: 13,
                  marginBottom: 12
                }}
              />
            </div>
            <div className="ft">
              <button
                className="btn primary"
                disabled={!server.trim()}
                onClick={() => {
                  setMappingOpen(false)
                  const target = server.startsWith('smb://') ? server : `smb://${server}`
                  void api.shell.open(target)
                }}
              >
                Connect
              </button>
              <button className="btn" onClick={() => setMappingOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
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
    network: 'Network locations arrive with SMB discovery.'
  }
  return <div className="empty">{text[loc] ?? 'This location is empty.'}</div>
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
