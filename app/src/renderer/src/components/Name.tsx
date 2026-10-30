import { useEffect, useRef } from 'react'
import type { Entry } from '@shared/types'
import { commitRename, useOps } from '@/actions'

// An item's name, or the inline rename box while F2 is active on it.
export function Name({ entry }: { entry: Entry }) {
  const renaming = useOps((s) => s.renaming === entry.path)
  if (!renaming) return <span className="nm">{entry.name}</span>
  return <RenameBox entry={entry} />
}

function RenameBox({ entry }: { entry: Entry }) {
  const ref = useRef<HTMLInputElement>(null)
  const done = useRef(false)

  useEffect(() => {
    const input = ref.current
    if (!input) return
    input.focus()
    // Like Explorer, the extension is not selected so typing keeps it.
    const dot = entry.kind === 'file' ? entry.name.lastIndexOf('.') : -1
    input.setSelectionRange(0, dot > 0 ? dot : entry.name.length)
  }, [entry])

  const finish = (save: boolean): void => {
    if (done.current) return
    done.current = true
    if (save) void commitRename(entry.path, ref.current?.value ?? '')
    else useOps.setState({ renaming: null })
  }

  return (
    <input
      ref={ref}
      className="rn"
      defaultValue={entry.name}
      spellCheck={false}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onBlur={() => finish(true)}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === 'Enter') finish(true)
        if (e.key === 'Escape') finish(false)
      }}
    />
  )
}
