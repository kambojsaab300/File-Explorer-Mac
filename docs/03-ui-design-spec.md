# 03 · UI Design Specification

All values are in CSS px, which equal macOS points and Windows effective pixels at 100 %. The source of truth is `design/tokens/tokens.json` (CSS version: `tokens.css`). Values marked **(m)** were measured from your Windows 11 reference screenshots.

Open `design/prototype/index.html` in any browser to click through everything described here. Rendered screens are in `design/screens/`.

---

## 1. Window anatomy

| Region | Height / width | Background (dark / light) | Notes |
|---|---|---|---|
| Tab strip | 32 **(m)** | `#202020` **(m)** / `#EEF1F5` | Tabs start 8 px from the left **(m)**. Caption buttons on the right. Empty space is a drag region (`-webkit-app-region: drag`). |
| Address row | 48 **(m)** | `#2C2C2C` **(m)** / `#F9F9F9` | Nav buttons 40×32, pitch 48 **(m)**. Address and search boxes 32 high **(m)**. |
| Divider | 1 | `#3A3A3A` **(m)** / `#E0E0E0` | Above and below the command bar. |
| Command bar | 48 **(m)** incl. dividers | `#191919` **(m)** / `#FFFFFF` | Buttons 32 high, icon 20, label 12. |
| Navigation pane | 300 default **(m)**, 160–600 | `#191919` / `#FFFFFF` | 5 px invisible splitter with a 1 px visible line `#2B2B2B`. |
| Content | flex | `#191919` **(m)** / `#FFFFFF` | |
| Details pane | 320 default, 240–560 | same as content | 1 px left border. Padding 20. |
| Status bar | 24 | `#1C1C1C` **(m)** / `#FFFFFF` | |

Window: min 640×400, default 1280×800, corner radius 8 (0 when maximised or full screen). Shadow `0 30px 70px rgba(0,0,0,.55)` plus a 1 px outline `rgba(255,255,255,.09)` in dark and `rgba(0,0,0,.18)` in light.

Screens: `01-this-pc-dark.png`, `02-folder-content-view-dark.png`, `22-full-window-no-desktop-dark.png`.

---

## 2. Typography

Font stack: `"Segoe UI Variable Text", "Segoe UI", "Selawik", -apple-system, "SF Pro Text", system-ui, sans-serif`. Bundle **Selawik** in the app (see legal doc).

| Style | Size / line | Weight | Used for |
|---|---|---|---|
| Item | 12 / 16 | 400 | File names in Details/List/Tiles, nav items, command labels, status bar (Windows uses 9 pt = 12 px). |
| Body | 14 / 20 | 400 | Address bar, search, menus, dialogs, Content-view names, group headers "Devices and drives". |
| Body strong | 14 / 20 | 600 | Section titles in the Details pane, dialog option titles. |
| Subtitle | 20 / 28 | 600 | Dialog titles, Details pane file name. |
| Title | 28 / 36 | 600 | Onboarding and empty-state hero. |

**Text size setting:** 100 % (default), 110 %, 125 %. All text tokens multiply by `--text-scale`.

---

## 3. Colour

Full tables are in `tokens.json`. These are the ones designers touch most:

| Token | Dark | Light | Use |
|---|---|---|---|
| text.primary | `#FFFFFF` **(m)** | `#1B1B1B` | Main text |
| text.secondary | `#CFCFCF` (captions measured `#DEDEDE`) | `#5D5D5D` | Column values, captions |
| text.disabled | `#5B5A5A` **(m)** | `#A0A0A0` | Disabled commands |
| fill.hover | `#2D2D2D` | `#E5F3FF` | Row / button hover |
| fill.selected | `#505050` **(m)** | `#CCE8FF` + 1 px `#99D1FF` | Focused selection |
| fill.selected.inactive | `#333333` **(m)** | `#D9D9D9` | Selection when pane not focused |
| focus.ring | `#C3C3C3` **(m)** 1 px | `#6E6E6E` | Keyboard focus rectangle |
| accent | `#60CDFF` | `#005FB8` | Focus underline, primary buttons, toggles. Follow macOS accent colour if the user enables "Use system accent". |
| drive.bar.fill | `#0070CB` **(m)** | `#26A0DA` | Usage bar |
| drive.bar.track | `#E6E6E6` **(m)** | `#E6E6E6` | Usage bar track (light in both themes) |
| drive.bar.low | `#DA2626` | `#DA2626` | < 10 % free |
| caption.close.hover | `#C42B1C` + white glyph | same | Close button hover |

