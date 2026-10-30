import { toDisplay, parentOf } from '@shared/paths'
import { api } from '@/api/client'
import { fmtDate, iconOf, shortSize, typeOf } from '@/lib/format'
import { driveLabel, locIcon, locLabel } from '@/lib/locations'
import { locOf, useStore, useTab } from '@/store'
import { Icon } from './Icon'
import { openEntry } from './MainArea'

export function DetailsPane() {
  const tab = useTab()
  const { volumes, places, refresh } = useStore()
  const loc = locOf(tab)

  if (loc === 'thispc' && tab.sel.length === 1) {
    const v = volumes.find((x) => x.mount === tab.sel[0])
    if (v) {
      const used = v.total - v.free
      const pct = v.total ? (used / v.total) * 100 : 0
      return (
        <aside className="details">
          <div className="dp-hero">
            <div className="donut" style={{ background: `conic-gradient(var(--c-bar-fill) 0 ${pct}%, var(--c-bar-track) ${pct}% 100%)` }} />
          </div>
          <div className="dp-name">{driveLabel(v)}</div>
          <div className="dp-type">{v.kind === 'system' ? 'Local Disk' : 'External Disk'}</div>
          {v.ejectable && (
            <div className="dp-actions">
              <button className="btn" onClick={() => api.volumes.eject(v.id).then(refresh, (e) => alert(e.message))}>
                <Icon name="u-eject" />
                Eject
              </button>
            </div>
          )}
          <div className="dp-h">Properties</div>
          <div className="kv">
            <span className="k">Used space</span><span className="v">{shortSize(used)}</span>
            <span className="k">Free space</span><span className="v">{shortSize(v.free)}</span>
            <span className="k">Capacity</span><span className="v">{shortSize(v.total)}</span>
            <span className="k">Mount point</span><span className="v">{v.mount}</span>
          </div>
        </aside>
      )
    }
  }

  const selected = tab.items.filter((e) => tab.sel.includes(e.path))

  if (selected.length === 1) {
    const e = selected[0]
    return (
      <aside className="details">
        <div className="dp-hero">
          <Icon name={iconOf(e)} size={96} />
        </div>
        <div className="dp-name">{e.name}</div>
        <div className="dp-type">{typeOf(e)}</div>
        <div className="dp-actions">
          <button className="btn" onClick={() => openEntry(e)}>
            <Icon name="u-open-with" />
            Open
          </button>
        </div>
        <div className="dp-h">Properties</div>
        <div className="kv">
          {e.kind === 'file' && (<><span className="k">Size</span><span className="v">{shortSize(e.size)}</span></>)}
          <span className="k">Date modified</span><span className="v">{fmtDate(e.mtimeMs)}</span>
          <span className="k">Date created</span><span className="v">{fmtDate(e.birthtimeMs)}</span>
          <span className="k">Location</span><span className="v">{toDisplay(parentOf(e.path) ?? '/', volumes)}</span>
        </div>
      </aside>
    )
  }

  if (selected.length > 1) {
    const total = selected.reduce((s, e) => s + e.size, 0)
    return (
      <aside className="details">
        <div className="dp-hero">
          <Icon name="i-folder" size={96} />
        </div>
        <div className="dp-name">{selected.length} items selected</div>
        <div className="dp-type">Total size {shortSize(total)}</div>
      </aside>
    )
  }

  return (
    <aside className="details">
      <div className="dp-hero">
        <Icon name={locIcon(loc, volumes, places)} size={96} />
      </div>
      <div className="dp-name">{locLabel(loc, volumes, places)}</div>
      <div className="dp-type">{tab.items.length} items</div>
      <div className="muted">Select a single file to get more information.</div>
    </aside>
  )
}
