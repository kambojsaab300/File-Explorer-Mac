import { useEffect, useState } from 'react'
import { baseName, parentOf } from '@shared/paths'
import { api } from '@/api/client'
import { useOps } from '@/actions'
import { fmtDate, shortSize } from '@/lib/format'
import { Icon } from './Icon'

export function Dialogs() {
  const { progress, conflict, confirm, error } = useOps()
  if (conflict) return <ConflictDialog />
  if (confirm) return <ConfirmDialog />
  if (error) return <ErrorDialog message={error} />
  if (progress) return <ProgressDialog />
  return null
}

function Dialog({ children, footer }: { children: React.ReactNode; footer: React.ReactNode }) {
  return (
    <div className="scrim">
      <div className="dlg" role="dialog">
        <div className="bd">{children}</div>
        <div className="ft">{footer}</div>
      </div>
    </div>
  )
}

function ProgressDialog() {
  const p = useOps((s) => s.progress)!
  const [paused, setPaused] = useState(false)
  // Quick jobs finish before the dialog would be readable, so wait a moment before showing it.
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 400)
    return () => clearTimeout(t)
  }, [])
  if (!visible) return null

  const pct = p.bytesTotal ? Math.floor((p.bytesDone / p.bytesTotal) * 100) : 0
  const left = Math.max(0, p.bytesTotal - p.bytesDone)
  const secs = p.speedBps ? Math.ceil(left / p.speedBps) : null
  return (
    <Dialog
      footer={
        <>
          <button
            className="btn"
            onClick={() => {
              if (paused) api.ops.resume(p.opId)
              else api.ops.pause(p.opId)
              setPaused(!paused)
            }}
          >
            {paused ? 'Resume' : 'Pause'}
          </button>
          <button className="btn" onClick={() => api.ops.cancel(p.opId)}>
            Cancel
          </button>
        </>
      }
    >
      <div className="muted">
        {p.kind === 'move' ? 'Moving' : 'Copying'} {p.itemsTotal} item{p.itemsTotal === 1 ? '' : 's'}
      </div>
      <h2 style={{ marginTop: 8 }}>{paused ? 'Paused' : `${pct}% complete`}</h2>
      <div className="prog">
        <i style={{ width: `${pct}%` }} />
      </div>
      <div className="kv">
        <span className="k">Name</span>
        <span className="v">{p.current}</span>
        <span className="k">Time remaining</span>
        <span className="v">{secs === null ? 'Calculating…' : secs < 60 ? `About ${secs} seconds` : `About ${Math.ceil(secs / 60)} minutes`}</span>
        <span className="k">Items remaining</span>
        <span className="v">
          {p.itemsTotal - p.itemsDone} ({shortSize(left)})
        </span>
        <span className="k">Speed</span>
        <span className="v">{shortSize(p.speedBps)}/s</span>
      </div>
    </Dialog>
  )
}

function ConflictDialog() {
  const { req, resolve } = useOps((s) => s.conflict)!
  const [all, setAll] = useState(false)
  const answer = (choice: 'replace' | 'skip' | 'keep-both' | 'cancel') => () => {
    useOps.setState({ conflict: null })
    resolve({ choice, applyToAll: all })
  }
  const Option = (o: { icon: string; title: string; sub: string; onClick: () => void }) => (
    <button className="opt" onClick={o.onClick}>
      <Icon name={o.icon} size={20} />
      <div>
        <div className="t">{o.title}</div>
        <div className="muted">{o.sub}</div>
      </div>
    </button>
  )
  return (
    <Dialog footer={<button className="btn" onClick={answer('cancel')}>Cancel</button>}>
      <h2>Replace or Skip Files</h2>
      <div className="muted" style={{ marginBottom: 6 }}>
        Destination: {baseName(parentOf(req.dest.path) ?? '/') || '/'}
      </div>
      <div style={{ marginBottom: 14 }}>The destination already has a file named “{req.dest.name}”</div>
      <Option icon="u-check" title="Replace the file in the destination" sub={`${shortSize(req.src.size)} · modified ${fmtDate(req.src.mtimeMs)}`} onClick={answer('replace')} />
      <Option icon="u-redo" title="Skip this file" sub={`Keep the existing ${shortSize(req.dest.size)} file`} onClick={answer('skip')} />
      <Option icon="u-copy" title="Keep both" sub="The new one gets a number added to its name" onClick={answer('keep-both')} />
      {req.remaining > 1 && (
        <label className="all">
          <input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} /> Do this for all {req.remaining} conflicts
        </label>
      )}
    </Dialog>
  )
}

function ConfirmDialog() {
  const c = useOps((s) => s.confirm)!
  const close = (): void => useOps.setState({ confirm: null })
  return (
    <Dialog
      footer={
        <>
          <button className="btn primary" autoFocus onClick={() => (close(), c.onYes())}>
            {c.yes}
          </button>
          <button className="btn" onClick={close}>
            Cancel
          </button>
        </>
      }
    >
      <h2>{c.title}</h2>
      <div>{c.message}</div>
    </Dialog>
  )
}

function ErrorDialog({ message }: { message: string }) {
  return (
    <Dialog
      footer={
        <button className="btn primary" autoFocus onClick={() => useOps.setState({ error: null })}>
          OK
        </button>
      }
    >
      <h2>Something went wrong</h2>
      <div>{message}</div>
    </Dialog>
  )
}