---

## 4. Components

### 4.1 Tab
- Size: width 240 **(m)** shrinking to min 96 as tabs are added, height 32, radius `8 8 0 0`.
- Content: 12 px padding · 16 px folder icon · 8 gap · title (ellipsis) · 24×24 close button (glyph 12).
- States: **active** `#2C2C2C` (joins the address row seamlessly, no border), **inactive** transparent with secondary text, **hover** `#2A2A2A`, a 1 px × 14 px separator between inactive tabs.
- "+" new-tab button: 32×24 inside a 36 px slot.
- Behaviour: drag to reorder, drag out to tear off (P1), middle-click to close.

### 4.2 Caption buttons (Windows style, default)
- Three 46×32 buttons: minimise (glyph 10×1), maximise/restore (10×10 square / overlapping squares), close (10×10 ✕).
- Hover `#2D2D2D` / `#E9E9E9`, pressed slightly darker. Close hover `#C42B1C` with a white glyph.
- macOS alternative: traffic lights 12 px, 8 px gap, 14 px left inset, vertically centred in the 32 px strip. Tabs shift right by 72 px. (Screen `19-macos-window-buttons-light.png`.)

### 4.3 Navigation buttons
- Back, Forward, Up, Refresh: 40×32, radius 4, icon 16. Disabled colour `text.disabled`. Hover `fill.hover`.

### 4.4 Address bar
- 32 high, radius 4, fill `#383838` **(m)**. Light: white with 1 px `#E5E5E5`.
- **Breadcrumb mode:** location icon (16) → `›` chevron button (20×24) → segment button (padding 0 6, radius 4) → … → trailing chevron. Each chevron opens a flyout listing that level's sub-folders.
- Root segment rules:
  - Paths on a volume: `This PC › MyDATA (E:) › Dev`
  - Paths in the home folder: `[home icon] › you › Documents`
  - iCloud: `[cloud] › iCloud Drive › …`
- **Edit mode** (click empty area, Alt+D, Ctrl/⌘+L, F4): the whole path is selected, displayed as `E:\Dev\khoj` when drive letters are on, otherwise `/Volumes/MyDATA/Dev/khoj`. Fill `#1F1F1F` with a 2 px accent underline. Enter navigates, Esc cancels.
- Overflow: when segments don't fit, collapse the leftmost ones into a `«` button that opens a flyout.

### 4.5 Search box
- Width `clamp(200px, 26%, 520px)`, placeholder "Search {location}", search icon on the right.
- While searching, the view switches to Details with a **Folder** column replacing Type.

### 4.6 Command bar
Order (left → right): `New ▾` · | · Cut · Copy · Paste · Rename · Share · Delete · | · `Sort ▾` · `View ▾` · | · `···` · ⟶ spacer ⟶ `Details`.
- Icon-only buttons 40×32. Labelled buttons have padding 0 8 and a gap of 8.
- Tooltips include the shortcut: "Cut (Ctrl+X)". In ⌘ mode, "Cut (⌘X)".
- Trash location adds **Restore** and **Empty Trash** buttons.
- The menus are in §4.11.

### 4.7 Navigation pane
- Item: height 32 **(m)**, chevron column 16 at x=10, icon 16, 5 px gap, name 12 px. Indent 8 px per level **(m)**.
- Groups separated by a 1 px `#383838` line, inset 10 px, 8 px vertical margin.
- Order: Home · Gallery · iCloud Drive ▸ | pinned folders (pin glyph on the right) | This PC ▾ (drives ▸ folders) · Network ▸ · Trash.
- Selection: square, `fill.selected.inactive`, becomes `fill.selected` when the pane has focus.
- Lazy-load children when expanded. Show a chevron only if the folder has sub-folders (checked asynchronously; optimistic chevron with removal on empty).

