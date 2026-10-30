import { useState } from 'react'
import { copy, currentDir, deleteSelected, paste, startRename, useOps } from '@/actions'
import { useStore, type View } from '@/store'
import { Icon } from './Icon'

const VIEWS: [View, string, string][] = [
  ['large', 'Large icons', 'u-grid'],
  ['medium', 'Medium icons', 'u-grid'],
  ['list', 'List', 'u-list'],
  ['details', 'Details', 'u-details-view'],
  ['tiles', 'Tiles', 'u-tiles'],
  ['content', 'Content', 'u-content']
]

export function CommandBar() {
  const { tabs, active, detailsPane, setView, setSort, toggleDetails } = useStore()
  const clipboard = useOps((s) => s.clipboard)
  const tab = tabs[active]
  const [menu, setMenu] = useState<'view' | 'sort' | null>(null)

  const canWrite = !!currentDir()
  const hasSel = canWrite && tab.sel.length > 0
  const ops: [string, string, boolean, () => void][] = [
    ['u-cut', 'Cut', hasSel, () => copy(true)],
    ['u-copy', 'Copy', hasSel, () => copy()],
    ['u-paste', 'Paste', canWrite && !!clipboard, () => void paste()],
    ['u-rename', 'Rename', canWrite && tab.sel.length === 1, startRename],
    ['u-delete', 'Delete', hasSel, () => void deleteSelected()]
  ]

  return (
    <div className="commandbar" onMouseLeave={() => setMenu(null)}>
      <button
        className="cmd"
        disabled={!canWrite}
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          useOps.setState({ menu: { x: r.left, y: r.bottom + 4, kind: 'new' } })
        }}
      >
        <Icon name="u-new" />
        <span className="lbl">New</span>
        <Icon name="u-chevron-down" size={12} />
      </button>
      <span className="sep-v" />
      {ops.map(([icon, label, enabled, run]) => (
        <button key={label} className="cmd" disabled={!enabled} title={label} onClick={run}>
          <Icon name={icon} />
        </button>
      ))}
      <span className="sep-v" />

      <div className="cmd-wrap">
        <button className={`cmd${menu === 'sort' ? ' open' : ''}`} onClick={() => setMenu(menu === 'sort' ? null : 'sort')}>
          <Icon name="u-sort" />
          <span className="lbl">Sort</span>
          <Icon name="u-chevron-down" size={12} />
        </button>
        {menu === 'sort' && (
          <div className="flyout">
            {(['name', 'date', 'type', 'size'] as const).map((k) => (
              <button key={k} className="mi" onClick={() => (setSort(k), setMenu(null))}>
                <span className="mi-check">{tab.sort.key === k && <Icon name="u-check" size={12} />}</span>
                {{ name: 'Name', date: 'Date modified', type: 'Type', size: 'Size' }[k]}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="cmd-wrap">
        <button className={`cmd${menu === 'view' ? ' open' : ''}`} onClick={() => setMenu(menu === 'view' ? null : 'view')}>
          <Icon name="u-view" />
          <span className="lbl">View</span>
          <Icon name="u-chevron-down" size={12} />
        </button>
        {menu === 'view' && (
          <div className="flyout">
            {VIEWS.map(([v, label, icon]) => (
              <button key={v} className="mi" onClick={() => (setView(v), setMenu(null))}>
                <span className="mi-check">{tab.view === v && <Icon name="u-check" size={12} />}</span>
                <Icon name={icon} />
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      <span className="cmd-spacer" />
      <button className={`cmd${detailsPane ? ' on' : ''}`} onClick={toggleDetails}>
        <Icon name="u-details-pane" />
        <span className="lbl">Details</span>
      </button>
    </div>
  )
}
