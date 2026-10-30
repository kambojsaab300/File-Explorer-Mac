# Khoj app

Electron + React + TypeScript implementation of the design kit in the parent folder.

```bash
npm install
node node_modules/electron/install.js   # npm here skips Electron's postinstall
npm run dev                             # run with hot reload
npm run build && npm start              # run the production build
npm run dist:mac                        # DMG (arm64); must run on a Mac or macOS CI
```

## Status
| Phase | State |
|---|---|
| 0 Setup | done: window chrome, tokens, icons |
| 1 Read-only explorer | done: tabs, address bar, nav pane, This PC, 6 views, details pane |
| 2 File operations | done: new, rename (F2), cut/copy/paste with progress + Replace or Skip, Trash + Undo, Shift+Delete, drag & drop, context menus |
| 3 Mac integration | done: onboarding, Grant access on permission errors, Options (theme, macOS buttons, hidden items, extensions), native menu bar, live folder refresh, recursive search, Finder clipboard |
| 4 Release | DMG config ready in `electron-builder.yml` (unsigned personal build) |

## Differences from `docs/06-technical-architecture.md`
- `ops.copy` / `ops.move` resolve with an `OpResult` when the job ends (progress still streams), so the renderer can record Undo.
- Conflicts are asked through `ops.onConflict`; the dialog answers with `{ choice, applyToAll }`.
- Volume ids are mount paths for now (no UUID lookup yet), so drive letters follow the volume name.
- Undo of Delete needs to find the item in the Trash; without Full Disk Access macOS may hide it, and then that Undo is skipped.
- Finder clipboard uses the raw `NSFilenamesPboardType` pasteboard type through Electron 45's async clipboard API; verify on the target macOS version.
