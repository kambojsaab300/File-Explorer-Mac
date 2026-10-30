# 04 · User Flows

Each flow has a diagram (Mermaid source in `design/flows/*.mmd`, rendered `*.svg` next to it), the step-by-step behaviour, and the edge cases engineering must handle. GitHub and VS Code render the Mermaid blocks below directly.

---

## Flow 1 — Install, first launch & permissions
![first launch](../design/flows/01-first-launch-and-permissions.svg)

```mermaid
flowchart TD
  A(["User opens Khoj.dmg"]) --> B["Drag Khoj into Applications"]
  B --> C(["First launch"])
  C --> D{Signed and notarized?}
  D -- No --> D1["Gatekeeper warning<br/>Right-click → Open once"] --> E
  D -- Yes --> E["Welcome / onboarding dialog"]
  E --> F["Choose keyboard: Ctrl / ⌘ / Both"]
  F --> G["Choose window buttons: Windows / macOS"]
  G --> H["Allow Desktop, Documents, Downloads"]
  H --> I{macOS TCC prompt per folder}
  I -- Allow --> J["Folder readable"]
  I -- Don't Allow --> K["Show 'No access' empty state<br/>+ button 'Open Privacy settings'"]
  J --> L{Optional: Full Disk Access?}
  L -- Skip --> M(["Open This PC"])
  L -- Open System Settings --> N["x-apple.systempreferences:…Privacy_AllFiles<br/>user toggles Khoj ON → restart app"]
  N --> M
  M --> O["External drive plugged in"] --> P{First access to removable volume}
  P -- Allow --> Q["Drive appears under This PC with letter D:, E:…"]
```

**Steps**
1. The user opens `Khoj-1.0.0-universal.dmg`. The DMG window shows the Khoj icon, an arrow and an Applications shortcut, on a background image that says "Drag to Applications".
2. First launch: macOS Gatekeeper checks the notarization ticket. If the app is unsigned (personal builds), the user must right-click → Open once.
3. The **Welcome** dialog appears (screen 15) and asks for:
   - Keyboard: **Windows (Ctrl)** / **Mac (⌘)** / **Both** (default Both)
   - Window buttons: **Windows style** (default) / **macOS style**
4. "Allow" triggers a read of `~/Desktop`, `~/Documents` and `~/Downloads`. macOS shows one TCC prompt per folder with our `Info.plist` text.
5. "Open System Settings" opens the Full Disk Access pane. This step is optional. The user must restart Khoj after enabling it.
6. "Get started" opens **This PC** (or Home, depending on the setting "Open Khoj to: This PC / Home").

**Edge cases**
- The user clicks *Don't Allow*: the folder shows an empty state "Khoj doesn't have permission to open this folder" with a **Grant access** button that opens `Privacy_FilesAndFolders`.
- The app was moved out of `/Applications` (App Translocation): show a banner suggesting it be moved to Applications.

---

## Flow 2 — Navigation & tabs
![navigation](../design/flows/02-navigation-and-tabs.svg)

```mermaid
flowchart LR
  subgraph Window
    T["Tab strip"] --> AR["Address row"]
    AR --> CB["Command bar"]
    CB --> BODY["Nav pane | File view | Details pane"]
    BODY --> SB["Status bar"]
  end
  NAVCLICK(["Click nav item / breadcrumb / double-click folder"]) --> GO["go(location)"]
  ADDR(["Type in address bar: E:\\Dev or /Volumes/MyDATA/Dev or ~"]) --> PARSE["parseInput → POSIX path"] --> GO
  GO --> HIST["Push onto tab history<br/>clear selection + search"]
  HIST --> LIST["fs.list(path) via IPC"]
  LIST --> WATCH["Start watcher on folder"]
  LIST --> RENDER["Render view: Details / Content / Tiles / Icons / List"]
  BACK(["Alt+← / Backspace"]) --> HB["history index − 1"] --> LIST
  UP(["Alt+↑"]) --> PARENT["parent folder<br/>volume root → This PC"] --> GO
  NEWTAB(["Ctrl+T / middle-click folder"]) --> NT["New tab at Home"] --> GO
```

