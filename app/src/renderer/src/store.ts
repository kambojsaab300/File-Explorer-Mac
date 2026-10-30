import { create } from 'zustand'
import type { Entry, Places, Volume } from '@shared/types'
import { isSpecial, parentOf, volumeOf } from '@shared/paths'
import { api } from './api/client'
import { typeOf } from './lib/format'

export type View = 'details' | 'content' | 'tiles' | 'large' | 'medium' | 'list'
export type SortKey = 'name' | 'date' | 'type' | 'size'

export interface Tab {
  id: number
  hist: string[]
  i: number
  view: View
  sort: { key: SortKey; dir: 1 | -1 }
  sel: string[]
  anchor: string | null
  items: Entry[]
  status: 'loading' | 'ready' | 'error'
  error?: string
  errorKind?: 'permission' | 'missing' | 'other'
  search: string
  // Recursive search hits for `search`; null while no search is active.
  results: Entry[] | null
}

export interface Prefs {
  theme: 'system' | 'light' | 'dark'
  macButtons: boolean
  hidden: boolean
  extensions: boolean
  lang: 'en' | 'hi'
  previewPane: boolean
}

const DEFAULT_PREFS: Prefs = {
  theme: 'system',
  macButtons: false,
  hidden: false,
  extensions: true,
  lang: 'en',
  previewPane: false
}

interface State {
  tabs: Tab[]
  active: number
  volumes: Volume[]
  places: Places | null
  pinned: string[]
  detailsPane: boolean
  addressEditing: boolean
  prefs: Prefs
  showOptions: boolean
  init(): Promise<void>
  togglePin(path: string): void
  setPref<K extends keyof Prefs>(key: K, value: Prefs[K]): void
  go(loc: string, opts?: { push?: boolean }): void
  back(): void
  forward(): void
  up(): void
  refresh(): void
  newTab(loc?: string): void
  closeTab(index: number): void
  activate(index: number): void
  setView(v: View): void
  setSort(k: SortKey): void
  setSearch(q: string): void
  select(paths: string[], anchor?: string | null): void
  toggleDetails(): void
  togglePreview(): void
  setAddressEditing(v: boolean): void
}

let tabSeq = 1
let searchTimer: ReturnType<typeof setTimeout> | undefined
const makeTab = (loc: string): Tab => ({
  id: tabSeq++, hist: [loc], i: 0, view: 'details', sort: { key: 'name', dir: 1 },
  sel: [], anchor: null, items: [], status: 'loading', search: '', results: null
})

export const locOf = (t: Tab): string => t.hist[t.i]

function friendlyError(e: unknown): Pick<Tab, 'error' | 'errorKind'> {
  const msg = String((e as Error)?.message ?? e)
  if (/EACCES|EPERM/.test(msg)) return { errorKind: 'permission', error: "You don't currently have permission to access this folder." }
  if (/ENOENT/.test(msg)) return { errorKind: 'missing', error: "Khoj can't find this location. It may have been moved or deleted." }
  return { errorKind: 'other', error: 'This location is unavailable.' }
}

