# 09 · Roadmap, Milestones & Checklists

Estimates assume **1 full-time developer** who knows React/TypeScript, using this kit (design is done). Part-time ≈ double.

## Phase plan
| Phase | Duration | Deliverable | Exit criteria |
|---|---|---|---|
| **0. Setup** | 2–3 days | electron-vite + React + TS repo, tokens.css, Selawik bundled, icon sprite, empty window with Windows caption buttons, signed dev build | App launches, chrome matches screen 22 pixel for pixel (±1 px) |
| **1. Read-only explorer** | 2 weeks | Tabs, address bar (breadcrumbs + edit), nav pane tree, This PC (real volumes + letters), Details/Content/Tiles/Icons/List views, sorting, selection, status bar, details pane, theme switching | Browse every folder on the Mac and external drives. 10k-item folder < 300 ms. |
| **2. File operations** | 2 weeks | New folder/file, rename, cut/copy/paste with progress + conflicts, trash/permanent delete, undo, drag & drop in/out, clipboard interop with Finder, context menus, open/open with/reveal/Quick Look | All P0-11/12/13/16 acceptance criteria pass on APFS, exFAT, SMB |
| **3. Mac integration & polish** | 1–1.5 weeks | Onboarding + TCC handling, Options dialog, keyboard modes, native menu bar, watchers, iCloud badges, search v1, accessibility pass, Reduce motion/transparency | Manual checklist below 100 % |
| **4. Release** | 3–4 days | electron-builder universal DMG, notarization, DMG background, auto-update feed, crash-free smoke test on Intel + Apple Silicon | Notarized DMG installs on a clean Mac without warnings |
| **v1.1** | 3–4 weeks | Home Recent/Favorites, Gallery thumbnails, Properties window, ZIP compress/extract, Spotlight search + filters, Network/SMB mapping, tab tear-off, tags | Completed |
| **v2** | 2 weeks | Dual-pane / split view (Alt+2), Multi-mode batch rename with live preview (F2), Cryptographic checksums (SHA-256 & MD5 hash calculator with match verification), Rich preview pane (Alt+P) for code/images/audio/video, macOS package inspection, and Hindi localisation (हिंदी) | Completed |

**MVP total: ~6–7 weeks full-time.**

## Sprint 1 task list (copy into your tracker)
1. `npm create @quick-start/electron khoj -- --template react-ts`
2. Copy `design/tokens/tokens.css` → `src/renderer/styles/`, `icons/sprite.svg` → inline in `index.html`, `Khoj.icns` → `build/icon.icns`.
3. Download Selawik TTFs + OFL from github.com/microsoft/Selawik → `resources/fonts/`.
4. Implement `window.ts` (§3 of architecture), caption buttons, drag regions, maximise radius rule.
5. Implement `volumes.service` + `fs.list` + preload API stubs.
6. Port these from the prototype into React components: TabStrip, AddressBar, CommandBar, NavPane, DetailsView, ContentView, StatusBar.
7. Visual check against `design/screens/01`, `02`, `03`.

## Manual QA checklist (before every release)
**Install & permissions**
- [ ] Fresh macOS user: DMG opens, drag to Applications, first launch has no Gatekeeper warning (signed build)
- [ ] Desktop/Documents/Downloads prompts appear with our text. "Don't Allow" shows the empty state with Grant access
- [ ] `tccutil reset All com.yourname.khoj` then re-test
- [ ] Full Disk Access button opens the correct pane

**Navigation**
- [ ] Address bar accepts `C:\Users\<you>`, `E:\…`, `/Volumes/…`, `~`, "This PC", "Recycle Bin"
- [ ] Breadcrumb chevron flyouts list sub-folders
- [ ] Back/Forward/Up/Backspace, tabs restore after relaunch

**Drives**
- [ ] Plug in USB (exFAT): appears with the next letter and the same letter next time
- [ ] NTFS drive: read-only badge, write commands disabled
- [ ] Eject works. "Busy" message when a file is open
- [ ] SMB share mount and browse. Disconnect handled

**Operations**
- [ ] Copy 5 GB folder across volumes: progress, pause, resume, cancel (partial file removed)
- [ ] Same-folder copy → "- Copy". Conflict dialog: Replace / Skip / Keep both
- [ ] Cut/paste move, Undo restores
- [ ] Delete → Trash, Undo puts back. Shift+Delete confirm
- [ ] Rename: extension not selected, invalid chars blocked, case-only rename works
- [ ] Drag out to Finder and Mail. Drag in from Finder
- [ ] Copy in Khoj → paste in Finder (⌘V) and vice versa

**UI**
- [ ] Dark/Light live switch. Window buttons switch. Text size 100/110/125 %
- [ ] All 6 views + compact. Sort by every column both directions
- [ ] Every screen in `design/screens/` matches the build (±2 px)
- [ ] Keyboard modes: Ctrl, ⌘, Both. Every shortcut in 07 works
- [ ] VoiceOver reads rows, menus and dialogs. Full keyboard navigation
- [ ] Reduce motion / Reduce transparency respected

**Performance**
- [ ] `~/Library/Caches` (large) and a 10k-file folder scroll at 60 fps
- [ ] Memory < 250 MB after 30 minutes of use

## Release checklist
- [ ] Version bump + changelog
- [ ] `npm run test && npm run e2e`
- [ ] CI builds universal DMG → notarized → stapled (`xcrun stapler validate`)
- [ ] `spctl -a -vv /Applications/Khoj.app` shows "accepted, source=Notarized Developer ID"
- [ ] Upload DMG + zip + `latest-mac.yml` for auto-update
- [ ] Third-party notices updated