**Rules**
- Every tab has its own history stack, selection, view mode and sort.
- Single-click in the nav pane navigates. The chevron only expands or collapses.
- **Up** from a volume root goes to This PC. Up from `~` goes to Macintosh HD › Users.
- The address bar accepts: `C:\Users\you`, `E:\Dev`, `/Volumes/MyDATA/Dev`, `~`, `~/Downloads`, `This PC`, `Home`, `Gallery`, `Network`, `Trash` / `Recycle Bin`, and `smb://server/share` (mounts the share).
- Ctrl/⌘+click or middle-click a folder opens it in a new background tab.
- On relaunch, all tabs and windows are restored (stored in settings).
- The folder watcher refreshes the listing live (debounce 100 ms) and keeps the selection.

---

## Flow 3 — Copy, move, paste, drag & drop
![copy move](../design/flows/03-copy-move-paste.svg)

```mermaid
flowchart TD
  S(["Select items"]) --> C{Cut or Copy?}
  C -- Ctrl+C --> CL1["Clipboard = copy + paths<br/>also written to macOS pasteboard as file URLs"]
  C -- Ctrl+X --> CL2["Clipboard = move<br/>items shown at 50% opacity"]
  CL1 --> P(["Ctrl+V in destination"])
  CL2 --> P
  DD(["Drag & drop"]) --> R{Same volume?}
  R -- Yes --> MV["Move"]
  R -- No --> CP["Copy"]
  R -- Cmd/Shift held --> OVR["Modifier overrides rule"]
  P --> X{Name exists in destination?}
  MV --> X
  CP --> X
  X -- Same folder copy --> AUTO["Auto-name 'name - Copy.ext'"]
  X -- Different folder --> RS["Replace or Skip Files dialog"]
  RS -- Replace --> DO
  RS -- Skip --> NEXT["Next item"]
  RS -- Keep both --> REN["'name (2).ext'"] --> DO
  X -- No conflict --> DO
  AUTO --> DO
  DO{Total > 40 MB or > 50 items?}
  DO -- Yes --> PROG["Progress dialog: % complete, speed chart,<br/>time & items remaining, Pause / Cancel"]
  DO -- No --> FAST["Silent operation"]
  PROG --> DONE(["Done → select new items, push Undo entry"])
  FAST --> DONE
  PROG -- Error EACCES/EPERM --> ERR["Permission dialog: Try again / Skip / Cancel<br/>EPERM = TCC → offer Privacy settings"]
```

**Rules (Windows parity)**
| Action | Result |
|---|---|
| Ctrl+C → Ctrl+V in the **same** folder | Duplicate named `name - Copy.ext`, then `name - Copy (2).ext` |
| Ctrl+C → Ctrl+V into another folder with the same name present | **Replace or Skip Files** dialog (screen 14) |
| Ctrl+X → Ctrl+V | Move. Source items are drawn at 50 % opacity until pasted. Esc cancels the cut. |
| Drag on the **same** volume | Move (cursor badge "→ Move to Dev") |
| Drag to **another** volume | Copy (badge "+ Copy to Dev") |
| Drag with ⌥ Option | Force copy. Drag with ⌘ forces move. |
| Drag to Finder, Mail, Slack… | Native drag via `webContents.startDrag` |
| Drag from Finder into Khoj | Copy or move by the same rules |
| > 40 MB or > 50 items | Progress dialog (screen 13) with Pause / Cancel |
| Paste into a read-only volume | Error dialog "The disk is write-protected" |

**Clipboard interop:** Khoj also writes the copied items to the macOS pasteboard as file URLs, so ⌘V in Finder pastes them. Khoj also reads file URLs that Finder copied.

**Errors during a job:** EACCES/EPERM → dialog with **Try again / Skip / Cancel** (EPERM adds "Open Privacy settings"). ENOSPC → "There is not enough space on MyDATA (E:). You need an additional 1.2 GB." Name too long → **Skip / Rename**.

---

## Flow 4 — Delete, Trash & Undo
![delete](../design/flows/04-delete-trash-undo.svg)

```mermaid
flowchart TD
  A(["Select items"]) --> B{Key}
  B -- Delete / ⌘⌫ --> C["shell.trashItem → macOS Trash<br/>no confirmation, like Windows 11"]
  B -- Shift+Delete --> D["Dialog: Permanently delete?"]
  D -- Yes --> E["fs.rm recursive"]
  D -- No --> X(["Cancel"])
  C --> U["Push Undo entry"]
  U --> Z(["Ctrl+Z → Put back from Trash"])
  C --> T["Trash in nav pane shows full icon"]
  T --> TR["Trash view: Put back / Delete immediately / Empty Trash"]
  B -- on external drive --> V["Volume's .Trashes folder<br/>same behaviour"]
```

