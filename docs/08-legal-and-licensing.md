# 08 · Legal & Licensing Checklist

> This is practical guidance from research, not legal advice. If you plan to sell Khoj or publish it widely, have a lawyer review the name and marketing.

## 1. What you must NOT ship
| Item | Why | Do instead |
|---|---|---|
| The name **"File Explorer"**, **"Windows"**, **"Microsoft"** in the app name, icon, or store listing | Microsoft's trademark guidelines say not to use its brand assets in the name of your product or app. Microsoft has sent removal notices to apps with "Windows" in the name. | Use your own name (codename **Khoj**). In descriptions you may say "inspired by the Windows 11 file explorer" or "works like Windows Explorer". Don't use the Windows logo. |
| The **Windows logo / four-pane flag** anywhere (including on the C: drive icon) | A logo licence is needed for any use. | The kit's system-drive icon uses an original blue "computer" badge. |
| Microsoft **shell icons** extracted from `imageres.dll` / `shell32.dll` (yellow folder, drives, Recycle Bin) | Copyrighted artwork | Use the kit's original icons (`icons/`). |
| **Segoe UI / Segoe UI Variable / Segoe Fluent Icons** font files | Licensed only as part of Windows. Redistribution not allowed. | Bundle **Selawik** (SIL OFL 1.1). Optionally reference `"Segoe UI Variable"` first in the font stack so users who installed it legally get it. |
| **Apple logo** in the UI (e.g., a fake menu bar) | Apple trademark | The prototype's fake menu bar intentionally has no Apple logo. The real app uses the real macOS menu bar. |
| Screenshots of real Windows in marketing that look like "official" | Confusion risk | Use screenshots of Khoj itself. |

## 2. What you CAN use
| Asset | Licence | Obligations |
|---|---|---|
| **Selawik** font (Microsoft) | SIL Open Font License 1.1 | Include `OFL.txt`. Don't sell the font alone. Don't call a modified version "Selawik". |
| **Fluent UI System Icons** (`@fluentui/svg-icons`, monochrome) | MIT | Keep the MIT notice in "Third-party notices" if you add them. (This kit's UI icons are original, so you don't need them.) |
| **Cascadia Mono** (optional monospace) | SIL OFL 1.1 | Include OFL text. |
| **Electron**, Chromium, Node.js | MIT + various (Chromium BSD) | electron-builder includes `LICENSES.chromium.html`. Show an "About → Open-source licences" screen. |
| React, Zustand, @tanstack/react-virtual, @parcel/watcher, electron-store | MIT | Notices file |
| @photostructure/fs-metadata | MIT | Notices file |
| Layout / interaction patterns (tabs, breadcrumbs, command bar, Details view…) | General UI patterns used by many file managers | Fine. Keep the visuals original (icons, logo, name). |
| **This kit's icons, app icon, tokens, prototype, docs** | Original work made for you | Yours to use. Add your preferred licence (e.g., proprietary or MIT). |

## 3. Apple distribution
- **Personal use:** no Apple account needed. Unsigned app → right-click → Open the first time.
- **Sharing with others:** Apple Developer Program (USD 99/year) → Developer ID Application certificate → hardened runtime → notarize (notarytool) → staple → DMG.
- Don't claim Apple endorsement. "Made for macOS" wording is fine. "Designed by Apple" is not.

## 4. Privacy
- Khoj reads the user's files locally only. State this in the README / website.
- If you add telemetry or crash reporting, make it opt-in and never send file names or paths.
- The `Info.plist` usage strings (see architecture §8) must explain honestly why access is needed.

## 5. Third-party notices template
Create `resources/THIRD_PARTY_NOTICES.txt` with entries like:
```
Selawik — © 2015 Microsoft Corporation, SIL Open Font License 1.1 (see OFL.txt)
Electron — © Electron contributors, MIT License
React — © Meta Platforms, Inc. and affiliates, MIT License
…
```
Generate the npm part automatically with `npx license-checker --production --csv` (or `license-report`) during the build.
