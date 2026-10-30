import { useEffect, useState } from 'react'
import type { Entry, FileProperties } from '@shared/types'
import { baseName, extOf, parentOf, withoutExt } from '@shared/paths'
import { api } from '@/api/client'
import { closeBatchRename, closeExtractDialog, closeProperties, commitBatchRename, runBatchRename, runExtract, useOps } from '@/actions'
import { fmtDate, iconOf, shortSize, typeOf } from '@/lib/format'
import { useStore } from '@/store'
import { Icon } from './Icon'

export function Dialogs() {
  const { progress, conflict, confirm, error, properties, extracting, batchRename } = useOps()
  if (conflict) return <ConflictDialog />
  if (confirm) return <ConfirmDialog />
  if (error) return <ErrorDialog message={error} />
  if (properties) return <PropertiesDialog props={properties} />
  if (extracting) return <ExtractDialog extracting={extracting} />
  if (batchRename) return <BatchRenameDialog />
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

function PropertiesDialog({ props }: { props: FileProperties }) {
  const [tab, setTab] = useState<'general' | 'details' | 'security' | 'checksums'>('general')
  const [name, setName] = useState(props.name)
  const [readonly, setReadonly] = useState(props.readonly)
  const [hidden, setHidden] = useState(props.hidden)
  const [applying, setApplying] = useState(false)
  const [sha256, setSha256] = useState<string | null>(null)
  const [md5, setMd5] = useState<string | null>(null)
  const [hashing, setHashing] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [verifyText, setVerifyText] = useState('')

  const calcHashes = async () => {
    if (props.kind !== 'file' || hashing) return
    setHashing(true)
    try {
      const [s, m] = await Promise.all([
        api.fs.computeHash(props.path, 'sha256'),
        api.fs.computeHash(props.path, 'md5')
      ])
      setSha256(s)
      setMd5(m)
    } catch (err) {
      console.error('Hash calculation failed', err)
    } finally {
      setHashing(false)
    }
  }

  const copyToClipboard = (val: string, key: string) => {
    navigator.clipboard.writeText(val)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const fakeEntry: Entry = {
    name: props.name,
    path: props.path,
    kind: props.kind,
    ext: props.ext,
    size: props.size,
    mtimeMs: props.mtimeMs,
    birthtimeMs: props.ctimeMs,
    hidden: props.hidden,
    readonly: props.readonly
  }

  async function apply(): Promise<void> {
    setApplying(true)
    try {
      if (name !== props.name && name.trim()) {
        await api.fs.rename(props.path, name.trim())
      }
      if (readonly !== props.readonly || hidden !== props.hidden) {
        await api.fs.setAttributes(props.path, { readonly, hidden })
      }
      useStore.getState().refresh()
    } catch (e) {
      useOps.setState({ error: String(e) })
    } finally {
      setApplying(false)
    }
  }

  return (
    <Dialog
      footer={
        <>
          <button
            className="btn primary"
            onClick={async () => {
              await apply()
              closeProperties()
            }}
          >
            OK
          </button>
          <button className="btn" onClick={closeProperties}>
            Cancel
          </button>
          <button className="btn" disabled={applying} onClick={() => void apply()}>
            Apply
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', borderBottom: '1px solid var(--c-divider)', marginBottom: 16 }}>
        {(['general', 'details', 'security', 'checksums'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '6px 16px',
              background: 'transparent',
              borderBottom: tab === t ? '2px solid var(--c-accent)' : '2px solid transparent',
              color: tab === t ? 'var(--c-text)' : 'var(--c-text-2)',
              fontWeight: tab === t ? 600 : 400,
              textTransform: 'capitalize',
              cursor: 'pointer'
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'general' && (
        <>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 14 }}>
            <Icon name={iconOf(fakeEntry)} size={44} />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                flex: 1,
                height: 32,
                padding: '0 8px',
                borderRadius: 4,
                border: '1px solid var(--c-overlay-border)',
                background: 'var(--c-bg)',
                color: 'var(--c-text)',
                fontSize: 14
              }}
            />
          </div>
          <div style={{ height: 1, background: 'var(--c-divider)', margin: '10px 0' }} />

          <div className="kv" style={{ gridTemplateColumns: '120px 1fr', gap: '6px 12px', fontSize: 13 }}>
            <span className="k">Type of file:</span>
            <span className="v">{typeOf(fakeEntry)}</span>

            <span className="k">Opens with:</span>
            <span className="v">System default</span>

            <div style={{ gridColumn: '1 / -1', height: 1, background: 'var(--c-divider)', margin: '4px 0' }} />

            <span className="k">Location:</span>
            <span className="v" style={{ wordBreak: 'break-all' }}>{props.locationWindows}</span>

            <span className="k">macOS path:</span>
            <span className="v" style={{ wordBreak: 'break-all', opacity: 0.8 }}>{props.locationMac}</span>

            <span className="k">Size:</span>
            <span className="v">
              {shortSize(props.size)} ({props.size.toLocaleString('en-US')} bytes)
            </span>

            <span className="k">Size on disk:</span>
            <span className="v">
              {shortSize(props.sizeOnDisk ?? props.size)}
            </span>

            {props.itemCount && (
              <>
                <span className="k">Contains:</span>
                <span className="v">
                  {props.itemCount.files.toLocaleString('en-US')} Files, {props.itemCount.folders.toLocaleString('en-US')} Folders
                </span>
              </>
            )}

            <div style={{ gridColumn: '1 / -1', height: 1, background: 'var(--c-divider)', margin: '4px 0' }} />

            <span className="k">Created:</span>
            <span className="v">{fmtDate(props.ctimeMs)}</span>

            <span className="k">Modified:</span>
            <span className="v">{fmtDate(props.mtimeMs)}</span>

            <span className="k">Accessed:</span>
            <span className="v">{fmtDate(props.atimeMs)}</span>

            <div style={{ gridColumn: '1 / -1', height: 1, background: 'var(--c-divider)', margin: '4px 0' }} />

            <span className="k">Attributes:</span>
            <span className="v" style={{ display: 'flex', gap: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={readonly}
                  onChange={(e) => setReadonly(e.target.checked)}
                />
                Read-only (locked)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={hidden}
                  onChange={(e) => setHidden(e.target.checked)}
                />
                Hidden
              </label>
            </span>
          </div>
        </>
      )}

      {tab === 'details' && (
        <div className="kv" style={{ gridTemplateColumns: '130px 1fr', gap: '8px 12px', fontSize: 13 }}>
          <span className="k">File name</span>
          <span className="v">{props.name}</span>
          <span className="k">Item type</span>
          <span className="v">{typeOf(fakeEntry)}</span>
          <span className="k">Folder path</span>
          <span className="v" style={{ wordBreak: 'break-all' }}>{props.locationWindows}</span>
          <span className="k">Size</span>
          <span className="v">{props.size.toLocaleString('en-US')} bytes</span>
          <span className="k">Date created</span>
          <span className="v">{fmtDate(props.ctimeMs)}</span>
          <span className="k">Date modified</span>
          <span className="v">{fmtDate(props.mtimeMs)}</span>
          <span className="k">Attributes</span>
          <span className="v">
            {[props.readonly && 'Read-only', props.hidden && 'Hidden', props.kind === 'dir' && 'Directory']
              .filter(Boolean)
              .join(', ') || 'Normal'}
          </span>
          <span className="k">POSIX permissions</span>
          <span className="v">{props.posixMode ?? '0755'}</span>
        </div>
      )}

      {tab === 'security' && (
        <div style={{ fontSize: 13 }}>
          <div style={{ marginBottom: 12 }}>
            <div className="muted" style={{ marginBottom: 4 }}>Object name:</div>
            <div style={{ wordBreak: 'break-all', fontFamily: 'monospace', fontSize: 12 }}>{props.path}</div>
          </div>
          <div style={{ height: 1, background: 'var(--c-divider)', margin: '12px 0' }} />
          <div className="muted" style={{ marginBottom: 6 }}>Group or user names:</div>
          <div
            style={{
              padding: 8,
              border: '1px solid var(--c-overlay-border)',
              borderRadius: 4,
              background: 'var(--c-bg)',
              marginBottom: 14
            }}
          >
            <div>Owner (POSIX current user)</div>
            <div className="muted" style={{ fontSize: 11 }}>Read &amp; Write permissions</div>
          </div>
          <div className="kv" style={{ gridTemplateColumns: '120px 1fr', gap: '6px 12px' }}>
            <span className="k">Permissions:</span>
            <span className="v">{props.posixMode ?? '0755'}</span>
            <span className="k">Read access:</span>
            <span className="v">Allowed</span>
            <span className="k">Write access:</span>
            <span className="v">{props.readonly ? 'Denied (Read-only)' : 'Allowed'}</span>
          </div>
        </div>
      )}

      {tab === 'checksums' && (
        <div style={{ fontSize: 13 }}>
          {props.kind !== 'file' ? (
            <div className="muted" style={{ padding: '16px 0' }}>
              Cryptographic checksums are only calculated for individual files.
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="muted">Cryptographic File Checksums (Hashes):</span>
                <button
                  className="btn"
                  onClick={calcHashes}
                  disabled={hashing}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '4px 10px' }}
                >
                  <Icon name={hashing ? 'u-refresh' : 'u-check'} size={14} className={hashing ? 'spin' : ''} />
                  {hashing ? 'Calculating...' : sha256 ? 'Recalculate' : 'Calculate Hashes'}
                </button>
              </div>

              {hashing && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '20px 0', justifyContent: 'center' }}>
                  <Icon name="u-refresh" size={18} className="spin" />
                  <span>Computing SHA-256 and MD5 streams...</span>
                </div>
              )}

              {!hashing && !sha256 && (
                <div style={{ padding: '24px 12px', textAlign: 'center', border: '1px dashed var(--c-overlay-border)', borderRadius: 6, margin: '8px 0' }}>
                  <div style={{ marginBottom: 8, opacity: 0.7 }}>Click &quot;Calculate Hashes&quot; to compute SHA-256 and MD5 for this file.</div>
                  <button className="btn primary" onClick={calcHashes} style={{ fontSize: 12 }}>
                    Calculate Hashes
                  </button>
                </div>
              )}

              {!hashing && sha256 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: 12 }}>SHA-256</span>
                      <button
                        className="btn"
                        onClick={() => copyToClipboard(sha256, 'sha256')}
                        style={{ fontSize: 11, padding: '2px 8px' }}
                      >
                        {copiedKey === 'sha256' ? '✓ Copied' : 'Copy'}
                      </button>
                    </div>
                    <div
                      style={{
                        padding: '6px 8px',
                        background: 'var(--c-bg)',
                        border: '1px solid var(--c-overlay-border)',
                        borderRadius: 4,
                        fontFamily: 'monospace',
                        fontSize: 11,
                        wordBreak: 'break-all',
                        userSelect: 'all'
                      }}
                    >
                      {sha256}
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: 12 }}>MD5</span>
                      <button
                        className="btn"
                        onClick={() => copyToClipboard(md5 ?? '', 'md5')}
                        style={{ fontSize: 11, padding: '2px 8px' }}
                      >
                        {copiedKey === 'md5' ? '✓ Copied' : 'Copy'}
                      </button>
                    </div>
                    <div
                      style={{
                        padding: '6px 8px',
                        background: 'var(--c-bg)',
                        border: '1px solid var(--c-overlay-border)',
                        borderRadius: 4,
                        fontFamily: 'monospace',
                        fontSize: 11,
                        wordBreak: 'break-all',
                        userSelect: 'all'
                      }}
                    >
                      {md5}
                    </div>
                  </div>

                  <div style={{ height: 1, background: 'var(--c-divider)', margin: '4px 0' }} />

                  <div>
                    <div style={{ fontSize: 12, marginBottom: 4 }} className="muted">
                      Verify hash against expected value:
                    </div>
                    <input
                      type="text"
                      value={verifyText}
                      onChange={(e) => setVerifyText(e.target.value)}
                      placeholder="Paste expected hash to verify..."
                      style={{
                        width: '100%',
                        height: 30,
                        padding: '0 8px',
                        borderRadius: 4,
                        border: '1px solid var(--c-overlay-border)',
                        background: 'var(--c-bg)',
                        color: 'var(--c-text)',
                        fontSize: 12,
                        fontFamily: 'monospace'
                      }}
                    />
                    {verifyText.trim() && (
                      <div style={{ marginTop: 6, fontSize: 12 }}>
                        {verifyText.trim().toLowerCase() === sha256?.toLowerCase() ? (
                          <span style={{ color: '#107c41', fontWeight: 600 }}>✓ SHA-256 matched successfully!</span>
                        ) : verifyText.trim().toLowerCase() === md5?.toLowerCase() ? (
                          <span style={{ color: '#107c41', fontWeight: 600 }}>✓ MD5 matched successfully!</span>
                        ) : (
                          <span style={{ color: '#d83b01', fontWeight: 600 }}>✗ Hash does not match.</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Dialog>
  )
}

function ExtractDialog({ extracting }: { extracting: { zipPath: string; destDir: string } }) {
  const [dest, setDest] = useState(extracting.destDir)
  const [openWhenDone, setOpenWhenDone] = useState(true)

  return (
    <Dialog
      footer={
        <>
          <button
            className="btn primary"
            onClick={() => void runExtract(extracting.zipPath, dest, openWhenDone)}
          >
            Extract
          </button>
          <button className="btn" onClick={closeExtractDialog}>
            Cancel
          </button>
        </>
      }
    >
      <h2>Extract Compressed (Zipped) Folders</h2>
      <div className="muted" style={{ marginBottom: 16 }}>
        Select a destination and extract files
      </div>
      <div style={{ marginBottom: 8, fontSize: 13 }}>Files will be extracted to this folder:</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          type="text"
          value={dest}
          onChange={(e) => setDest(e.target.value)}
          style={{
            flex: 1,
            height: 32,
            padding: '0 8px',
            borderRadius: 4,
            border: '1px solid var(--c-overlay-border)',
            background: 'var(--c-bg)',
            color: 'var(--c-text)',
            fontSize: 13
          }}
        />
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={openWhenDone}
          onChange={(e) => setOpenWhenDone(e.target.checked)}
        />
        Show extracted files when complete
      </label>
    </Dialog>
  )
}

function BatchRenameDialog() {
  const batch = useOps((s) => s.batchRename)
  const paths = batch?.paths ?? []
  const [mode, setMode] = useState<'pattern' | 'replace' | 'affix'>('pattern')

  // Pattern mode state
  const defaultBase = paths[0] ? withoutExt(baseName(paths[0])) : 'Item'
  const [basePattern, setBasePattern] = useState(defaultBase)
  const [startNum, setStartNum] = useState(1)
  const [padDigits, setPadDigits] = useState<0 | 2 | 3>(0)

  // Replace mode state
  const [findText, setFindText] = useState('')
  const [replaceText, setReplaceText] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(false)

  // Affix mode state
  const [prefix, setPrefix] = useState('')
  const [suffix, setSuffix] = useState('')

  if (!batch) return null

  // Compute renames preview
  const preview = paths.map((p, idx) => {
    const orig = baseName(p)
    const ext = extOf(orig)
    const baseWithout = withoutExt(orig)
    const extDot = ext ? `.${ext}` : ''
    let newName = orig

    if (mode === 'pattern') {
      const num = startNum + idx
      const numStr = padDigits > 0 ? String(num).padStart(padDigits, '0') : String(num)
      const numFormatted = padDigits > 0 ? ` - ${numStr}` : ` (${numStr})`
      newName = `${basePattern.trim() || 'Item'}${numFormatted}${extDot}`
    } else if (mode === 'replace') {
      if (findText) {
        if (caseSensitive) {
          newName = orig.split(findText).join(replaceText)
        } else {
          const re = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
          newName = orig.replace(re, replaceText)
        }
      }
    } else if (mode === 'affix') {
      newName = `${prefix}${baseWithout}${suffix}${extDot}`
    }

    return {
      from: p,
      orig,
      newName,
      changed: orig !== newName
    }
  })

  const hasChanges = preview.some((r) => r.changed)
  const canApply = hasChanges && preview.every((r) => r.newName.trim().length > 0 && !/[\\/:*?"<>|]/.test(r.newName))

  return (
    <Dialog
      footer={
        <>
          <button
            className="btn primary"
            disabled={!canApply}
            onClick={() => void runBatchRename(preview.map((r) => ({ from: r.from, newName: r.newName })))}
          >
            Rename ({preview.filter((r) => r.changed).length} items)
          </button>
          <button className="btn" onClick={closeBatchRename}>
            Cancel
          </button>
        </>
      }
    >
      <div style={{ minWidth: 480, maxWidth: 580 }}>
        <h2 style={{ marginBottom: 4 }}>Batch Rename ({paths.length} items)</h2>
        <div className="muted" style={{ fontSize: 13, marginBottom: 14 }}>
          Rename multiple files with live preview, search &amp; replace, or numbering.
        </div>

        {/* Mode Selector Tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14, background: 'var(--c-bg-subtle, rgba(0,0,0,0.04))', padding: 3, borderRadius: 6 }}>
          {[
            { id: 'pattern', label: 'Sequential Numbering' },
            { id: 'replace', label: 'Find & Replace' },
            { id: 'affix', label: 'Prefix & Suffix' }
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id as any)}
              style={{
                flex: 1,
                padding: '6px 10px',
                borderRadius: 4,
                border: 'none',
                fontSize: 12,
                cursor: 'pointer',
                fontWeight: mode === m.id ? 600 : 400,
                background: mode === m.id ? 'var(--c-bg)' : 'transparent',
                color: mode === m.id ? 'var(--c-text)' : 'var(--c-text-2)',
                boxShadow: mode === m.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Mode Controls */}
        {mode === 'pattern' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 12, marginBottom: 4 }} className="muted">Base Name:</div>
              <input
                type="text"
                value={basePattern}
                onChange={(e) => setBasePattern(e.target.value)}
                style={{ width: '100%', height: 32, padding: '0 8px', borderRadius: 4, border: '1px solid var(--c-overlay-border)', background: 'var(--c-bg)', color: 'var(--c-text)', fontSize: 13 }}
                placeholder="e.g. Vacation_Photo"
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, marginBottom: 4 }} className="muted">Start Number:</div>
                <input
                  type="number"
                  min="0"
                  value={startNum}
                  onChange={(e) => setStartNum(parseInt(e.target.value, 10) || 0)}
                  style={{ width: '100%', height: 32, padding: '0 8px', borderRadius: 4, border: '1px solid var(--c-overlay-border)', background: 'var(--c-bg)', color: 'var(--c-text)', fontSize: 13 }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, marginBottom: 4 }} className="muted">Format:</div>
                <select
                  value={padDigits}
                  onChange={(e) => setPadDigits(Number(e.target.value) as any)}
                  style={{ width: '100%', height: 32, padding: '0 8px', borderRadius: 4, border: '1px solid var(--c-overlay-border)', background: 'var(--c-bg)', color: 'var(--c-text)', fontSize: 13 }}
                >
                  <option value={0}>Name (1), Name (2)...</option>
                  <option value={2}>Name - 01, Name - 02...</option>
                  <option value={3}>Name - 001, Name - 002...</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {mode === 'replace' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 12, marginBottom: 4 }} className="muted">Find:</div>
              <input
                type="text"
                value={findText}
                onChange={(e) => setFindText(e.target.value)}
                style={{ width: '100%', height: 32, padding: '0 8px', borderRadius: 4, border: '1px solid var(--c-overlay-border)', background: 'var(--c-bg)', color: 'var(--c-text)', fontSize: 13 }}
                placeholder="Text to find..."
                autoFocus
              />
            </div>
            <div>
              <div style={{ fontSize: 12, marginBottom: 4 }} className="muted">Replace with:</div>
              <input
                type="text"
                value={replaceText}
                onChange={(e) => setReplaceText(e.target.value)}
                style={{ width: '100%', height: 32, padding: '0 8px', borderRadius: 4, border: '1px solid var(--c-overlay-border)', background: 'var(--c-bg)', color: 'var(--c-text)', fontSize: 13 }}
                placeholder="Replacement text..."
              />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={caseSensitive}
                onChange={(e) => setCaseSensitive(e.target.checked)}
              />
              Match case
            </label>
          </div>
        )}

        {mode === 'affix' && (
          <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, marginBottom: 4 }} className="muted">Prefix:</div>
              <input
                type="text"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                style={{ width: '100%', height: 32, padding: '0 8px', borderRadius: 4, border: '1px solid var(--c-overlay-border)', background: 'var(--c-bg)', color: 'var(--c-text)', fontSize: 13 }}
                placeholder="e.g. Draft_"
                autoFocus
              />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, marginBottom: 4 }} className="muted">Suffix:</div>
              <input
                type="text"
                value={suffix}
                onChange={(e) => setSuffix(e.target.value)}
                style={{ width: '100%', height: 32, padding: '0 8px', borderRadius: 4, border: '1px solid var(--c-overlay-border)', background: 'var(--c-bg)', color: 'var(--c-text)', fontSize: 13 }}
                placeholder="e.g. _v2"
              />
            </div>
          </div>
        )}

        {/* Live Preview List */}
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
          Live Preview:
        </div>
        <div
          style={{
            maxHeight: 180,
            overflowY: 'auto',
            border: '1px solid var(--c-overlay-border)',
            borderRadius: 6,
            background: 'var(--c-bg-subtle, rgba(0,0,0,0.02))'
          }}
        >
          {preview.map((item, i) => (
            <div
              key={item.from}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '6px 10px',
                fontSize: 12,
                borderBottom: i < preview.length - 1 ? '1px solid var(--c-divider)' : 'none',
                background: item.changed ? 'rgba(0, 120, 212, 0.05)' : 'transparent'
              }}
            >
              <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: 0.75 }}>
                {item.orig}
              </div>
              <span style={{ margin: '0 8px', opacity: 0.5 }}>→</span>
              <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: item.changed ? 600 : 400, color: item.changed ? 'var(--c-accent)' : 'inherit' }}>
                {item.newName}
              </div>
              {item.changed && (
                <span
                  style={{
                    marginLeft: 8,
                    fontSize: 10,
                    padding: '1px 6px',
                    borderRadius: 3,
                    background: 'var(--c-accent)',
                    color: '#fff',
                    fontWeight: 600
                  }}
                >
                  NEW
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </Dialog>
  )
}
