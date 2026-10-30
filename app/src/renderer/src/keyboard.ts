import { useEffect } from 'react'
import { locOf, sortedItems, useStore } from './store'
import { openEntry } from './components/MainArea'
import { copy, copyAsPath, deleteSelected, newFolder, paste, startRename, undo, useOps } from './actions'

// Windows shortcuts. Ctrl and ⌘ both work so Mac and Windows muscle memory are covered.
export function useShortcuts(): void {
  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      const s = useStore.getState()
      const tab = s.tabs[s.active]
      const mod = e.ctrlKey || e.metaKey
      const typing = (e.target as HTMLElement).closest('input, textarea')
      const key = e.key.toLowerCase()

      if (e.altKey && e.key === 'ArrowLeft') s.back()
      else if (e.altKey && e.key === 'ArrowRight') s.forward()
      else if (e.altKey && e.key === 'ArrowUp') s.up()
      else if (e.altKey && e.shiftKey && key === 'p') s.toggleDetails()
      else if (e.key === 'F5') s.refresh()
      else if (mod && key === 't') s.newTab()
      else if (mod && key === 'w') s.closeTab(s.active)
      else if ((mod && key === 'l') || (e.altKey && key === 'd')) s.setAddressEditing(true)
      else if (e.ctrlKey && e.key === 'Tab') s.activate((s.active + (e.shiftKey ? -1 : 1) + s.tabs.length) % s.tabs.length)
      else if (typing) return
      else if (useOps.getState().renaming || useOps.getState().menu) return
      else if (e.key === 'F2') startRename()
      else if (e.key === 'Delete' || (e.metaKey && e.key === 'Backspace')) void deleteSelected(e.shiftKey)
      else if (mod && e.shiftKey && key === 'n') void newFolder()
      else if (mod && e.shiftKey && key === 'c') copyAsPath()
      else if (mod && key === 'c') copy()
      else if (mod && key === 'x') copy(true)
      else if (mod && key === 'v') void paste()
      else if (mod && key === 'z') void undo()
      else if (e.key === 'Backspace') s.back()
      else if (mod && key === 'a') s.select(sortedItems(tab).map((x) => x.path))
      else if (e.key === 'Enter') {
        const sel = tab.items.filter((x) => tab.sel.includes(x.path))
        if (sel.length === 1) openEntry(sel[0])
        else if (locOf(tab) === 'thispc' && tab.sel.length === 1) s.go(tab.sel[0])
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Home' || e.key === 'End') {
        const order = sortedItems(tab).map((x) => x.path)
        if (!order.length) return
        const at = order.indexOf(tab.sel[tab.sel.length - 1] ?? '')
        const next =
          e.key === 'Home' ? 0 : e.key === 'End' ? order.length - 1 : Math.max(0, Math.min(order.length - 1, at + (e.key === 'ArrowDown' ? 1 : -1)))
        s.select([order[next]], order[next])
      } else return

      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
