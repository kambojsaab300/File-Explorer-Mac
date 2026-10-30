import { shortSize } from '@/lib/format'
import { locOf, useStore, useTab, visibleEntries } from '@/store'
import { Icon } from './Icon'

export function StatusBar() {
  const tab = useTab()
  const { volumes, setView } = useStore()
  const count = locOf(tab) === 'thispc' ? volumes.length : visibleEntries(tab).length
  const selected = visibleEntries(tab).filter((e) => tab.sel.includes(e.path))
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
      <div className="right">
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
