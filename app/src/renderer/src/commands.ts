import type { MenuCommand } from '@shared/types'
import { copy, copyAsPath, deleteSelected, newFolder, newTextFile, paste, startRename, undo } from './actions'
import { sortedItems, useStore } from './store'

// Runs a command from the native macOS menu bar.
export function runMenuCommand(command: MenuCommand): void {
  const s = useStore.getState()
  const tab = s.tabs[s.active]
  const commands: Record<MenuCommand, () => void> = {
    'new-tab': () => s.newTab(),
    'close-tab': () => s.closeTab(s.active),
    'new-folder': () => void newFolder(),
    'new-file': () => void newTextFile(),
    rename: startRename,
    trash: () => void deleteSelected(),
    undo: () => void undo(),
    cut: () => copy(true),
    copy: () => copy(),
    paste: () => void paste(),
    'select-all': () => s.select(sortedItems(tab).map((e) => e.path)),
    'copy-path': copyAsPath,
    refresh: s.refresh,
    back: s.back,
    forward: s.forward,
    up: s.up,
    'go-home': () => s.go('home'),
    'go-thispc': () => s.go('thispc'),
    'go-downloads': () => s.places && s.go(s.places.downloads),
    'focus-address': () => s.setAddressEditing(true),
    'details-pane': s.toggleDetails,
    options: () => useStore.setState({ showOptions: true }),
    'view-details': () => s.setView('details'),
    'view-large': () => s.setView('large'),
    'view-list': () => s.setView('list'),
    'view-tiles': () => s.setView('tiles'),
    'view-content': () => s.setView('content')
  }
  commands[command]?.()
}
