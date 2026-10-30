import { useEffect, useState } from 'react'
import type { PreviewData } from '@shared/types'
import { api } from '@/api/client'
import { iconOf, shortSize, typeOf } from '@/lib/format'
import { locOf, useStore, useTab, visibleEntries } from '@/store'
import { Icon } from './Icon'
import { openEntry } from './MainArea'

export function PreviewPane() {
  const tab = useTab()
  const loc = locOf(tab)
  const selected = visibleEntries(tab).filter((e) => tab.sel.includes(e.path))
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const one = selected.length === 1 ? selected[0] : null

  useEffect(() => {
    if (!one || one.kind !== 'file') {
      setPreview(null)
      setLoading(false)
      return
    }

    let active = true
    setLoading(true)
    api.fs
      .readPreview(one.path)
      .then((res) => {
        if (active) setPreview(res)
      })
      .catch(() => {
        if (active) setPreview({ kind: 'binary' })
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [one?.path])

  if (!one && selected.length === 0) {
    return (
      <aside className="preview-pane empty-state">
        <div className="preview-hero">
          <Icon name="u-preview-pane" size={64} />
        </div>
        <div className="preview-placeholder">Select a file to preview.</div>
      </aside>
    )
  }

  if (selected.length > 1) {
    const totalSize = selected.reduce((sum, item) => sum + item.size, 0)
    return (
      <aside className="preview-pane empty-state">
        <div className="preview-hero">
          <Icon name="i-folder" size={64} />
        </div>
        <div className="preview-title">{selected.length} items selected</div>
        <div className="preview-sub">Total size: {shortSize(totalSize)}</div>
      </aside>
    )
  }

  if (one && one.kind !== 'file') {
    return (
      <aside className="preview-pane">
        <div className="preview-hero">
          <Icon name={iconOf(one)} size={72} />
        </div>
        <div className="preview-title">{one.name}</div>
        <div className="preview-sub">{typeOf(one)}</div>
        <div className="preview-actions">
          <button className="btn" onClick={() => openEntry(one)}>
            <Icon name="u-open-with" />
            Open
          </button>
        </div>
      </aside>
    )
  }

  if (!one) return null

  return (
    <aside className="preview-pane">
      <div className="preview-header">
        <div className="preview-title-row">
          <Icon name={iconOf(one)} size={20} />
          <span className="preview-name" title={one.name}>
            {one.name}
          </span>
        </div>
        <div className="preview-meta-row">
          <span>{shortSize(one.size)}</span>
          <span className="dot">•</span>
          <span>{typeOf(one)}</span>
        </div>
      </div>

      <div className="preview-body">
        {loading && (
          <div className="preview-loading">
            <Icon name="u-refresh" size={24} className="spin" />
            <span>Loading preview...</span>
          </div>
        )}

        {!loading && preview?.kind === 'image' && preview.content && (
          <div className="preview-image-wrap">
            <img src={preview.content} alt={one.name} className="preview-img" />
          </div>
        )}

        {!loading && preview?.kind === 'audio' && preview.content && (
          <div className="preview-audio-wrap">
            <div className="preview-audio-disc">
              <Icon name="i-file-audio" size={64} />
            </div>
            <audio controls src={preview.content} className="preview-audio-player" autoPlay={false}>
              Your browser does not support audio playback.
            </audio>
          </div>
        )}

        {!loading && preview?.kind === 'video' && preview.content && (
          <div className="preview-video-wrap">
            <video controls src={preview.content} className="preview-video-player">
              Your browser does not support video playback.
            </video>
          </div>
        )}

        {!loading && preview?.kind === 'text' && preview.content !== undefined && (
          <div className="preview-text-wrap">
            <div className="preview-text-bar">
              <span className="text-stats">
                {preview.lineCount ?? preview.content.split('\n').length} lines
                {preview.truncated && ' (showing first 64 KB)'}
              </span>
              <button
                className="btn-tiny"
                title="Copy contents"
                onClick={() => {
                  navigator.clipboard.writeText(preview.content ?? '')
                  setCopied(true)
                  setTimeout(() => setCopied(false), 1500)
                }}
              >
                <Icon name={copied ? 'u-check' : 'u-copy'} size={12} />
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <div className="preview-code-box">
              <pre className="code-content">{preview.content}</pre>
            </div>
          </div>
        )}

        {!loading && (preview?.kind === 'binary' || preview?.kind === 'pdf') && (
          <div className="preview-unsupported">
            <Icon name={iconOf(one)} size={64} />
            <p className="no-prev">No preview available for this file type.</p>
            <button className="btn" onClick={() => openEntry(one)}>
              <Icon name="u-open-with" />
              Open in default app
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
