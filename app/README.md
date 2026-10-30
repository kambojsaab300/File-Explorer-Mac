# Khoj app

Electron + React + TypeScript implementation of the design kit in the parent folder.

```bash
npm install
node node_modules/electron/install.js   # npm here skips Electron's postinstall
npm run dev                             # run with hot reload
npm run build && npm start              # run the production build
npm run dist:mac                        # DMG (arm64); must run on a Mac or macOS CI
npm run dist:mac:universal              # Universal DMG (Intel + Apple Silicon)
```

## Status
| Phase | State |
|---|---|
| 0 Setup | done: window chrome, tokens, icons |
| 1 Read-only explorer | done: tabs, address bar, nav pane, This PC, 6 views, details pane |
| 2 File operations | done: new, rename (F2), cut/copy/paste with progress + Replace or Skip, Trash + Undo, Shift+Delete, drag & drop, context menus |
| 3 Mac integration | done: onboarding, Grant access on permission errors, Options (theme, macOS buttons, hidden items, extensions), native menu bar, live folder refresh, recursive search, Finder clipboard |
| 4 Release & Packaging | done: GitHub Actions CI workflow for M1 Apple Silicon DMG/ZIP, electron-builder arm64/universal config, entitlements, artifacts & release workflow |

## Building on GitHub Actions (CI)

A GitHub Actions workflow is provided in `.github/workflows/release-mac.yml`.

1. **Manual trigger (Workflow Dispatch):**
   - Go to your repository on GitHub → **Actions** tab.
   - Select **Build & Release macOS DMG (M1 Apple Silicon)**.
   - Click **Run workflow**, choose target architecture (`arm64`, `universal`, or `x64`), and run.
   - Download the built `.dmg` and `.zip` from the workflow summary **Artifacts**.

2. **Automated Release on Git Tag:**
   - Create and push a version tag:
     ```bash
     git tag v0.1.0
     git push origin v0.1.0
     ```
   - GitHub Actions will automatically compile, package, and publish the `.dmg` and `.zip` to GitHub Releases.

3. **Code Signing & Notarization (Optional):**
   - For an unsigned test build, no secrets are needed.
   - For an Apple-notarized build, add the following GitHub Repository Secrets:
     - `MAC_CERT_P12_BASE64` (Base64 Developer ID Application `.p12`)
     - `MAC_CERT_PASSWORD`
     - `APPLE_ID`
     - `APPLE_APP_SPECIFIC_PASSWORD`
     - `APPLE_TEAM_ID`

## Testing on M1 Mac (Gatekeeper Instructions)

Because personal test builds are not signed by an Apple Developer ID account, macOS Gatekeeper will protect the app upon first launch:

1. Mount the `.dmg` by double-clicking it.
2. Drag `Khoj.app` to the `/Applications` shortcut.
3. Open `/Applications` and launch Khoj:
   - **Method 1 (GUI):** Right-click (or Control-click) `Khoj.app` → select **Open** → click **Open** in the confirmation dialog.
   - **Method 2 (Terminal):** Remove the download quarantine attribute:
     ```bash
     xattr -cr /Applications/Khoj.app
     ```
     Then double-click to launch normally.

## Features to verify on real Mac
- **TCC Permission Dialogs:** Desktop, Documents, Downloads prompts on first access, with fallback to System Settings if denied.
- **Finder Clipboard:** Copy files in Khoj, paste in Finder (⌘V), and vice versa (`NSFilenamesPboardType`).
- **Mac Menu Bar:** File, Edit, View, Go, Window menus and shortcuts (`⌘+,` for Options, `⌘+N` for new folder).
- **Filesystem Watcher:** File changes on APFS/exFAT reflect automatically in the list.
- **Recursive Search:** Search bar recursively searches subfolders and displays drive letters (e.g., `E:\...`).
