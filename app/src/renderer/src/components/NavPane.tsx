import { useState } from 'react'
import { baseName, isSpecial } from '@shared/paths'
import { api } from '@/api/client'
import { dropTarget } from '@/dnd'
import { driveIcon, driveLabel, knownFolders } from '@/lib/locations'
import { locOf, useStore } from '@/store'
import { useOps } from '@/actions'
import { Icon } from './Icon'

const navCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

interface RowProps {
  loc: string
  label: string
  icon: string
  depth?: number
  expandable?: boolean
  pinned?: boolean
}

export function NavPane() {
  const { places, volumes, pinned } = useStore()
  const quick = Object.entries(knownFolders(places))
  const customPinned = (pinned ?? []).filter((p) => !quick.some(([loc]) => loc === p))

  return (
    <nav className="nav" tabIndex={-1}>
      <Row loc="home" label="Home" icon="i-home" />
      <Row loc="gallery" label="Gallery" icon="i-gallery" />
      <Row loc="recent" label="Recent" icon="i-recent" />
      <div className="nav-sep" />
      {quick.map(([loc, k]) => (
        <Row key={loc} loc={loc} label={k.label} icon={k.icon} expandable pinned />
      ))}
      {customPinned.map((p) => (
        <Row key={p} loc={p} label={baseName(p)} icon="i-folder-pinned" expandable pinned />
      ))}
      <div className="nav-sep" />
      <Row loc="thispc" label="This PC" icon="i-this-mac" expandable defaultOpen>
        {volumes.map((v) => (
          <Row key={v.id} loc={v.mount} label={driveLabel(v)} icon={driveIcon(v)} depth={1} expandable />
        ))}
      </Row>
      <Row loc="network" label="Network" icon="i-network" />
      <Row loc="trash" label="Trash" icon="i-trash" />
    </nav>
  )
}

function Row(props: RowProps & { defaultOpen?: boolean; children?: React.ReactNode }) {
  const { loc, label, icon, depth = 0, expandable, pinned, defaultOpen, children } = props
  const selected = useStore((s) => locOf(s.tabs[s.active]) === loc)
  const go = useStore((s) => s.go)
  const [open, setOpen] = useState(!!defaultOpen)
  // Sub-folders are fetched the first time a real folder row is expanded.
  const [subdirs, setSubdirs] = useState<{ path: string; name: string }[] | null>(null)

  async function toggle(e: React.MouseEvent): Promise<void> {
    e.stopPropagation()
    if (!open && !children && subdirs === null) {
      const entries = await api.fs.list(loc).catch(() => [])
      setSubdirs(
        entries
          .filter((x) => x.kind === 'dir')
          .sort((a, b) => navCollator.compare(a.name, b.name))
          .map((x) => ({ path: x.path, name: x.name }))
      )
    }
    setOpen(!open)
  }

  return (
    <>
      <div
        className={`nav-item${selected ? ' sel' : ''}`}
        style={{ paddingLeft: depth * 8 }}
        onClick={() => go(loc)}
        onContextMenu={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (!isSpecial(loc)) {
            useStore.getState().select([loc], loc)
            useOps.setState({ menu: { x: e.clientX, y: e.clientY, kind: 'item' } })
          }
        }}
        {...dropTarget(isSpecial(loc) ? null : loc)}
      >
        <span className={`chev${expandable ? '' : ' none'}`} onClick={expandable ? toggle : undefined}>
          {expandable && <Icon name={open ? 'u-chevron-down' : 'u-chevron-right'} size={12} />}
        </span>
        <Icon name={icon} />
        <span className="name">{label}</span>
        {pinned && (
          <span
            className="pin"
            title="Quick access pin"
            onClick={(e) => {
              e.stopPropagation()
              useStore.getState().togglePin(loc)
            }}
          >
            <Icon name="u-pin" size={14} />
          </span>
        )}
      </div>
      {open && children}
      {open &&
        subdirs?.map((d) => <Row key={d.path} loc={d.path} label={d.name} icon="i-folder" depth={depth + 1} expandable />)}
    </>
  )
}
