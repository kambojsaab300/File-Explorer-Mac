# 05 · Windows → macOS Mapping

This document is the translation table between what the user **sees** (Windows) and what the app **does** (macOS). When in doubt: show the Windows concept, implement the macOS concept.

## 1. Places & storage
| Windows (shown in Khoj) | macOS reality | Notes |
|---|---|---|
| **This PC** | List of mounted volumes | Optional label "This Mac" in Options. |
| **Local Disk (C:)** | `Macintosh HD` mounted at `/` | Always C:. Shown as "Macintosh HD (C:)". |
| **D:, E:, F: …** | `/Volumes/<Name>` | Letters assigned by volume UUID and persisted. Display only. |
| USB drive | Removable volume (exFAT / FAT32 / APFS / HFS+) | NTFS is **read-only** on macOS, so disable write commands and show a lock badge. |
| DVD / ISO mount | Disk image `.dmg`, `.iso` mounted via `hdiutil` | Shown with the disk-image icon and Eject. |
| Network drive (`\\server\share`, "Map network drive") | SMB mount `smb://server/share` → `/Volumes/share` | Mount with `open smb://…` or `mount_smbfs`. Credentials in the Keychain. |
| **Home** (Quick access, Recent, Favorites) | App view + macOS metadata (`kMDItemLastUsedDate`) | Favorites are stored by the app. |
| **Gallery** | `~/Pictures` (+ chosen folders) | Thumbnails via `createThumbnailFromPath`. |
| **OneDrive** | **iCloud Drive** at `~/Library/Mobile Documents/com~apple~CloudDocs` | Badges: cloud-only / downloading / local. Other providers (OneDrive, Google Drive, Dropbox) live in `~/Library/CloudStorage/*` and are listed automatically. |
| Desktop | `~/Desktop` | |
| Documents | `~/Documents` | |
| Downloads | `~/Downloads` | |
| Pictures | `~/Pictures` | |
| Music | `~/Music` | |
| **Videos** | `~/Movies` | Labelled "Videos", real folder is Movies. |
| `C:\Users\<you>` | `/Users/<you>` (`~`) | |
| `C:\Program Files` | `/Applications` (+ `~/Applications`) | `.app` bundles are folders shown as files. |
| `C:\Windows` | `/System`, `/Library` | Shown with the grey system-folder icon. |
| **Recycle Bin** | **Trash** (`~/.Trash`, and `/Volumes/X/.Trashes` per volume) | `shell.trashItem()`. Typing "Recycle Bin" in the address bar works too. |
| Network (computers) | Bonjour `_smb._tcp` browsing | P1. |
| Libraries | Not applicable | Omitted. |

## 2. Paths & names
| Windows | macOS | Khoj behaviour |
|---|---|---|
| `\` separator | `/` | Displayed as `\` when drive letters are on. Both accepted when typing. |
| `C:\Users\you\Documents` | `/Users/you/Documents` | Address bar shows the Windows form, "Copy as path" copies the Windows form (option: POSIX). |
| Forbidden chars `\ / : * ? " < > |` | Only `/` (and `:` in Finder) | Block `/` and `:`. Warn (don't block) on Windows-illegal chars when the drive is exFAT/FAT (they fail there). |
| Case-insensitive NTFS | APFS case-insensitive (default) | Case-only rename via temporary name. |
| Hidden attribute | Dot-files + `UF_HIDDEN` flag (`chflags hidden`) | "Hidden items" toggle shows both. |
| Read-only attribute | Locked flag (`uchg`) or POSIX permissions | Properties → "Read-only (locked)". |
| `.lnk` shortcut | Alias / symlink | Arrow overlay. Context menu "Create shortcut" → makes an alias (P1). |
| File extensions hidden by default | Shown by Finder setting | Khoj default: **shown** (power users); toggle in View. |
| `desktop.ini`, `Thumbs.db` | `.DS_Store`, `._*`, `.localized` | Always hidden unless Hidden items is on. |
| Packages | `.app`, `.bundle`, `.photoslibrary` | Behave as files. "Show package contents" in the context menu. |