- **Delete** / ⌘⌫ moves items to the macOS Trash immediately, with no confirmation (the Windows 11 default). The Trash icon in the nav pane switches to "full".
- **Shift+Delete** permanently deletes after a confirmation dialog (default button = No).
- **Ctrl/⌘+Z** puts back the last deleted batch (we keep the Trash path that `trashItem` produced).
- Trash view: columns Name · Date deleted · Original location · Size. Commands: Restore, Empty Trash.
- An option "Display delete confirmation dialog" (Windows Recycle Bin property) defaults to off.

---

## Flow 5 — Rename
![rename](../design/flows/05-rename.svg)

```mermaid
flowchart TD
  A(["F2 / Rename button / slow double-click"]) --> B["Inline edit box<br/>name selected WITHOUT extension"]
  B --> C{Enter / click away}
  B -- Esc --> X(["Cancel"])
  C --> D{Valid?}
  D -- contains / or : --> E["Tooltip: A file name can't contain / :"]
  D -- name taken --> F["Dialog: already a file with this name<br/>Keep both? → 'name (2)'"]
  D -- extension changed --> G["Dialog: If you change a file name extension,<br/>the file might become unusable. Change it?"]
  D -- ok --> H["fs.rename → push Undo"]
  E --> B
```

- Name selection excludes the extension (screen 20). Tab moves to the next item while still in rename mode (Windows behaviour).
- Multi-select + F2 renames all: `Photo (1).jpg`, `Photo (2).jpg`, … (Windows batch rename).
- A case-only rename on case-insensitive APFS uses a temporary name in between.

---

## Flow 6 — Drives, volumes & drive letters
![drives](../design/flows/06-drives-and-letters.svg)

```mermaid
flowchart TD
  A(["App start / mount event"]) --> B["List volumes: / + /Volumes/*"]
  B --> C["Read volume UUID + size + free + fs type"]
  C --> D{UUID in letter map?}
  D -- Yes --> E["Reuse saved letter"]
  D -- No --> F["Assign next free letter D:…Z:<br/>Macintosh HD is always C:"]
  E --> G["Show tile: icon, 'Name (E:)', usage bar, 'x GB free of y GB'"]
  F --> G
  G --> H{Free < 10%?}
  H -- Yes --> I["Bar turns red"]
  G --> J(["Right-click → Eject → diskutil eject"])
  G --> K(["Properties → Change drive letter…"])
  L(["Drive unplugged"]) --> M["Remove tile + close tabs on that drive<br/>→ navigate to This PC"]
```

- **Macintosh HD is always C:**. Other volumes get the next free letter starting at **D:**, stored by **volume UUID**, so the same USB drive always gets the same letter (like Windows).
- The user can change a letter in drive Properties ("Change drive letter…"). Two volumes can never share a letter.
- Letters are a **display layer** only. Underneath, paths stay `/Volumes/<Name>`. Typing `E:\Dev` in the address bar resolves to the volume that owns E:.
- Hidden system volumes (Preboot, Recovery, VM, Data) are not shown. Disk images (`.dmg`) appear as drives with the disk-image icon and an Eject button.
- Unplug while browsing: affected tabs fall back to This PC and a short info bar appears: "MyDATA (E:) was removed."

---

## Flow 7 — Search
1. Ctrl/⌘+E or F3 focuses search, with "Search MyDATA (E:)" as the placeholder.
2. Typing filters by name immediately. The background job walks sub-folders with a 1,000-results cap and streams results in.
3. Results use the Details view with a **Folder** column (screen 12). Enter on a result opens it. "Open file location" is in the context menu.
4. P1: Spotlight-backed search (`mdfind -onlyin <path> <query>`) with filters (Kind, Date modified, Size), saved in a "Recent searches" dropdown.

## Flow 8 — Open & preview
- Double-click / Enter → `shell.openPath` (default app). Folders navigate. `.app` launches.
- Space → native Quick Look panel (`win.previewFile`). Space again closes it, and arrow keys move the selection while it stays open.
- Open with ▸ → list of apps that can open the type, plus "Choose another app…" (native picker).

## Flow 9 — Settings sync & persistence
- Stored in `~/Library/Application Support/Khoj/settings.json`: theme, window style, keyboard scheme, letters map, pinned folders, per-folder view state (keyed by path), tabs/windows to restore, nav width, details pane on/off.
- Settings changes apply live, with no restart.
