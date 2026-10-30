# 02 · Product Requirements (PRD) — Khoj v1

## 1. Vision
> "Open your Mac and feel like you're on Windows 11." Khoj gives people with Windows muscle memory a file manager that looks, sounds and responds like File Explorer, while their files stay in the normal macOS file system and Finder keeps working.

## 2. Target users
| Persona | Need |
|---|---|
| **Windows switcher** (new MacBook, used Windows for 10+ years) | Wants drive letters, Ctrl+C/V, Delete key, F2 rename, "This PC", the address bar path. Finder feels foreign. |
| **Dual-OS developer** (Windows at office, Mac at home) | Wants the same mental model and shortcuts on both machines, plus tabs, a fast details view and copy-as-path. |
| **Family / office PC user moving to Mac** | Needs familiarity above all. Large, clear UI and no surprises. |

## 3. Product principles
1. **Windows on the surface.** Layout, spacing, colours, icons, menus, wording and shortcuts follow Windows 11.
2. **macOS underneath.** Use the real Trash, Quick Look, Finder tags, native drag-and-drop and the macOS permission model. Never fake a file system.
3. **No surprises with data.** Every destructive action is either undoable (Ctrl+Z) or confirmed.
4. **Fast.** Folders with 10,000 items open in under 300 ms (cached icons, virtualised lists).
5. **Respect the user's choice.** Window buttons, keyboard scheme, drive letters and theme are all switchable.

## 4. Scope

### P0 — must have for v1 (MVP)
| ID | Feature | Acceptance criteria |
|---|---|---|
| P0-01 | **Window chrome** | Tab strip 32 px with Windows-style − ▢ ✕ on the right (46×32). Double-click the empty strip to maximise. Rounded 8 px corners when not maximised. |
| P0-02 | **Tabs** | Ctrl/⌘+T new, Ctrl/⌘+W close, Ctrl+Tab cycle, middle-click a folder to open in a new tab. Tabs show folder icon and name. Restored on relaunch. |
| P0-03 | **Address bar** | Breadcrumbs with chevron flyouts. Click empty area / Alt+D / Ctrl+L to edit. Accepts `E:\Dev`, `/Volumes/MyDATA/Dev`, `~/Documents`, "This PC", "Recycle Bin". An invalid path shows the Windows-style "can't find" message. |
| P0-04 | **Back / Forward / Up / Refresh** | Alt+←/→/↑, Backspace = back, F5 = refresh. Disabled states shown. |
| P0-05 | **Search box** | Searches the current folder recursively by file name. Results show the "Folder" column. Esc clears. v1 uses name matching; content search via Spotlight `mdfind` is P1. |
| P0-06 | **Command bar** | New ▾ (Folder, Text Document), Cut, Copy, Paste, Rename, Share, Delete, Sort ▾, View ▾, See more ▾, Details toggle. Disabled when not applicable. |
| P0-07 | **Navigation pane** | Home, Gallery, iCloud Drive, pinned Quick access folders (pin/unpin), This PC (expandable to drives and sub-folders), Network, Trash. Resizable 160–600 px. Lazy-loading tree. |
| P0-08 | **This PC** | "Devices and drives" tiles: icon, `Name (X:)`, usage bar (red when < 10 % free), "x GB free of y GB". Live updates on mount/unmount. |
| P0-09 | **Views** | Details (sortable columns Name / Date modified / Type / Size), Content, Tiles, Large icons, Medium icons, List. Ctrl+Shift+2…8. Compact view. View is remembered per folder. |
| P0-10 | **Selection** | Click, Ctrl/⌘-click, Shift-click range, Ctrl+A, arrow keys, Home/End, type-to-select, rubber-band selection in icon views. |
| P0-11 | **File operations** | New folder (Ctrl+Shift+N), rename inline (F2, extension not pre-selected), cut / copy / paste with "- Copy" naming, Replace or Skip dialog, progress dialog with pause/cancel for big jobs, Delete → Trash (no confirm), Shift+Delete → permanent (confirm), Undo (Ctrl+Z) for rename / new / delete / move / copy. |
| P0-12 | **Drag & drop** | Inside the app and to/from Finder and other apps. Same volume = move, other volume = copy (Windows rule). ⌘ forces move, ⌥ forces copy. |
| P0-13 | **Context menus** | Item menu (icon row + Open, Open in new tab, Open with ▸, Pin to Quick access, Compress to ZIP, Copy as path, Quick Look, Properties, Show in Finder, Open in Terminal). Background menu (View ▸, Sort by ▸, Refresh, Paste, Undo, New ▸, Open in Terminal, Properties). |
| P0-14 | **Details pane** | Alt+Shift+P. Thumbnail/icon, name, type, Open/Share buttons, properties. For drives: usage donut and Eject. |
| P0-15 | **Status bar** | "N items", "M items selected  size", quick toggle Details / Large icons. |
| P0-16 | **Open files** | Double-click / Enter opens in the default macOS app. Open with ▸ lists capable apps. `.app` bundles launch. |
| P0-17 | **Onboarding & permissions** | First-run dialog. Folder permission prompts. Optional Full Disk Access button. EPERM errors show a "Grant access" helper. |
| P0-18 | **Options** | Theme (System/Light/Dark), Window buttons (Windows/macOS), Keyboard (Ctrl/⌘/Both), Drive letters on/off, Hidden items, File name extensions, Compact view, Open folders in new tab, Text size. |
| P0-19 | **Dark & light theme** | Follows macOS appearance by default, live switching. |
| P0-20 | **Packaging** | Universal (arm64 + x64) signed and notarized DMG with drag-to-Applications background. Auto-update channel prepared. |

