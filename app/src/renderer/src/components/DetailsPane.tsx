import { useEffect, useState } from 'react'
import type { PreviewData } from '@shared/types'
import { toDisplay, parentOf } from '@shared/paths'
import { api } from '@/api/client'
import { fmtDate, iconOf, shortSize, typeOf } from '@/lib/format'
import { driveLabel, locIcon, locLabel } from '@/lib/locations'
import { locOf, useStore, useTab, visibleEntries } from '@/store'
import { Icon } from './Icon'
import { openEntry } from './MainArea'

export function DetailsPane() {
  const tab = useTab()
  const { volumes, places, refresh, prefs, togglePreview } = useStore()
  const loc = locOf(tab)

  const selected = visibleEntries(tab).filter((e) => tab.sel.includes(e.path))
  const single = selected.length === 1 ? selected[0] : null
  const [preview, setPreview] = useState<PreviewData | null>(null)

  useEffect(() => {
    let cancelled = false
    if (single && single.kind === 'file') {
      void api.fs.readPreview(single.path).then((res) => {
        if (!cancelled) setPreview(res)
      })
    } else {
      setPreview(null)
    }
    return () => {
      cancelled = true
    }
  }, [single?.path])

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

  if (selected.length === 1) {
    const e = selected[0]
    return (
      <aside className="details">
        <div className="dp-hero" style={{ minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {preview?.kind === 'image' && preview.content ? (
            <img src={preview.content} alt={e.name} style={{ maxWidth: '100%', maxHeight: 160, objectFit: 'contain', borderRadius: 4 }} />
          ) : (
            <Icon name={iconOf(e)} size={96} />
          )}
        </div>
        <div className="dp-name">{e.name}</div>
        <div className="dp-type">{typeOf(e)}</div>
        <div className="dp-actions">
          <button className="btn" onClick={() => openEntry(e)}>
            <Icon name="u-open-with" />
            Open
          </button>
          <button className={`btn${prefs.previewPane ? ' primary' : ''}`} title="Toggle Preview (Alt+P)" onClick={togglePreview}>
            <Icon name="u-preview-pane" />
            Preview
          </button>
        </div>
        {prefs.previewPane && preview?.kind === 'text' && preview.content && (
          <>
            <div className="dp-h">Preview</div>
            <pre
              style={{
                padding: '8px 10px',
                background: 'var(--c-bg)',
                borderRadius: 4,
                maxHeight: 180,
                overflow: 'auto',
                fontSize: 11,
                lineHeight: 1.4,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                border: '1px solid var(--c-overlay-border)',
                margin: '0 12px 10px'
              }}
            >
              {preview.content}
            </pre>
          </>
        )}
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
