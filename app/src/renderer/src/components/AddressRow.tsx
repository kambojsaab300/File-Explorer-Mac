import { useEffect, useRef, useState } from 'react'
import { isSpecial, toDisplay } from '@shared/paths'
import { api } from '@/api/client'
import { crumbsFor, driveIcon, driveLabel, locLabel } from '@/lib/locations'
import { iconOf } from '@/lib/format'
import { locOf, useStore, useTab } from '@/store'
import { Icon } from './Icon'

export function AddressRow() {
  const tab = useTab()
  const { volumes, places, addressEditing, back, forward, up, refresh, go, setSearch, setAddressEditing } = useStore()
  const loc = locOf(tab)
  const [notFound, setNotFound] = useState<string | null>(null)

  return (
    <div className="addressrow">
      <div className="navbtns">
        <button className="navbtn" disabled={tab.i === 0} onClick={back} aria-label="Back">
          <Icon name="u-back" />
        </button>
        <button className="navbtn" disabled={tab.i >= tab.hist.length - 1} onClick={forward} aria-label="Forward">
          <Icon name="u-forward" />
        </button>
        <button className="navbtn" disabled={isSpecial(loc)} onClick={up} aria-label="Up">
          <Icon name="u-up" />
        </button>
        <button className="navbtn" onClick={refresh} aria-label="Refresh">
          <Icon name="u-refresh" />
        </button>
      </div>

      {addressEditing ? (
        <AddressInput
          initial={toDisplay(loc, volumes)}
          onCancel={() => setAddressEditing(false)}
          onSubmit={async (text) => {
            const target = await api.fs.resolveInput(text)
            if (!target) return setNotFound(text)
            setAddressEditing(false)
            go(target)
          }}
        />
      ) : (
        <div className="addr" onClick={(e) => e.target === e.currentTarget && setAddressEditing(true)}>
          <Crumbs loc={loc} />
        </div>
      )}

      <label className="search">
        <input
          placeholder={`Search ${locLabel(loc, volumes, places)}`}
          value={tab.search}
          spellCheck={false}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && setSearch('')}
        />
        <Icon name="u-search" />
      </label>

      {notFound && (
        <div className="toast" role="alert" onClick={() => setNotFound(null)}>
          Khoj can't find '{notFound}'. Check the spelling and try again.
        </div>
      )}
    </div>
  )
}

function Crumbs({ loc }: { loc: string }) {
  const { volumes, places, go, setAddressEditing } = useStore()
  const { root, segs } = crumbsFor(loc, volumes, places)
  const [flyout, setFlyout] = useState<{ loc: string; items: { path: string; name: string; icon: string }[]; x: number; y: number } | null>(null)

  const openChevron = async (e: React.MouseEvent, segLoc: string): Promise<void> => {
    e.stopPropagation()
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    if (flyout?.loc === segLoc) {
      setFlyout(null)
      return
    }

    if (segLoc === 'thispc') {
      const items = volumes.map((v) => ({ path: v.mount, name: driveLabel(v), icon: driveIcon(v) }))
      setFlyout({ loc: segLoc, items, x: r.left, y: r.bottom + 4 })
      return
    }

    if (!isSpecial(segLoc)) {
      try {
        const list = await api.fs.list(segLoc, { hidden: false })
        const dirs = list
          .filter((item) => item.kind === 'dir' || item.kind === 'package')
          .map((item) => ({ path: item.path, name: item.name, icon: iconOf(item) }))
        if (dirs.length) {
          setFlyout({ loc: segLoc, items: dirs, x: r.left, y: r.bottom + 4 })
        }
      } catch {
        // Unreadable
      }
    }
  }

  return (
    <>
      <div className="crumbs">
        <span className="crumb root" onClick={() => setAddressEditing(true)}>
          <Icon name={root} />
        </span>
        {segs.map((s) => (
          <span key={s.loc} className="crumb-group">
            <button className="crumbchev" title="Sub-folders" onClick={(e) => void openChevron(e, s.loc)}>
              <Icon name="u-chevron-right" size={12} />
            </button>
            <button className="crumb" onClick={() => go(s.loc)}>
              {s.label}
            </button>
          </span>
        ))}
      </div>
      <div className="addr-fill" onClick={() => setAddressEditing(true)} />
      {flyout && (
        <div className="crumb-flyout-scrim" onClick={() => setFlyout(null)}>
          <div
            className="flyout crumb-flyout"
            style={{ position: 'fixed', left: flyout.x, top: flyout.y, maxHeight: 320, overflow: 'auto', zIndex: 100 }}
            onClick={(e) => e.stopPropagation()}
          >
            {flyout.items.map((item) => (
              <button
                key={item.path}
                className="mi"
                onClick={() => {
                  setFlyout(null)
                  go(item.path)
                }}
              >
                <Icon name={item.icon} size={16} />
                <span>{item.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

function AddressInput(props: { initial: string; onSubmit(text: string): void; onCancel(): void }) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => ref.current?.select(), [])
  return (
    <div className="addr editing">
      <input
        ref={ref}
        defaultValue={props.initial}
        spellCheck={false}
        autoFocus
        onBlur={props.onCancel}
        onKeyDown={(e) => {
          if (e.key === 'Enter') props.onSubmit(e.currentTarget.value)
          if (e.key === 'Escape') props.onCancel()
        }}
      />
    </div>
  )
}
