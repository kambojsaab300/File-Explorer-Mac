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
  search: string
}

interface State {
  tabs: Tab[]
  active: number
  volumes: Volume[]
  places: Places | null
  detailsPane: boolean
  addressEditing: boolean
  init(): Promise<void>
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
  setAddressEditing(v: boolean): void
}

let tabSeq = 1
const makeTab = (loc: string): Tab => ({
  id: tabSeq++, hist: [loc], i: 0, view: 'details', sort: { key: 'name', dir: 1 },
  sel: [], anchor: null, items: [], status: 'loading', search: ''
})

export const locOf = (t: Tab): string => t.hist[t.i]

function friendlyError(e: unknown): string {
  const msg = String((e as Error)?.message ?? e)
  if (/EACCES|EPERM/.test(msg)) return "You don't currently have permission to access this folder."
  if (/ENOENT/.test(msg)) return "Khoj can't find this location. It may have been moved or deleted."
  return 'This location is unavailable.'
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
      const items = await api.fs.list(loc)
      // Ignore results that arrive after the user already navigated elsewhere.
      if (locOf(get().tabs.find((t) => t.id === tab.id) ?? tab) !== loc) return
      patchTab(tab.id, { items, status: 'ready', error: undefined })
    } catch (e) {
      patchTab(tab.id, { items: [], status: 'error', error: friendlyError(e) })
    }
  }

  function moveTo(t: Tab, i: number, hist = t.hist): void {
    const next = { ...t, hist, i, sel: [], anchor: null, search: '' }
    patchTab(t.id, next)
    void load(next)
  }

  return {
    tabs: [makeTab('thispc')],
    active: 0,
    volumes: [],
    places: null,
    detailsPane: false,
    addressEditing: false,

    async init() {
      const [volumes, places, saved] = await Promise.all([
        api.volumes.list(),
        api.fs.places(),
        api.settings.get<string[]>('openTabs')
      ])
      set({ volumes, places })
      api.volumes.onChange((volumes) => set({ volumes }))
      if (saved?.length) set({ tabs: saved.map(makeTab), active: 0 })
      get().tabs.forEach((t) => void load(t))
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
    setSearch: (search) => patchTab(current().id, { search }),
    select: (sel, anchor) => patchTab(current().id, { sel, ...(anchor !== undefined && { anchor }) }),
    toggleDetails: () => set((s) => ({ detailsPane: !s.detailsPane })),
    setAddressEditing: (addressEditing) => set({ addressEditing })
  }
})

export const useTab = (): Tab => useStore((s) => s.tabs[s.active])

// Remember open tabs across launches.
useStore.subscribe((s, prev) => {
  if (s.tabs !== prev.tabs) void api.settings.set('openTabs', s.tabs.map(locOf))
})

export function sortedItems(t: Tab): Entry[] {
  const q = t.search.trim().toLowerCase()
  const items = q ? t.items.filter((e) => e.name.toLowerCase().includes(q)) : t.items
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
