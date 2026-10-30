import { useEffect, useState } from 'react'
import { isSpecial } from '@shared/paths'
import type { GitRepoInfo } from '@shared/types'
import { api } from '@/api/client'
import { shortSize } from '@/lib/format'
import { locOf, useStore, useTab, visibleEntries } from '@/store'
import { Icon } from './Icon'

export function StatusBar() {
  const tab = useTab()
  const { volumes, setView, terminalOpen, toggleTerminal, openDiskAnalyzer } = useStore()
  const loc = locOf(tab)
  const count = loc === 'thispc' ? volumes.length : visibleEntries(tab).length
  const selected = visibleEntries(tab).filter((e) => tab.sel.includes(e.path))
  const [git, setGit] = useState<GitRepoInfo | null>(null)

  useEffect(() => {
    let canceled = false
    if (isSpecial(loc)) {
      setGit(null)
      return
    }
    api.fs.gitInfo(loc).then((info) => {
      if (!canceled) setGit(info)
    }).catch(() => {
      if (!canceled) setGit(null)
    })
    return () => {
      canceled = true
    }
  }, [loc])

  // Explorer only shows a size when every selected item is a file.
  const size = selected.length && selected.every((e) => e.kind === 'file') ? shortSize(selected.reduce((s, e) => s + e.size, 0)) : ''
  const plural = (n: number): string => `${n} item${n === 1 ? '' : 's'}`

  return (
    <div className="statusbar">
      <span>{plural(count)}</span>
      <span className="bar" />
      {tab.sel.length > 0 && (
        <>
          <span>
            {plural(tab.sel.length)} selected{size && `  ${size}`}
          </span>
          <span className="bar" />
        </>
      )}
      {git && (
        <>
          <span
            className="git-branch"
            title={`Git repository (${git.root})\nBranch: ${git.branch}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--c-accent)', fontWeight: 600, fontSize: 11 }}
          >
            <Icon name="u-tag" size={12} />
            <span>{git.branch}</span>
          </span>
          <span className="bar" />
        </>
      )}
      <div className="right">
        <button
          className={`status-tool-btn${terminalOpen ? ' on' : ''}`}
          title="Toggle Embedded Terminal (Ctrl+~)"
          onClick={toggleTerminal}
        >
          <Icon name="u-terminal" size={13} />
          <span>Terminal</span>
        </button>
        <button
          className="status-tool-btn"
          title="Analyze Storage (WinDirStat / TreeSize)"
          onClick={() => openDiskAnalyzer()}
        >
          <Icon name="u-pie-chart" size={13} />
          <span>Storage</span>
        </button>
        <span className="bar" />
        <button className={tab.view === 'details' ? 'on' : ''} title="Details" onClick={() => setView('details')}>
          <Icon name="u-details-view" size={14} />
        </button>
        <button className={tab.view === 'large' ? 'on' : ''} title="Large icons" onClick={() => setView('large')}>
          <Icon name="u-grid" size={14} />
        </button>
      </div>
    </div>
  )
}
