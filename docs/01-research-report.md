# 01 · Research Report — Windows 11 File Explorer feel on macOS

**Project codename:** Khoj (खोज, "search / explore"). This is a placeholder name you can change.
**Goal:** A macOS app, shipped as a `.dmg`, that looks and behaves like the Windows 11 File Explorer but works on the Mac file system.
**Date of research:** 30 Oct 2026

---

## 1. Summary of findings

| # | Question | Answer |
|---|---|---|
| 1 | Is it possible? | **Yes.** A desktop web stack (Electron or Tauri) can reproduce the Explorer layout pixel for pixel. Every file action it needs has a macOS-native API behind it. |
| 2 | Recommended stack | **Electron + React + TypeScript** for v1, because it has the most ready-made macOS file APIs (icons, thumbnails, Trash, Quick Look, native drag-out). Tauri 2 is the lighter alternative if you want a small download. See §6. |
| 3 | Can we use Microsoft's real icons / Segoe UI font / "File Explorer" name? | **No.** Use original icons (included in this kit), Microsoft's open-source **Selawik** font (SIL OFL) as the Segoe UI substitute, and our own product name. See §4 and `08-legal-and-licensing.md`. |
| 4 | Will macOS block us from reading files? | macOS asks the user once per protected folder (Desktop, Documents, Downloads, removable and network volumes). **Full Disk Access cannot be requested programmatically**: we can only open the right System Settings pane. See §5. |
| 5 | App Store? | **No, for v1.** A file manager needs to be non-sandboxed, so distribute a signed + notarized `.dmg` directly. See §5.4. |
| 6 | Biggest technical risks | Large-folder performance (virtualised lists), cross-volume copy with progress, file-URL clipboard interoperability with Finder, notarization pipeline. Each has a mitigation in `06-technical-architecture.md`. |

---

## 2. Anatomy of the Windows 11 File Explorer (measured)

These numbers were sampled pixel by pixel from your two reference screenshots (dark theme, 100 % scale, 1920 px wide). They are the base of `design/tokens/tokens.json`.

```
y=0   ┌─────────────────────────────────────────────────────────────────────────────┐
      │ [tab 240px, radius 8 top] [+]                      [ — ] [ ▢ ] [ ✕ ]  46×32 │ Tab strip   32px  #202020
y=32  ├─────────────────────────────────────────────────────────────────────────────┤
      │ ← → ↑ ⟳  (40×32, pitch 48)  [ address box 32px #383838 ] [ search #383838 ]│ Address row 48px  #2C2C2C
y=80  ├──────────────────────────── 1px #3A3A3A ─────────────────────────────────────┤
      │ (+)New ▾ │ ✂ ⧉ 📋 ⌶ ↗ 🗑 │ ⇅Sort ▾  ☰View ▾ │ ···              ▯ Details │ Command bar 48px  #191919
y=128 ├──────────────────────────── 1px #3A3A3A ─────────────────────────────────────┤
      │ Nav pane 300px          │ Content                                           │
      │ item height 32          │ "Devices and drives" group header 14px            │ #191919
      │ selected #505050 +      │ drive tile 254px: icon 48 + name + bar 190×12     │
      │ 1px focus #C3C3C3       │ Content view rows 48px, divider #2B2B2B           │
      ├─────────────────────────┴───────────────────────────────────────────────────┤
      │ 10 items |                                                       [≣] [⊞]    │ Status bar  24px  #1C1C1C
      └─────────────────────────────────────────────────────────────────────────────┘
```

Other measured facts:
- Text is pure white `#FFFFFF`. Secondary captions ("110 GB free of 374 GB") are `#DEDEDE`. Disabled command icons are `#5B5A5A`.
- The drive usage bar fill is `#0070CB`. Its track stays light (`#E6E6E6`) even in dark mode. Windows turns the bar red when space is low.
- The nav pane selection is a **square** rectangle (no rounding) with a 1 px light focus border. Child items in the tree are indented 8 px per level.
- The window caption buttons are 46 × 32 and sit flush right.

