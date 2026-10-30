import { useEffect } from 'react'
import { api } from './api/client'
import { locOf, sortedItems, useStore } from './store'
import { openEntry } from './components/MainArea'
import { copy, copyAsPath, deleteSelected, newFolder, paste, showProperties, startRename, undo, useOps } from './actions'

let typeBuffer = ''
let typeTimeout: ReturnType<typeof setTimeout> | undefined

function handleTypeToSelect(char: string): boolean {
  clearTimeout(typeTimeout)
  typeBuffer += char.toLowerCase()
  typeTimeout = setTimeout(() => {
    typeBuffer = ''
  }, 800)

  const s = useStore.getState()
  const tab = s.tabs[s.active]
  const items = sortedItems(tab)
  const match = items.find((item) => item.name.toLowerCase().startsWith(typeBuffer))
  if (match) {
    s.select([match.path], match.path)
    setTimeout(() => {
      const el = document.querySelector('.it.sel')
      el?.scrollIntoView({ block: 'nearest' })
    }, 10)
    return true
  }
  return false
}

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
      else if (e.altKey && key === 'p') s.togglePreview()
      else if (e.altKey && e.key === '2') s.toggleSplitView()
      else if (e.key === 'F6' && s.splitView) s.setFocusedPane(s.focusedPane === 'left' ? 'right' : 'left')
      else if ((e.altKey && e.key === 'Enter') || (mod && key === 'i')) void showProperties()
      else if (e.altKey && e.key === 'F4') api.window.close()
      else if (e.key === 'F5') s.refresh()
      else if ((mod && (key === 'e' || key === 'f')) || e.key === 'F3') {
        const inp = document.querySelector('.search input') as HTMLInputElement | null
        inp?.focus()
        inp?.select()
      }
      else if (mod && e.shiftKey && (key === '.' || e.code === 'Period')) s.setPref('hidden', !s.prefs.hidden)
      else if (mod && !e.shiftKey && e.key >= '1' && e.key <= '8') {
        const targetIdx = parseInt(e.key, 10) - 1
        if (targetIdx < s.tabs.length) s.activate(targetIdx)
      }
      else if (mod && !e.shiftKey && e.key === '9') s.activate(s.tabs.length - 1)
      else if (mod && e.shiftKey && e.key === '2') s.setView('large')
      else if (mod && e.shiftKey && e.key === '3') s.setView('medium')
      else if (mod && e.shiftKey && e.key === '5') s.setView('list')
      else if (mod && e.shiftKey && e.key === '6') s.setView('details')
      else if (mod && e.shiftKey && e.key === '7') s.setView('tiles')
      else if (mod && e.shiftKey && e.key === '8') s.setView('content')
      else if (mod && key === 't') s.newTab()
      else if (mod && !e.shiftKey && key === 'n') api.window.newWindow()
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
      } else if (e.code === 'Space') {
        const sel = tab.items.filter((x) => tab.sel.includes(x.path))
        if (sel.length === 1 && sel[0].kind === 'file') {
          api.window.quickLook(sel[0].path)
        }
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Home' || e.key === 'End') {
        const order = sortedItems(tab).map((x) => x.path)
        if (!order.length) return
        const at = order.indexOf(tab.sel[tab.sel.length - 1] ?? '')
        const next =
          e.key === 'Home' ? 0 : e.key === 'End' ? order.length - 1 : Math.max(0, Math.min(order.length - 1, at + (e.key === 'ArrowDown' ? 1 : -1)))
        s.select([order[next]], order[next])
      } else if (!mod && !e.altKey && e.key.length === 1 && /[a-z0-9._ -]/i.test(e.key)) {
        if (handleTypeToSelect(e.key)) {
          e.preventDefault()
          return
        }
      } else return

      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