export const useStore = create<State>((set, get) => {
  const patchTab = (id: number, patch: Partial<Tab>): void =>
    set((s) => ({ tabs: s.tabs.map((t) => (t.id === id ? { ...t, ...patch } : t)) }))

  const current = (): Tab => get().tabs[get().active]

  async function load(tab: Tab): Promise<void> {
    const loc = locOf(tab)
    if (isSpecial(loc)) return patchTab(tab.id, { items: [], status: 'ready' })
    patchTab(tab.id, { status: 'loading' })
    try {
      const items = await api.fs.list(loc, { hidden: get().prefs.hidden })
      // Ignore results that arrive after the user already navigated elsewhere.
      if (locOf(get().tabs.find((t) => t.id === tab.id) ?? tab) !== loc) return
      // Keep the selection on items that still exist (refreshes after file operations).
      const alive = new Set(items.map((e) => e.path))
      const sel = (get().tabs.find((t) => t.id === tab.id)?.sel ?? []).filter((p) => alive.has(p))
      patchTab(tab.id, { items, sel, status: 'ready', error: undefined, errorKind: undefined })
    } catch (e) {
      patchTab(tab.id, { items: [], status: 'error', ...friendlyError(e) })
    }
  }

  function moveTo(t: Tab, i: number, hist = t.hist): void {
    const next = { ...t, hist, i, sel: [], anchor: null, search: '', results: null }
    patchTab(t.id, next)
    void load(next)
  }

  return {
    tabs: [makeTab('thispc')],
    active: 0,
    volumes: [],
    places: null,
    pinned: [],
    detailsPane: false,
    addressEditing: false,
    prefs: DEFAULT_PREFS,
    showOptions: false,

    async init() {
      const [volumes, places, saved, prefs, pinned] = await Promise.all([
        api.volumes.list(),
        api.fs.places(),
        api.settings.get<string[]>('openTabs'),
        api.settings.get<Partial<Prefs>>('prefs'),
        api.settings.get<string[]>('pinnedFolders')
      ])
      set({ volumes, places, prefs: { ...DEFAULT_PREFS, ...prefs }, pinned: pinned ?? [] })
      api.volumes.onChange((volumes) => set({ volumes }))
      if (saved?.length) set({ tabs: saved.map(makeTab), active: 0 })
      get().tabs.forEach((t) => void load(t))
    },

    togglePin(path: string) {
      const current = get().pinned
      const next = current.includes(path) ? current.filter((p) => p !== path) : [...current, path]
      set({ pinned: next })
      void api.settings.set('pinnedFolders', next)
    },

    setPref(key, value) {
      const prefs = { ...get().prefs, [key]: value }
      set({ prefs })
      void api.settings.set('prefs', prefs)
      if (key === 'macButtons') {
        api.app.setMacButtons(value as boolean)
        // main reads this flag when it opens new windows
        void api.settings.set('macButtons', value)
      }
      if (key === 'hidden') get().tabs.forEach((t) => void load(t))
    },

    go(loc, { push = true } = {}) {
      const t = current()
      if (!push) return moveTo(t, t.i)
      if (loc === locOf(t)) return get().refresh()
      moveTo(t, t.i + 1, [...t.hist.slice(0, t.i + 1), loc])
    },
    back() {
      const t = current()
      if (t.i > 0) moveTo(t, t.i - 1)
    },
    forward() {
      const t = current()
      if (t.i < t.hist.length - 1) moveTo(t, t.i + 1)
    },
    up() {
      const loc = locOf(current())
      if (isSpecial(loc)) return
      const vol = volumeOf(loc, get().volumes)
      // Going up from a drive root lands on This PC, as in Explorer.
      get().go(vol && vol.mount === loc ? 'thispc' : (parentOf(loc) ?? 'thispc'))
    },
    refresh() {
      void load(current())
      void api.volumes.list().then((volumes) => set({ volumes }))
    },

    newTab(loc = 'home') {
      const t = makeTab(loc)
      set((s) => ({ tabs: [...s.tabs, t], active: s.tabs.length }))
      void load(t)
    },
    closeTab(index) {
      const { tabs, active } = get()
      if (tabs.length === 1) return api.window.close()
      const rest = tabs.filter((_, i) => i !== index)
      set({ tabs: rest, active: Math.min(index < active ? active - 1 : active, rest.length - 1) })
    },
    activate: (index) => set({ active: index, addressEditing: false }),

    setView: (view) => patchTab(current().id, { view }),
    setSort(key) {
      const { sort } = current()
      patchTab(current().id, { sort: { key, dir: sort.key === key ? (-sort.dir as 1 | -1) : 1 } })
    },
    setSearch(search) {
      const t = current()
      patchTab(t.id, { search, results: search.trim() ? t.results : null })
      clearTimeout(searchTimer)
      const loc = locOf(t)
      if (!search.trim() || isSpecial(loc)) return
      // Wait for a pause in typing before walking the disk.
      searchTimer = setTimeout(async () => {
        const results = await api.fs.search(loc, search, { hidden: get().prefs.hidden }).catch(() => [])
        const now = get().tabs.find((x) => x.id === t.id)
        if (now && now.search === search && locOf(now) === loc) patchTab(t.id, { results })
      }, 250)
    },
    select: (sel, anchor) => patchTab(current().id, { sel, ...(anchor !== undefined && { anchor }) }),
    toggleDetails: () => set((s) => ({ detailsPane: !s.detailsPane })),
    togglePreview: () =>
      set((s) => ({
        detailsPane: true,
        prefs: { ...s.prefs, previewPane: !s.prefs.previewPane }
      })),
    setAddressEditing: (addressEditing) => set({ addressEditing })
  }
})

export const useTab = (): Tab => useStore((s) => s.tabs[s.active])

// Remember open tabs across launches, and keep the folder on screen live.
let unwatch: (() => void) | null = null
let watched: string | null = null
useStore.subscribe((s, prev) => {
  if (s.tabs === prev.tabs && s.active === prev.active) return
  const locs = s.tabs.map(locOf)
  if (locs.join('\0') !== prev.tabs.map(locOf).join('\0')) void api.settings.set('openTabs', locs)

  const loc = locOf(s.tabs[s.active])
  if (loc === watched) return
  unwatch?.()
  unwatch = null
  watched = loc
  if (!isSpecial(loc)) unwatch = api.fs.watch(loc, () => useStore.getState().refresh())
})

// Everything the user can currently select: search hits while searching, else the folder.
export const visibleEntries = (t: Tab): Entry[] => (t.search.trim() && t.results ? t.results : t.items)

export function sortedItems(t: Tab): Entry[] {
  const q = t.search.trim().toLowerCase()
  // Filter this folder instantly, then show the recursive results once they arrive.
  const items = !q ? t.items : (t.results ?? t.items.filter((e) => e.name.toLowerCase().includes(q)))
  const { key, dir } = t.sort
  const byName = (a: Entry, b: Entry): number => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
  const cmp: Record<SortKey, (a: Entry, b: Entry) => number> = {
    name: byName,
    date: (a, b) => a.mtimeMs - b.mtimeMs,
    type: (a, b) => typeOf(a).localeCompare(typeOf(b)),
    size: (a, b) => a.size - b.size
  }
  return [...items].sort((a, b) => {
    // Folders stay on top when sorting by name or type.
    if (key === 'name' || key === 'type') {
      const f = Number(b.kind === 'dir') - Number(a.kind === 'dir')
      if (f) return f
    }
    return cmp[key](a, b) * dir || byName(a, b)
  })
}
