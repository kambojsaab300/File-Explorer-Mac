import type { Path } from '@shared/types'
import { api } from './api/client'
import { dropKind, selectedPaths, transfer } from './actions'

// Drags always go through the OS (startDrag), so dropping inside Khoj, into Finder or
// from Finder into Khoj all arrive the same way: as files on the drop event.
export function dragSource(path: Path) {
  return {
    draggable: true,
    onDragStart(e: React.DragEvent) {
      e.preventDefault()
      const sel = selectedPaths()
      api.shell.startDrag(sel.includes(path) ? sel : [path])
    }
  }
}

export function dropTarget(dest: Path | null) {
  if (!dest) return {}
  const mark = (e: React.DragEvent, on: boolean): void => {
    ;(e.currentTarget as HTMLElement).classList.toggle('drop', on)
  }
  return {
    onDragOver(e: React.DragEvent) {
      if (!e.dataTransfer.types.includes('Files')) return
      e.preventDefault()
      e.stopPropagation()
      mark(e, true)
    },
    onDragLeave: (e: React.DragEvent) => mark(e, false),
    onDrop(e: React.DragEvent) {
      e.preventDefault()
      e.stopPropagation()
      mark(e, false)
      const src = [...e.dataTransfer.files].map((f) => api.shell.pathForFile(f)).filter((p) => p && p !== dest)
      if (src.length) void transfer(dropKind(src, dest, e), src, dest)
    }
  }
}
