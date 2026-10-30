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

  const isTerminalCommand = (text: string): boolean => {
    const t = text.trim().toLowerCase()
    return (
      t === 'cmd' ||
      t === 'cmd.exe' ||
      t === 'powershell' ||
      t === 'powershell.exe' ||
      t === 'pwsh' ||
      t === 'terminal' ||
      t === 'wt' ||
      t === 'bash' ||
      t === 'zsh' ||
      t.startsWith('>') ||
      t.startsWith('cmd ')
    )
  }

  const openTerminalAtCurrent = (rawCmd?: string) => {
    const currentPath = isSpecial(loc) ? (places?.home || '/') : loc
    useStore.setState({ terminalOpen: true })
    void api.terminal.setCwd(currentPath)

    const cleanCmd = rawCmd?.trim()
    if (cleanCmd && cleanCmd.startsWith('>')) {
      const toRun = cleanCmd.slice(1).trim()
      if (toRun) {
        void api.terminal.exec(toRun, currentPath)
      }
    } else if (cleanCmd && cleanCmd.toLowerCase().startsWith('cmd ')) {
      const toRun = cleanCmd.slice(4).trim()
      if (toRun) {
        void api.terminal.exec(toRun, currentPath)
      }
    }
  }

  const isCmdQuery = isTerminalCommand(tab.search)

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
            const trimmed = text.trim()
            if (isTerminalCommand(trimmed)) {
              setAddressEditing(false)
              openTerminalAtCurrent(trimmed)
              return
            }
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

      <div className="search-wrap">
        <label className="search">
          <input
            placeholder={`Search ${locLabel(loc, volumes, places)} (type 'cmd' + Enter)`}
            value={tab.search}
            spellCheck={false}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setSearch('')
              } else if (e.key === 'Enter' && isCmdQuery) {
                e.preventDefault()
                openTerminalAtCurrent(tab.search)
                setSearch('')
              }
            }}
          />
          <button
            className="search-terminal-btn"
            type="button"
            title="Open Terminal in this folder (or type 'cmd' + Enter)"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              openTerminalAtCurrent()
            }}
          >
            <Icon name="u-terminal" size={13} />
          </button>
          <Icon name="u-search" />
        </label>

        {isCmdQuery && (
          <div
            className="search-cmd-suggestion"
            onMouseDown={(e) => {
              e.preventDefault()
              openTerminalAtCurrent(tab.search)
              setSearch('')
            }}
          >
            <span className="search-cmd-icon">
              <Icon name="u-terminal" size={13} />
            </span>
            <span className="search-cmd-text">
              Run in Terminal: <strong>{tab.search}</strong>
            </span>
            <span className="search-cmd-badge">↵ Enter</span>
          </div>
        )}
      </div>

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