### 4.8 File views
| View | Row/tile | Icon | Layout |
|---|---|---|---|
| **Details** | row 32 (compact 24) | 16 | Columns: Name (min 220, flex) · Date modified 160 · Type 170 · Size 100 right-aligned in **KB with thousands separators** ("4,107 KB"). Sort caret above the header label. Column resize and right-click to choose columns. |
| **Content** **(m)** | row 48, bottom divider `#2B2B2B` | 32 | Left: name (14 px) + second line "Type: …" or "Authors: …". Right column at 60 %: "Date modified: …" and "Size: 4.01 MB" (labels secondary, values primary). |
| **Tiles** | 254 × 60 | 48 | Name, type, size (3 lines). |
| **Large icons** | 120 wide | 96 (thumbnail for images/videos) | Name centred, max 2 lines. |
| **Medium icons** | 92 wide | 48 | Same as large. |
| **List** | 250 × 22, column-flow | 16 | Wraps into columns and scrolls horizontally. |

Selection visuals: dark `#505050` (inactive `#333333`), light `#CCE8FF` with a 1 px `#99D1FF` border. Multi-select focus item gets a 1 px focus-ring outline. Cut items render at 50 % opacity.

Sizes use **Windows formatting** (1024-based, 3 significant digits: 180 KB, 4.01 MB, 59.0 GB). An option to switch to macOS decimal units is planned for P1.
Dates follow the user's macOS locale via `Intl.DateTimeFormat`. The prototype uses `dd-mm-yyyy HH:mm` to match your screenshots.

### 4.9 This PC drive tile **(m)**
- 254 × 56–60, icon 48, name 12 px, usage bar 190 × 12 with a 1 px `#BCBCBC` border, caption "59.0 GB free of 99.9 GB" in secondary colour.
- Bar fill `#0070CB` (dark) / `#26A0DA` (light). Turns `#DA2626` below 10 % free.
- Group header "Devices and drives": 14 px, chevron collapses the group.

### 4.10 Details pane
- Hero area 180 high: thumbnail (max 240×170) or icon 96.
- Name (subtitle 20/28 semibold), type (secondary), action buttons (Open, Share), then **Properties** as a key/value grid (110 px key column).
- Drive selected: usage donut (conic gradient, 140 px), Eject button, mount point, drive letter badge "display only".
- Nothing selected: folder summary. Multi-select: "N items selected · total size".

### 4.11 Menus (flyouts)
- Container: radius 8, padding 4, fill `#2C2C2C` / `#F9F9F9`, 1 px border `#3D3D3D` / `#E0E0E0`, shadow `0 8px 16px rgba(0,0,0,.36)`. Enter animation 167 ms slide-down plus fade (`cubic-bezier(.1,.9,.2,1)`).
- Item: height 32, padding 0 12, radius 4, icon slot 16, label 14 px, accelerator right-aligned 12 px tertiary. Check/radio indicator in the icon slot.
- **Item context menu** (screen 04): top icon row (Cut, Copy, Rename, Share, Delete) in 40×36 buttons, separator, then Open (Enter) · Open in new tab · Open with ▸ · Pin to Quick access · Compress to ZIP file · Copy as path (Ctrl+Shift+C) · Quick Look (Space) · Properties (Alt+Enter) · — · Show in Finder · Open in Terminal.
- **Background menu** (screen 05): View ▸ · Sort by ▸ · — · Refresh · Paste · Undo · — · New folder · New text document · — · Open in Terminal · Properties.
- **View menu** (screen 06): Large icons, Medium icons, List, Details, Tiles, Content (radio) · Compact view (check) · Details pane, Hidden items, File name extensions (check).

