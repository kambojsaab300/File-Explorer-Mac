import { useState } from 'react'
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

// File operations arrive in Phase 2; their buttons are shown disabled so the bar already looks right.
const FILE_OPS: [string, string][] = [
  ['u-cut', 'Cut'], ['u-copy', 'Copy'], ['u-paste', 'Paste'], ['u-rename', 'Rename'], ['u-share', 'Share'], ['u-delete', 'Delete']
]

export function CommandBar() {
  const { tabs, active, detailsPane, setView, setSort, toggleDetails } = useStore()
  const tab = tabs[active]
  const [menu, setMenu] = useState<'view' | 'sort' | null>(null)

  return (
    <div className="commandbar" onMouseLeave={() => setMenu(null)}>
      <button className="cmd" disabled>
        <Icon name="u-new" />
        <span className="lbl">New</span>
        <Icon name="u-chevron-down" size={12} />
      </button>
      <span className="sep-v" />
      {FILE_OPS.map(([icon, label]) => (
        <button key={label} className="cmd" disabled title={label}>
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
