import { useState } from 'react'
import { compressSelected, copy, currentDir, deleteSelected, emptyTrash, paste, showProperties, startRename, useOps } from '@/actions'
import { locOf, useStore, type View } from '@/store'
import { t } from '@/lib/i18n'
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
  const { tabs, active, detailsPane, activePane, splitView, prefs, setPref, setView, setSort, toggleDetails, togglePreview, toggleSplitView } = useStore()
  const clipboard = useOps((s) => s.clipboard)
  const tab = tabs[active]
  const [menu, setMenu] = useState<'view' | 'sort' | 'more' | null>(null)

  const canWrite = !!currentDir()
  const hasSel = canWrite && tab.sel.length > 0
  const ops: [string, string, boolean, () => void][] = [
    ['u-cut', 'Cut', hasSel, () => copy(true)],
    ['u-copy', 'Copy', hasSel, () => copy()],
    ['u-paste', 'Paste', canWrite && !!clipboard, () => void paste()],
    ['u-rename', 'Rename', canWrite && tab.sel.length > 0, startRename],
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
      {locOf(tab) === 'trash' && (
        <>
          <button className="cmd" onClick={emptyTrash}>
            <Icon name="u-delete" />
            <span className="lbl">Empty Recycle Bin</span>
          </button>
          <span className="sep-v" />
        </>
      )}
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
            <div style={{ height: 1, background: 'var(--c-divider-strong)', margin: '4px 0' }} />
            <button className="mi" onClick={() => (togglePreview(), setMenu(null))}>
              <span className="mi-check">{detailsPane && activePane === 'preview' && <Icon name="u-check" size={12} />}</span>
              <Icon name="u-preview-pane" />
              Preview pane
            </button>
            <button className="mi" onClick={() => (toggleDetails(), setMenu(null))}>
              <span className="mi-check">{detailsPane && activePane === 'details' && <Icon name="u-check" size={12} />}</span>
              <Icon name="u-details-pane" />
              Details pane
            </button>
            <div style={{ height: 1, background: 'var(--c-divider-strong)', margin: '4px 0' }} />
            <button className="mi" onClick={() => (toggleSplitView(), setMenu(null))}>
              <span className="mi-check">{splitView && <Icon name="u-check" size={12} />}</span>
              <Icon name="u-split" />
              Split view (Dual pane)
            </button>
            <div style={{ height: 1, background: 'var(--c-divider-strong)', margin: '4px 0' }} />
            <button className="mi" onClick={() => (setPref('compact', !prefs.compact), setMenu(null))}>
              <span className="mi-check">{prefs.compact && <Icon name="u-check" size={12} />}</span>
              <Icon name="u-list" />
              Compact view
            </button>
          </div>
        )}
      </div>

      <div className="cmd-wrap">
        <button className={`cmd${menu === 'more' ? ' open' : ''}`} title="See more" onClick={() => setMenu(menu === 'more' ? null : 'more')}>
          <Icon name="u-more" />
        </button>
        {menu === 'more' && (
          <div className="flyout" style={{ minWidth: 180, right: 0, left: 'auto' }}>
            <button className="mi" disabled={!hasSel} onClick={() => (void compressSelected(), setMenu(null))}>
              <Icon name="u-zip" />
              Compress to ZIP
            </button>
            <button className="mi" disabled={!canWrite} onClick={() => (void showProperties(), setMenu(null))}>
              <Icon name="u-properties" />
              Properties
            </button>
            <div style={{ height: 1, background: 'var(--c-divider-strong)', margin: '4px 0' }} />
            <button className="mi" onClick={() => (useStore.setState({ showOptions: true }), setMenu(null))}>
              Options
            </button>
          </div>
        )}
      </div>

      <span className="cmd-spacer" />
      <button
        className={`cmd${detailsPane && activePane === 'preview' ? ' on' : ''}`}
        title="Preview pane (Alt+P)"
        onClick={togglePreview}
      >
        <Icon name="u-preview-pane" />
        <span className="lbl">Preview</span>
      </button>
      <button
        className={`cmd${detailsPane && activePane === 'details' ? ' on' : ''}`}
        title="Details pane (Alt+Shift+P)"
        onClick={toggleDetails}
      >
        <Icon name="u-details-pane" />
        <span className="lbl">Details</span>
      </button>
      <button
        className={`cmd${splitView ? ' on' : ''}`}
        title="Split view (Dual pane, Alt+2)"
        onClick={toggleSplitView}
      >
        <Icon name="u-split" />
        <span className="lbl">{t('splitView', prefs.lang)}</span>
      </button>
    </div>
  )
}