### Features the reference Explorer has (and we must match)
- **Tabs** in the title bar (Windows 11 22H2+), including tear-off and merge.
- **Home** (Quick access + Recent / Favorites / Shared), **Gallery** (photo timeline), **This PC**, **Network**.
- **Address bar** with breadcrumb chevrons that open sub-folder flyouts. Clicking empty space turns it into an editable path box.
- **Command bar** with New ▾, Cut, Copy, Paste, Rename, Share, Delete, Sort ▾, View ▾, "See more" (···), and a **Details** pane toggle. Commands grey out when they can't run.
- **Details pane** (Alt+Shift+P) with thumbnail, properties and actions.
- **View modes**: Extra-large / Large / Medium / Small icons, List, Details, Tiles, Content, plus Compact view.
- **Modern context menu**: an icon row on top (Cut, Copy, Rename, Share, Delete), then a list of commands.

Sources: [Windows 11 File Explorer 23H2 field guide (Thurrott)](https://www.thurrott.com/books/windows-11-field-guide/files/293020/file-explorer-23h2), [New details pane & tab dragging (Pureinfotech)](https://pureinfotech.com/file-explorer-new-details-pane-tab-drag-windows-11/), [Insider build 23451 notes (ElevenForum)](https://www.elevenforum.com/t/windows-11-insider-dev-build-23451-1000-may-4.14640/post-293131).

---

## 3. Windows 11 design language — the rules we copy

| Topic | Rule | Source |
|---|---|---|
| Corner radius | **8 px** for top-level containers (windows, flyouts, dialogs). **4 px** for in-page controls (buttons, list backplates, progress bars). **0 px** when straight edges meet, and for snapped/maximised windows. | [Microsoft Learn – Geometry in Windows 11](https://learn.microsoft.com/en-us/windows/apps/design/signature-experiences/geometry) |
| Type ramp | Caption 12/16, Body 14/20, Body strong 14/20 semibold, Body large 18/24, Subtitle 20/28, Title 28/36 | [Microsoft Learn – Typography in Windows](https://learn.microsoft.com/en-us/windows/apps/design/signature-experiences/typography) |
| System font | **Segoe UI Variable** (variable weight + optical size). Not licensed for redistribution or for use on macOS. | [Windows 11 font list](https://learn.microsoft.com/typography/fonts/windows_11_font_list) |
| Materials | **Mica**: an opaque material tinted by the wallpaper, used for long-lived windows. When it isn't available, the fallback is `SolidBackgroundFillColorBase`. | [Microsoft Learn – Mica](https://learn.microsoft.com/windows/apps/design/style/mica) |
| Colour resources | Text primary `#E4000000` (light) / `#FFFFFFFF` (dark). Background base `#F3F3F3` (light) / `#202020` (dark). | [XAML theme resources](https://msdn.microsoft.com/pt-br/library/windows/apps/mt187274), [Windows 11 colour reference](https://abacktools.com/tools/design/color-tools/windows-11-colors) |

**On macOS:** we imitate Mica with Electron's `vibrancy: 'under-window'` plus a semi-opaque tint layer in CSS. Users who prefer a solid look get the measured solid colours (`#202020` / `#F3F3F3`). Electron supports vibrancy types such as `sidebar`, `under-window` and `window` on macOS ([Electron BrowserWindow options](https://ayakael.net/mirrors/electron/src/commit/58d49927a3be47d6f8aa66799713d2dee957d6ac/docs/api/structures/browser-window-options.md)).

---

## 4. Fonts and icons — what we are allowed to ship

### 4.1 Font: Selawik (recommended)
- Selawik is Microsoft's **open-source replacement for Segoe UI**, licensed under the **SIL Open Font License 1.1**. It ships in Light, Semilight, Regular, Semibold and Bold ([Microsoft Learn – Selawik](https://learn.microsoft.com/en-gb/typography/font-list/selawik), [GitHub microsoft/Selawik](https://github.com/microsoft/Selawik)).
- It covers **Latin only** (352 glyphs), so Hindi / Devanagari file names fall back to the macOS system font automatically through the CSS font stack.
- Font stack used in the kit: `"Segoe UI Variable Text", "Segoe UI", "Selawik", -apple-system, "SF Pro Text", system-ui, sans-serif`.
- OFL rules: you may bundle it inside the app. You may not sell the font by itself. You may not modify it and keep the reserved name "Selawik".

### 4.2 Icons
- **Microsoft's shell icons** (the yellow Explorer folder, drive icons with the Windows flag, and so on) and the **Windows logo** are Microsoft brand assets and must not be copied ([Microsoft Trademark & Brand Guidelines](https://www.microsoft.com/en-US/legal/intellectualproperty/trademarks/usage/general)).
- **Fluent UI System Icons** (the monochrome UI glyphs) are **MIT-licensed** and can be used freely ([npm @fluentui/svg-icons – MIT](https://npmjs.com/package/@fluentui/svg-icons)). They are a good option if you want more glyphs later.
- **This kit ships an original icon set** (41 coloured + 63 monochrome icons plus the app icon). It is drawn in the same flat-with-soft-gradient style, so licensing is not a problem. See `icons/preview.html`.

---

## 5. macOS platform constraints

### 5.1 Privacy (TCC) prompts
- Since macOS 10.15, a non-sandboxed app that touches **Desktop, Documents, Downloads, removable volumes or network volumes** triggers a one-time consent prompt. Each prompt shows the text from the matching `Info.plist` key: `NSDesktopFolderUsageDescription`, `NSDocumentsFolderUsageDescription`, `NSDownloadsFolderUsageDescription`, `NSRemovableVolumesUsageDescription`, `NSNetworkVolumesUsageDescription` ([Apple – NSDocumentsFolderUsageDescription](https://developer.apple.com/documentation/bundleresources/information-property-list/nsdocumentsfolderusagedescription.md)).
- An open-source Tauri file manager (Cmdr) added exactly these keys so that macOS shows prompts instead of silently denying access ([commit ff0c27e](https://github.com/vdavid/cmdr/commit/ff0c27e)). We do the same.
- A denied request fails with **EPERM** (TCC). A plain permission problem fails with **EACCES**. The UI must treat them differently ([Apple Developer Forums](https://developer.apple.com/forums/thread/126430)).
- The user can reset a choice with `tccutil reset SystemPolicyDocumentsFolder <bundleID>`. This is useful for QA.

### 5.2 Full Disk Access
- **No entitlement grants Full Disk Access.** Only the user can switch it on ([LiveCode forum, Apple TSI summary](https://forums.livecode.com/viewtopic.php?p=219995)).
- We can open the exact pane with `x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles` ([docs.rs constant](https://docs.rs/runner-manager-platform/0.4.21/runner_manager_platform/os/constant.FULL_DISK_ACCESS_SETTINGS_URL.html)).
- Khoj makes Full Disk Access **optional**. Without it, everything except a few protected Library folders (Mail, Safari, Messages) still works.

### 5.3 Window chrome
- `titleBarStyle: 'hidden'` removes the macOS title bar but keeps the traffic lights. `win.setWindowButtonVisibility(false)` hides them, which lets us draw Windows-style − ▢ ✕ buttons on the right. `trafficLightPosition` moves them if the user prefers macOS buttons ([Electron – Custom Title Bar](https://electronjs.org/docs/latest/tutorial/custom-title-bar)).

### 5.4 Distribution
- Ship outside the Mac App Store: sign with a **Developer ID** certificate, enable the **Hardened Runtime**, notarize with **notarytool**, staple, then package as a DMG. `altool` was removed on 1 Nov 2023 ([Forasoft – Publishing Electron apps on macOS](https://forasoft.com/blog/article/publishing-desktop-apps-on-macos-290)).
- Electron needs the `com.apple.security.cs.allow-jit` entitlement. A few internals may also need `allow-unsigned-executable-memory` ([electron-builder – macOS](https://www.electron.build/v26/docs/mac)).
- electron-builder can build `--universal` binaries (Intel + Apple Silicon) by merging both slices with `lipo` ([electron-builder – Architecture](https://www.electron.build/docs/architecture)).
- DMG builds and code signing need macOS. Without a Mac, use GitHub Actions `macos-latest` (arm64) or `macos-15-intel` runners ([shinyelectron GH Actions guide](https://stat.ethz.ch/CRAN/web/packages/shinyelectron/vignettes/github-actions.html), [Fabric build-macos notes](https://agents.fabric.pro/docs/development/build-macos)).
- An Apple Developer account costs USD 99 per year. For personal use you can skip it and right-click → Open the first time.

---

## 6. Stack comparison

| | **Electron + React** (recommended v1) | **Tauri 2 + React** | **Native SwiftUI/AppKit** | **Avalonia (C#)** |
|---|---|---|---|---|
| Pixel-perfect Windows look | ★★★ (CSS) | ★★★ (CSS, WKWebView) | ★ (fighting AppKit) | ★★ (Fluent theme) |
| macOS file APIs out of the box | ★★★ getFileIcon, thumbnails, trashItem, previewFile, startDrag | ★★ via Rust crates + plugins | ★★★ | ★ |
| App size | ~85–250 MB | ~3–10 MB | ~5 MB | ~60 MB |
| Idle RAM | ~150–400 MB | ~40–80 MB | lowest | medium |
| Team skills needed | JS/TS only | JS/TS + Rust | Swift | C# |
| Windows/Linux build later | yes | yes | no | yes |

Benchmarks: Tauri "Hello World" is 3.2 MB versus Electron's 85 MB, and a 6-window app is 8.6 MB versus 244 MB ([Tech Insider, July 2026](https://tech-insider.org/tauri-vs-electron-2026/); [Hopp benchmark](https://dev.to/gethopp/tauri-vs-electron-performance-bundle-size-and-the-real-trade-offs-1el4)). Electron's advantage is that its whole runtime is predictable across platforms ([PkgPulse, May 2026](https://www.pkgpulse.com/guides/electron-vs-tauri-2026)).

**Decision:** Build v1 on **Electron** for speed of development and the richest macOS APIs. Keep all UI code framework-agnostic (React + CSS tokens), so a later move to Tauri only replaces the main-process layer.

### Electron APIs that map 1:1 to Explorer features
| Explorer feature | Electron API (macOS) |
|---|---|
| Real file-type icons | `app.getFileIcon(path, { size })` |
| Thumbnails in Large icons / Gallery | `nativeImage.createThumbnailFromPath(path, size)`, available on macOS and Windows ([Electron PR #24802](https://ayakael.net/mirrors/electron/commit/beaf60de0a611c4a699b04e515d72a5a60ca7718)) |
| Delete → Recycle Bin | `shell.trashItem(path)` → macOS Trash |
| Preview (Space) | `win.previewFile(path)` → native Quick Look ([Electron docs](https://ayakael.net/mirrors/electron/commit/43b4a3ae6a6cbd1cf2c1ebf39d11080a0a043582)) |
| Drag files out to Finder / Mail / Slack | `webContents.startDrag({ file, icon })` ([Electron – Native File Drag & Drop](https://www.electronjs.org/docs/latest/tutorial/native-file-drag-drop)) |
| Open with default app | `shell.openPath(path)` |
| Show in Finder | `shell.showItemInFolder(path)` |
| Mica-like backdrop | `vibrancy: 'under-window'` |

**Electron version:** the three newest majors are supported. As of early October 2026, 44.x is stable and Electron 45 is scheduled for stable on 20 Oct 2026 ([endoflife.ai](https://endoflife.ai/article-electron-42-eol), [Tech Insider](https://tech-insider.org/electron-44-7-0-chromium-152-node-24-2026/)). Pin whatever is newest stable on day 1.

### Volumes and disk space
- Built in: `fs.statfs(path)` (Node ≥ 18.15) gives total and free space for `/` and each `/Volumes/*`.
- Library option: **@photostructure/fs-metadata** lists mount points and volume metadata (including UUID, which we need for stable drive letters) and gets/sets hidden attributes. Supports macOS 14+ and Electron ([docs](https://photostructure.github.io/fs-metadata/index.html)).

---

## 7. Prior art worth studying

| Project | Why |
|---|---|
| **Files** (files-community/Files, MIT, C#/WinUI) | The best modern Explorer-style UX on Windows: tabs, dual pane, columns, tags ([GitHub](https://awesome.ecosyste.ms/projects/github.com%2Ffiles-community%2Ffiles)). Use it as a UX reference only. Its code is Windows-only. |
| **Cmdr** (Tauri) | A real-world example of the macOS TCC keys and hardened-runtime entitlements for a file manager. |
| Finder | Platform conventions we should keep: Quick Look, Trash, tags, aliases. |

---

## 8. Key decisions for this kit
1. **Look = Windows 11, plumbing = macOS.** Paths stay POSIX inside the app. Drive letters are a **display layer only**: Macintosh HD → C:, external drives get persistent letters by volume UUID.
2. **Both keyboard schemes.** Default is "Both", so Ctrl and ⌘ both work, plus Windows keys such as F2, F5, Delete and Alt+arrows.
3. **Windows-style caption buttons by default**, with an option for macOS traffic lights.
4. **Original branding and icons**, the Selawik font, and no Microsoft logos or names in the product.
5. **Electron v1 → optional Tauri v2** if size matters later.

## Sources (all links)
- https://learn.microsoft.com/en-us/windows/apps/design/signature-experiences/geometry
- https://learn.microsoft.com/en-us/windows/apps/design/signature-experiences/typography
- https://learn.microsoft.com/typography/fonts/windows_11_font_list
- https://learn.microsoft.com/windows/apps/design/style/mica
- https://msdn.microsoft.com/pt-br/library/windows/apps/mt187274
- https://abacktools.com/tools/design/color-tools/windows-11-colors
- https://learn.microsoft.com/en-gb/typography/font-list/selawik
- https://npmjs.com/package/@fluentui/svg-icons
- https://www.microsoft.com/en-US/legal/intellectualproperty/trademarks/usage/general
- https://developer.apple.com/documentation/bundleresources/information-property-list/nsdocumentsfolderusagedescription.md
- https://github.com/vdavid/cmdr/commit/ff0c27e
- https://developer.apple.com/forums/thread/126430
- https://forums.livecode.com/viewtopic.php?p=219995
- https://docs.rs/runner-manager-platform/0.4.21/runner_manager_platform/os/constant.FULL_DISK_ACCESS_SETTINGS_URL.html
- https://electronjs.org/docs/latest/tutorial/custom-title-bar
- https://www.electronjs.org/docs/latest/tutorial/native-file-drag-drop
- https://forasoft.com/blog/article/publishing-desktop-apps-on-macos-290
- https://www.electron.build/v26/docs/mac
- https://www.electron.build/docs/architecture
- https://tech-insider.org/tauri-vs-electron-2026/
- https://dev.to/gethopp/tauri-vs-electron-performance-bundle-size-and-the-real-trade-offs-1el4
- https://www.pkgpulse.com/guides/electron-vs-tauri-2026
- https://endoflife.ai/article-electron-42-eol
- https://photostructure.github.io/fs-metadata/index.html
- https://www.thurrott.com/books/windows-11-field-guide/files/293020/file-explorer-23h2
- https://pureinfotech.com/file-explorer-new-details-pane-tab-drag-windows-11/