### P1 — v1.1
- Home **Recent / Favorites** backed by macOS `kMDItemLastUsedDate` and the app's own favourites list.
- **Gallery** with real thumbnails, "Collection" folder chooser and month grouping.
- Full **Properties** window (General / Details / Security tabs). Lock = Read-only. Hidden flag.
- **Compress / Extract ZIP** (`ditto`), "Extract all…" wizard.
- **Network**: browse Bonjour SMB hosts, "Map network drive" (`mount_smbfs` / `open smb://`), assign letters.
- **Spotlight search** (`mdfind -onlyin`) with content search and filters (Kind, Date modified, Size).
- **Tear-off tabs** into a new window and merge back.
- Finder **tags** column and colour dots.

### P2 — later
- Dual pane / split view, column view.
- Preview pane (Alt+P) with text, image, PDF and video preview.
- Git status badges, file hashes, batch rename.
- Windows build of the same app (Electron makes this cheap).
- Localisation: Hindi, Spanish, etc.

### Non-goals (v1)
- Replacing Finder as the system default file browser (macOS doesn't allow it cleanly).
- Mac App Store distribution (sandbox conflicts with a full file manager).
- Reading NTFS write support (macOS limitation, NTFS drives are read-only).
- Shell extensions from Windows apps.

## 5. Success metrics
| Metric | Target |
|---|---|
| Cold start to interactive | < 1.5 s on M1 |
| Open folder with 10k files | < 300 ms first paint, smooth 60 fps scroll |
| Copy 10 GB SSD→SSD | within 10 % of Finder's speed |
| Crash-free sessions | > 99.5 % |
| "Feels like Windows" (5-point survey with 10 Windows switchers) | ≥ 4.3 |

## 6. Edge cases to handle
- Names containing `/` or `:` (macOS shows `:` as `/` in Finder). Block `/` and `:` in rename.
- Case-insensitive APFS: renaming `a.txt` → `A.txt` must work (two-step rename via temp name).
- Packages (`.app`, `.photoslibrary`, `.bundle`) are folders on disk but behave as files. "Show package contents" lives in the context menu.
- Aliases and symlinks: show an arrow overlay. Opening resolves the target. A broken link shows a dialog.
- iCloud "dataless" files: show a cloud badge. Opening downloads the file first.
- Read-only volumes (NTFS, disk images): disable write commands and explain why.
- Volumes ejected while open: close affected tabs and fall back to This PC.
- Very long paths and Unicode normalisation (NFD on HFS+, NFC preferred in UI).
- `.DS_Store`, `._*` resource-fork files are hidden unless "Hidden items" is on.
