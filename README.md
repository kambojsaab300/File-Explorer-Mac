# Khoj: Windows-style File Explorer for macOS (Design & Research Kit)

**Khoj** (खोज = "search / explore") is the working name. You can change it anytime.
The goal: on a Mac, the app should **look and feel exactly like the Windows 11 File Explorer** (tabs, address bar, command bar, This PC, drive letters, Ctrl+C/V, F2, Delete), while all the work happens on the macOS file system. It ships as a `.dmg`.

---

## Short summary (Hinglish)
- **Kya bana hai:** Pura design system (colours, sizes, fonts), ek **clickable prototype** (browser mein kholke Explorer jaisa chala sakte ho), 22 screen designs, 104 original icons + app icon (`.icns` ready), user flows, Mac par kaise kaam karega uska mapping, technical architecture (Electron + React), shortcuts, legal checklist aur roadmap.
- **Windows feel kaise aayegi:** Layout, rang aur spacing aapke screenshot se pixel naap kar liye hain (jaise tab strip 32px `#202020`, address row 48px `#2C2C2C`, nav pane 300px). Drive letters bhi milenge: Macintosh HD = **C:**, aapki MyDATA drive = **E:**.
- **Mac par kaam kaise karega:** Delete → Mac ka Trash, Space → Quick Look, permissions → macOS ke prompts, drives → `/Volumes`.
- **Kya use nahi kar sakte:** Microsoft ke original icons, Segoe UI font, Windows logo aur "File Explorer" naam. Isliye icons original banaye hain, aur font ke liye Microsoft ka free font **Selawik** use hoga.
- **Shuru kaise karein:** `design/prototype/index.html` double-click karke kholo, phir `docs/` ko 01 se 09 tak padho.

---

## What's inside
```
Khoj-Mac-Explorer-Kit/
├─ README.md                         ← you are here
├─ docs/
│  ├─ 01-research-report.md          findings + sources (design rules, macOS limits, stack choice)
│  ├─ 02-product-requirements.md     PRD: P0/P1/P2 features + acceptance criteria
│  ├─ 03-ui-design-spec.md           every measurement, colour, component, state
│  ├─ 04-user-flows.md               9 flows with Mermaid diagrams
│  ├─ 05-windows-to-mac-mapping.md   Windows concept → macOS implementation
│  ├─ 06-technical-architecture.md   Electron/React structure, IPC API, packaging, CI
│  ├─ 07-keyboard-shortcuts.md       Ctrl / ⌘ / Both modes
│  ├─ 08-legal-and-licensing.md      what you can and can't ship
│  └─ 09-roadmap-and-milestones.md   phases, sprint-1 tasks, QA + release checklists
├─ design/
│  ├─ prototype/index.html           ★ clickable prototype (single file, works offline)
│  ├─ prototype/src/                 source (app.js, app.css, shell.html)
│  ├─ screens/                       22 PNG screens @2x (1440×900 → 2880×1800)
│  ├─ tokens/tokens.json, tokens.css design tokens (dark + light)
│  ├─ flows/*.mmd + *.svg            flow & architecture diagrams
│  └─ dmg/                           DMG background (@1x, @2x) + install-window preview
├─ icons/
│  ├─ app-icon/                      khoj-app-icon.svg, Khoj.icns, AppIcon.iconset/, png/16…1024
│  ├─ folders/ places/ drives/ files/ 41 coloured SVG icons (48×48 grid)
│  ├─ ui/                            63 monochrome SVG icons (20×20, currentColor)
│  ├─ sprite.svg                     all icons as <symbol>s for the app
│  ├─ manifest.json                  icon list
│  └─ preview.html, icons-sheet.png  contact sheet (light + dark)
└─ tools/                            scripts that regenerate everything
```

## Try the prototype
Open `design/prototype/index.html` in Chrome, Edge, Safari or Firefox. Things to try:
- Double-click **MyDATA (E:)** → **Dev**. Use **Alt+←** to go back and **Alt+↑** to go up.
- **Ctrl/⌘+T** opens a new tab. **Ctrl/⌘+L** lets you type `E:\Dev` or `~/Downloads`.
- Select a file and press **F2** (rename), **Delete** (→ Trash), then **Ctrl/⌘+Z** (undo).
- **Ctrl+C → Ctrl+V** in the same folder creates "- Copy". Right-click a file for the context menu.
- **View ▾** switches between Details, Content, Tiles, Large icons and List. **Details** (top right) opens the details pane.
- **··· → Options** switches theme, window buttons (Windows / macOS), keyboard mode and drive letters.
- Drag a file onto a folder in the nav pane. The same drive moves it, a different drive copies it.

**Deep links** (add after `index.html#`):
`theme=light`, `loc=/Volumes/MyDATA`, `view=content|details|tiles|large|medium|list`, `sel=UI Issues.docx`, `details=1`, `ctx=item|bg`, `menu=view|sort|new|more`, `dialog=onboarding|settings|copy|conflict|properties|quicklook`, `win=mac`, `frame=0`, `tabs=/Users/you/Downloads,home`.
Example: `index.html#theme=light&loc=/Volumes/MyDATA&view=content&details=1&sel=UI%20Issues.docx`

> All data in the prototype is mock data. No real files are touched. Actions that need the real Mac (open, eject, share…) show a small "prototype" note explaining which macOS API the real app will call.

## Key decisions (from the research)
1. **Stack:** Electron + React + TypeScript for v1, because it has the richest macOS file APIs. Tauri remains an option later for a ~10 MB app.
2. **Look:** measured from your Windows 11 screenshots. Rules follow Microsoft's Windows 11 design guidance (8 px / 4 px radii, Segoe-style type ramp).
3. **Font:** Selawik (Microsoft's open-source Segoe UI replacement, SIL OFL). **Download it from github.com/microsoft/Selawik.** It isn't included here because this workspace couldn't download it.
4. **Icons:** 100 % original (this kit). No Microsoft or Apple artwork.
5. **Drive letters:** display-only. C: = Macintosh HD, others are persistent per volume UUID.
6. **Distribution:** signed + notarized DMG outside the Mac App Store. A personal unsigned build also works.

## Next step
Phase 0 + Sprint 1 in `docs/09-roadmap-and-milestones.md`: create the Electron project, drop in `tokens.css`, `sprite.svg` and `Khoj.icns`, then build the window chrome to match `design/screens/22-full-window-no-desktop-dark.png`.

## Regenerate assets
```bash
python3 tools/gen_icons.py            # SVG icons + sprite + manifest
python3 tools/build_icon_preview.py   # icons/preview.html
node    tools/render_app_icon.js      # app icon 1024 PNG   (needs Playwright)
python3 tools/make_icns.py            # .icns + iconset + PNG sizes (needs Pillow)
python3 tools/build_prototype.py      # design/prototype/index.html
node    tools/render_screens.js       # design/screens/*.png
node    tools/check_errors.js         # smoke-test the prototype in 21 states
mmdc -i design/flows/03-copy-move-paste.mmd -o design/flows/03-copy-move-paste.svg   # Mermaid CLI
```