## 3. Actions
| Windows action | macOS implementation |
|---|---|
| Open (double-click / Enter) | `shell.openPath(path)` |
| Open with ▸ | Launch Services list (native helper) + `open -a "App" file` |
| Open in Terminal / PowerShell | `open -a Terminal <folder>` (iTerm / Warp if configured) |
| Show in folder / Open file location | Navigate in Khoj. "Show in Finder" uses `shell.showItemInFolder` |
| Delete → Recycle Bin | `shell.trashItem` |
| Shift+Delete | `fs.rm(path, { recursive: true })` after confirmation |
| Copy / Move | Node `fs.cp` / `fs.rename` (same volume) / stream copy with progress (cross volume). Preserve xattrs and timestamps using `copyfile(3)` via a native helper or `ditto` for large trees. |
| Compress to ZIP | `ditto -c -k --sequesterRsrc --keepParent src dst.zip` |
| Extract all | `ditto -x -k archive.zip dest/` |
| Properties (Alt+Enter) | `fs.stat` + `mdls` (kind, dimensions, duration) + xattrs. "Get Info" equivalent. |
| Preview pane / thumbnails | `nativeImage.createThumbnailFromPath` (QuickLook thumbnails) |
| Space preview (PowerToys Peek) | Native Quick Look: `win.previewFile` |
| Share | macOS share menu (`ShareMenu` in Electron) → AirDrop, Mail, Messages |
| Eject (safely remove) | `diskutil eject /Volumes/X` |
| Format / Change drive letter | Format: open Disk Utility. Letter: Khoj setting. |
| Map network drive | `open smb://host/share` / `mount_smbfs` |
| Pin to Quick access | Khoj's pinned list (optionally mirrored to Finder sidebar favourites in P2) |
| Copy as path (Ctrl+Shift+C) | Windows-form or POSIX-form string to the clipboard |
| Search | Name walk (v1), Spotlight `mdfind` (P1) |
| Properties → Security tab | POSIX permissions + ACL view (P1) |

## 4. Window & system behaviour
| Windows | macOS | Khoj |
|---|---|---|
| Minimise / Maximise / Close on the right | Traffic lights on the left | Windows style by default, switchable |
| Maximise = fill screen | Green button = full screen | ▢ = **zoom to fill visible screen** (not full-screen Space). Double-click tab strip = same. |
| Close last window quits Explorer | App stays in Dock | Keep the macOS behaviour (Dock icon stays). Option "Quit when last window closes". |
| Alt+Tab | ⌘Tab | System controlled |
| Taskbar | Dock | Dock menu: New window, recent folders |
| Snap layouts | Tiling (macOS 15+), Stage Manager | Use the system feature |
| Right-click | Two-finger click / Ctrl-click | Both open the context menu |
| Menu bar in window (old) | Global menu bar | Provide a native menu (File, Edit, View, Go, Window, Help) with the same accelerators, required by macOS conventions and VoiceOver |
| Units: 1 KB = 1024 B | Finder: 1 KB = 1000 B | Windows units by default |
| Dark / light from Settings | macOS Appearance | Follow the system by default |
| Accent colour | macOS accent | Option "Use macOS accent colour" |

## 5. Keyboard (summary, full table in 07)
- **Both** mode (default): every Ctrl shortcut also works with ⌘. Windows-only keys work too: F2, F5, Delete, Backspace = back, Alt+arrows, Alt+Enter, Alt+D.
- On MacBooks, F-keys need **Fn** unless "Use F1, F2 as standard function keys" is on. Onboarding shows this tip.
- Conflicts we avoid: ⌘H (hide app), ⌘Q (quit), ⌘Space (Spotlight), Ctrl+←/→ (Mission Control spaces). We never bind those.
