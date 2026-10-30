import { useEffect, useState } from 'react'
import { Icon } from './Icon'

export function TitleBar() {
  const [maximized, setMaximized] = useState(false)

  useEffect(() => window.khoj.window.onMaximized(setMaximized), [])

  // Windows rule: square corners when maximised.
  useEffect(() => {
    document.documentElement.classList.toggle('maximized', maximized)
  }, [maximized])

  return (
    <div className="tabstrip" onDoubleClick={(e) => e.target === e.currentTarget && window.khoj.window.toggleMaximize()}>
      <div className="tab active">
        <Icon name="i-this-mac" />
        <span className="tab-title">This PC</span>
        <button className="tab-close" aria-label="Close tab">
          <Icon name="u-close" size={12} />
        </button>
      </div>
      <button className="tab-new" aria-label="New tab">
        <Icon name="u-plus" />
      </button>
      <div className="captions">
        <button aria-label="Minimize" onClick={() => window.khoj.window.minimize()}>
          <Icon name="u-minimize" />
        </button>
        <button aria-label={maximized ? 'Restore' : 'Maximize'} onClick={() => window.khoj.window.toggleMaximize()}>
          <Icon name={maximized ? 'u-restore' : 'u-maximize'} />
        </button>
        <button className="close" aria-label="Close" onClick={() => window.khoj.window.close()}>
          <Icon name="u-close" />
        </button>
      </div>
    </div>
  )
}
