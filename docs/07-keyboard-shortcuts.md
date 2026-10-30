# 07 · Keyboard Shortcuts

Khoj has three keyboard modes (Options → Keyboard shortcuts):
- **Both** (default): every `Ctrl` shortcut also works with `⌘`.
- **Windows (Ctrl)**: exactly like Windows. `⌘` shortcuts are left to macOS.
- **Mac (⌘)**: `⌘` replaces `Ctrl`. Windows-only keys (F2, F5, Delete, Alt+arrows) keep working.

Notes for MacBook keyboards:
- **Alt = ⌥ Option**.
- **Delete** (forward delete) is `Fn+⌫` on laptops. Khoj also accepts `⌘⌫` (Finder habit).
- F-keys need `Fn` unless *System Settings → Keyboard → Use F1, F2, etc. keys as standard function keys* is on. Onboarding shows this tip.

| Action | Windows 11 | Khoj — Ctrl / Both | Khoj — ⌘ mode | Prototype |
|---|---|---|---|---|
| New window | Ctrl+N | Ctrl+N | ⌘N | note |
| New tab | Ctrl+T | Ctrl+T | ⌘T | ✓ |
| Close tab | Ctrl+W | Ctrl+W | ⌘W | ✓ |
| Next / previous tab | Ctrl+Tab / Ctrl+Shift+Tab | same | ⌃Tab / ⌃⇧Tab | ✓ |
| Go to tab 1…8 / last | Ctrl+1…8 / Ctrl+9 | same | ⌘1…8 / ⌘9 | – |
| Back / Forward | Alt+← / Alt+→ , Backspace | same | ⌥← / ⌥→ , ⌘[ / ⌘] | ✓ |
| Up one level | Alt+↑ | Alt+↑ | ⌥↑ , ⌘↑ | ✓ |
| Open selected | Enter | Enter | Enter, ⌘↓ | ✓ |
| Open in new tab | Ctrl+Enter / middle-click | same | ⌘Enter / ⌘-double-click | ✓ (Ctrl/⌘+Enter) |
| Address bar | Alt+D, Ctrl+L, F4 | same | ⌥D, ⌘L, F4 | ✓ |
| Search box | Ctrl+E, Ctrl+F, F3 | same | ⌘E, ⌘F, F3 | ✓ |
| Refresh | F5, Ctrl+R | same | F5, ⌘R | ✓ |
| New folder | Ctrl+Shift+N | same | ⌘⇧N | ✓ |
| Rename | F2 | F2 | F2, Enter-hold (P1) | ✓ |
| Cut / Copy / Paste | Ctrl+X / C / V | same | ⌘X / C / V | ✓ |
| Paste as move (Finder-style) | – | – | ⌘⌥V | P1 |
| Undo / Redo | Ctrl+Z / Ctrl+Y | same | ⌘Z / ⌘⇧Z | undo ✓ |
| Select all | Ctrl+A | same | ⌘A | ✓ |
| Delete → Trash | Delete | Delete | Delete, ⌘⌫ | ✓ |
| Delete permanently | Shift+Delete | same | ⇧Delete, ⌘⌥⌫ | ✓ |
| Properties | Alt+Enter | Alt+Enter | ⌘I, ⌥Enter | ✓ |
| Copy as path | Ctrl+Shift+C | same | ⌘⇧C | ✓ |
| Details pane | Alt+Shift+P | same | ⌥⇧P | ✓ |
| Preview pane | Alt+P | same | ⌥P | P2 |
| Quick Look | (PowerToys Peek: Ctrl+Space) | Space | Space | ✓ |
| Views: Large / Medium / List / Details / Tiles / Content | Ctrl+Shift+2 / 3 / 5 / 6 / 7 / 8 | same | ⌘⇧2…8 | ✓ |
| Zoom icons | Ctrl+mouse wheel | same | ⌘+wheel / pinch | P1 |
| Cycle panes | F6 / Tab | same | same | P1 |
| Expand / collapse in nav | → / ← , NumLock+ / − | → / ← | → / ← | P1 |
| Jump by letter | type letters | same | same | ✓ |
| First / last item | Home / End | same | Home / End, ⌘↑/⌘↓ in lists | ✓ |
| Extend selection | Shift+arrows | same | same | ✓ |
| Cancel cut / close menu | Esc | Esc | Esc | ✓ |
| Close window | Alt+F4 | Alt+F4 → close window | ⌘⇧W | – |
| Options | – | Ctrl+, | ⌘, | – |
| Show/hide hidden items | – | Ctrl+Shift+. | ⌘⇧. (same as Finder) | P1 |

### Never bound (belong to macOS)
`⌘Q` stays quit, `⌘H` hide, `⌘M` minimise, `⌘Space` Spotlight, `⌘Tab` app switcher, `⌃←/→` Mission Control spaces, `⌃↑/↓` Mission Control / App Exposé, `⌘⇧3/4/5` screenshots.

### Implementation
A single table (`src/renderer/keyboard/shortcuts.ts`) of `{ id, label, win: 'Ctrl+Shift+N', mac: 'Cmd+Shift+N', when: 'list' | 'global', run }` generates:
1. the native menu accelerators (so they show in the macOS menu bar and work with VoiceOver),
2. the renderer key handler (for Ctrl variants and Windows-only keys),
3. tooltips ("Cut (Ctrl+X)" / "Cut (⌘X)") and the Keyboard shortcuts dialog.

**Gotcha:** on macOS, holding ⌥ Option changes `event.key` (⌥D gives `∂`). Match Alt/Option shortcuts on `event.code` (`KeyD`, `KeyP`) and not on `event.key`.
