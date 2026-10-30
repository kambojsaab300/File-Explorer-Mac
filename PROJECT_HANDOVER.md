# 📋 Khoj (Mac Explorer) — Project Handover & Current Status

> **Target Repository**: `https://github.com/kambojsaab300/File-Explorer-Mac.git`  
> **Last Updated**: 30 October 2026  
> **Branch**: `main`  
> **Build Status**: ✅ `npm run typecheck` (0 errors), ✅ `npm run build` (Clean)

---

## 🚀 Overview
**Khoj** is a Windows 11 styled File Explorer built natively for macOS using **Electron + React 19 + TypeScript + Vite + Tailwind/Custom CSS tokens**. It bridges the gap for users transitioning from Windows to Mac by providing the familiar File Explorer UX (Drive letters like `C:\`, `D:\`, Ribbon CommandBar, Nav Pane, Dual Pane, Address Breadcrumbs) while integrating with macOS APIs (Finder interop, Trash, Spotlight, TCC permissions).

---

## 🛠️ Tech Stack & Architecture
- **Runtime**: Electron 45
- **Frontend**: React 19, TypeScript 7, Vite 8, Zustand (State Management), `@tanstack/react-virtual`
- **Styling**: Windows 11 Fluent Design System tokens (`design/tokens/tokens.css`, `app.css`), SVG sprite icons
- **Build System**: `electron-vite`, `electron-builder`

---

## ✅ Completed Features Summary (Up to v2.1)

1. **Core Navigation & Shell**:
   - TabStrip (multiple tabs, new tab, close tab, tear-off architecture).
   - Windows 11 TitleBar with custom caption buttons (Min, Max/Restore, Close).
   - AddressBar with breadcrumb hierarchy, dropdown chevron flyouts, and direct text path entry (`C:\`, `/Volumes/`, `~`).
   - NavPane with Quick Access, This PC (mapped drive letters), Network, and Favorites.

2. **File Explorer Views**:
   - Details, Content, Tiles, Extra Large / Large / Medium / Small Icons, and List views.
   - Virtualized rendering for handling 10,000+ files smoothly.
   - Sorting by Name, Date Modified, Type, Size.

3. **File Operations**:
   - Cut, Copy, Paste, Duplicate (`- Copy` naming convention).
   - New Folder, New Text Document.
   - Move to Trash, Permanent Delete (Shift+Delete), Undo/Redo stack.
   - Drag & Drop within Explorer and between Mac Finder / Desktop.

4. **Advanced Features (v1.1 - v2.1)**:
   - **Dual-Pane Split View**: Side-by-side explorer panes toggled with `Alt+2`.
   - **Batch Rename**: Multi-file renaming with live find/replace regex preview (`F2`).
   - **Checksum / Hash Calculator**: Instant SHA-256 and MD5 hash generation with clipboard comparison.
   - **Rich Preview Pane (`Alt+P`)**: Fast preview for code, markdown, images, audio, and video.
   - **ZIP Compression & Extraction**: Right-click compress to zip and Extract All.
   - **File Properties Dialog**: General, Details, and Security tabs with macOS permissions.
   - **Spotlight Search**: Fast file searching with real-time filtering.
   - **Network Drive Mapping**: Connect to SMB shares with assigned virtual drive letters (`Z:\`, `Y:\`).
   - **Localization**: English + Hindi (हिंदी) language switch.
   - **Status Bar**: Selected item count, total size, view switcher, and active Git branch indicator.
   - **Multi-Window Support**: Full IPC support for opening multiple independent Khoj windows.

---

## 💻 Commands to Run on Your Laptop

```bash
# 1. Clone repository (agar pehle se nahi kiya hai)
git clone https://github.com/kambojsaab300/File-Explorer-Mac.git
cd File-Explorer-Mac

# 2. Go to app directory & install packages
cd app
npm install

# 3. Development Mode
npm run dev

# 4. Typecheck & Build
npm run typecheck
npm run build

# 5. Package macOS App (DMG) - Run on Mac:
npm run dist:mac
```

---

## 🎯 Next Steps / Backlog
- Test natively on macOS (Apple Silicon M1/M2/M3 and Intel).
- Test DMG notarization pipeline (`electron-builder.yml`).
- Optional: Add cloud storage virtual providers (iCloud Drive / Google Drive deep hooks).
