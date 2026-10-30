import { useEffect, useState } from 'react'
import { api } from '@/api/client'
import { locIcon, locLabel } from '@/lib/locations'
import { locOf, useStore } from '@/store'
import { Icon } from './Icon'

export function TitleBar() {
  const { tabs, active, volumes, places, activate, closeTab, newTab } = useStore()
  const [maximized, setMaximized] = useState(false)

  useEffect(() => api.window.onMaximized(setMaximized), [])

  // Windows rule: square corners when maximised.
  useEffect(() => {
    document.documentElement.classList.toggle('maximized', maximized)
  }, [maximized])

  return (
    <div className="tabstrip" onDoubleClick={(e) => e.target === e.currentTarget && api.window.toggleMaximize()}>
      {tabs.map((t, i) => {
        const loc = locOf(t)
        return (
          <div
            key={t.id}
            className={`tab${i === active ? ' active' : ''}`}
            onMouseDown={(e) => (e.button === 1 ? closeTab(i) : activate(i))}
          >
            <Icon name={locIcon(loc, volumes, places)} />
            <span className="tab-title">{locLabel(loc, volumes, places)}</span>
            <button
              className="tab-close"
              aria-label="Close tab"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => closeTab(i)}
            >
              <Icon name="u-close" size={12} />
            </button>
          </div>
        )
      })}
      <button className="tab-new" aria-label="New tab" onClick={() => newTab()}>
        <Icon name="u-plus" />
      </button>
      <div className="captions">
        <button aria-label="Minimize" onClick={() => api.window.minimize()}>
          <Icon name="u-minimize" />
        </button>
        <button aria-label={maximized ? 'Restore' : 'Maximize'} onClick={() => api.window.toggleMaximize()}>
          <Icon name={maximized ? 'u-restore' : 'u-maximize'} />
        </button>
        <button className="close" aria-label="Close" onClick={() => api.window.close()}>
          <Icon name="u-close" />
        </button>
      </div>
    </div>
  )
}
