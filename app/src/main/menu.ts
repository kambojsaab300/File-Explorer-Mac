import { BrowserWindow, Menu, type MenuItemConstructorOptions } from 'electron'
import type { MenuCommand } from '@shared/types'

// The native menu bar is required on macOS (VoiceOver, conventions). Accelerators
// here are ⌘-based; the Windows-style keys (F2, Delete, Alt+arrows) live in the renderer.
export function buildMenu(): void {
  const send = (command: MenuCommand) => () => BrowserWindow.getFocusedWindow()?.webContents.send('menu:command', command)
  const item = (label: string, command: MenuCommand, accelerator?: string): MenuItemConstructorOptions => ({
    label,
    accelerator,
    // Shortcuts are handled by the renderer so they also work in Ctrl mode; the menu only shows them.
    registerAccelerator: false,
    click: send(command)
  })

  const template: MenuItemConstructorOptions[] = [
    { role: 'appMenu' },
    {
      label: 'File',
      submenu: [
        item('New Tab', 'new-tab', 'CmdOrCtrl+T'),
        item('New Folder', 'new-folder', 'CmdOrCtrl+Shift+N'),
        item('New Text Document', 'new-file'),
        { type: 'separator' },
        item('Rename', 'rename', 'F2'),
        item('Move to Trash', 'trash', 'Delete'),
        { type: 'separator' },
        item('Close Tab', 'close-tab', 'CmdOrCtrl+W')
      ]
    },
    {
      label: 'Edit',
      submenu: [
        item('Undo', 'undo', 'CmdOrCtrl+Z'),
        { type: 'separator' },
        item('Cut', 'cut', 'CmdOrCtrl+X'),
        item('Copy', 'copy', 'CmdOrCtrl+C'),
        item('Paste', 'paste', 'CmdOrCtrl+V'),
        item('Select All', 'select-all', 'CmdOrCtrl+A'),
        { type: 'separator' },
        item('Copy as Path', 'copy-path', 'CmdOrCtrl+Shift+C'),
        { type: 'separator' },
        item('Options…', 'options', 'CmdOrCtrl+,')
      ]
    },
    {
      label: 'View',
      submenu: [
        item('Large Icons', 'view-large'),
        item('List', 'view-list'),
        item('Details', 'view-details'),
        item('Tiles', 'view-tiles'),
        item('Content', 'view-content'),
        { type: 'separator' },
        item('Details Pane', 'details-pane', 'Alt+Shift+P'),
        item('Refresh', 'refresh', 'F5'),
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Go',
      submenu: [
        item('Back', 'back', 'Alt+Left'),
        item('Forward', 'forward', 'Alt+Right'),
        item('Up', 'up', 'Alt+Up'),
        { type: 'separator' },
        item('Home', 'go-home'),
        item('This PC', 'go-thispc'),
        item('Downloads', 'go-downloads'),
        { type: 'separator' },
        item('Go to Address…', 'focus-address', 'CmdOrCtrl+L')
      ]
    },
    { role: 'windowMenu' },
    { role: 'help', submenu: [] }
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}