### 4.12 Dialogs
- Radius 8, fill `#2B2B2B` / `#FFFFFF`, footer `#202020` / `#F3F3F3` with a top border, padding 24, title 20/28 semibold, body 14/20. Scrim `rgba(0,0,0,.30)`.
- Buttons 32 high, min 110 wide, radius 4. Primary = accent fill (black text on `#60CDFF` in dark, white on `#005FB8` in light).
- **Copy progress** (screen 13): "Copying N items from A to B", big "45% complete", speed chart (green `#16C60C`), Name / Time remaining / Items remaining / Speed, Pause + Cancel. Collapsible "Fewer details" (P1).
- **Replace or Skip Files** (screen 14): four options (Replace, Skip, Keep both, Compare info).
- **Delete permanently**: Yes / No, default focus on No.
- **Properties** (screen 17), **Options** (screen 16), **Onboarding** (screen 15), **Quick Look** (screen 21 is a mock; the real app uses native Quick Look).

### 4.13 Status bar
- "10 items | 1 item selected  1.18 MB |" in 12 px with 1 px separators. Right side: two 24×20 toggles (Details, Large icons) with the active one outlined.

---

## 5. Interaction states (all controls)

| State | Visual |
|---|---|
| Rest | as specified |
| Hover | `fill.hover`, 83 ms |
| Pressed | `fill.pressed`, glyph 98 % scale (optional) |
| Focus (keyboard) | 1 px `focus.ring` (rows) or 2 px accent outline offset 2 (buttons) |
| Disabled | glyph/text `text.disabled`, no hover |
| Selected | `fill.selected` (+ light border) |
| Drop target | `fill.hover` + 1 px accent border, auto-expand nav folder after 700 ms hover |

---

## 6. Motion
| Token | Value | Use |
|---|---|---|
| fast | 83 ms | colour changes |
| normal | 167 ms | menus, tooltips, panes |
| slow | 250 ms | dialogs |
| easing | `cubic-bezier(0.1, 0.9, 0.2, 1)` | entering elements |
Honour macOS "Reduce motion" (`prefers-reduced-motion`): disable slide/scale and keep fades only.

---

## 7. Accessibility
- Contrast: primary text is 17.6:1 on `#191919`. Secondary `#CFCFCF` is 11.3:1. Disabled text is exempt.
- Full keyboard operation (see `07-keyboard-shortcuts.md`), visible focus everywhere, F6 cycles regions (nav → content → address → command bar).
- ARIA roles: `tablist/tab` for tabs, `tree/treeitem` for nav, `grid` + `row` + `gridcell` for Details, `listbox` for icon views, `menu/menuitem` for flyouts, `dialog` + `aria-modal`.
- VoiceOver: announce "Name, Type, Size, Date modified, selected, n of m".
- Respect macOS "Increase contrast" with stronger borders, and "Reduce transparency" by disabling vibrancy.

---

## 8. Screen index (`design/screens/`)
| # | File | Shows |
|---|---|---|
| 01 | this-pc-dark | This PC with three drives (one low on space) |
| 02 | folder-content-view-dark | Your MyDATA (E:) folder in Content view, the same as your screenshot |
| 03 | folder-details-view-with-details-pane-dark | Details view + Details pane |
| 04 | context-menu-dark | Item context menu with icon row |
| 05 | background-context-menu-dark | Empty-area menu |
| 06 | view-menu-dark | View flyout |
| 07 | home-light | Home: Quick access + Recent |
| 08 | gallery-dark | Gallery grouped by month |
| 09 | large-icons-light | Large icons with thumbnails |
| 10 | tiles-view-dark | Tiles |
| 11 | address-bar-editing-dark | Address bar in edit mode showing `E:\Dev\khoj` |
| 12 | search-results-dark | Search with Folder column |
| 13 | copy-progress-dark | Copy progress dialog |
| 14 | replace-or-skip-dark | Conflict dialog |
| 15 | onboarding-permissions-dark | First-run permissions |
| 16 | options-dialog-light | Options |
| 17 | properties-dialog-dark | Properties |
| 18 | drive-details-pane-dark | Drive selected + donut |
| 19 | macos-window-buttons-light | Traffic-light variant with 3 tabs |
| 20 | rename-inline-dark | F2 rename, extension not selected |
| 21 | quick-look-dark | Quick Look (mock) |
| 22 | full-window-no-desktop-dark | Window only, as it will look on screen |
