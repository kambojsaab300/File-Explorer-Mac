/* ===== Khoj clickable prototype =====
   Everything here is mock data. In the real app the same UI talks to the
   Electron main process through the IPC API in docs/06-technical-architecture.md. */
(() => {
'use strict';

// ------------------------------------------------------------------ helpers
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ic = (id, s = 16, cls = '') => `<svg class="ic ${cls}" width="${s}" height="${s}"><use href="#${id}"/></svg>`;
const ui = (n, s = 16) => `<svg class="ui" width="${s}" height="${s}"><use href="#u-${n}"/></svg>`;
const KB = 1024, MB = KB * 1024, GB = MB * 1024;
const HOME = '/Users/you';
const ICLOUD = HOME + '/Library/Mobile Documents/com~apple~CloudDocs';
const isMac = true; // prototype always simulates macOS

function shortSize(n) {
  if (n == null) return '';
  const u = ['bytes', 'KB', 'MB', 'GB', 'TB']; let i = 0, v = n;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  if (i === 0) return `${n} bytes`;
  return `${v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2)} ${u[i]}`;
}
const kbSize = n => n == null ? '' : `${Math.max(1, Math.ceil(n / 1024)).toLocaleString('en-US')} KB`;
const pad = n => String(n).padStart(2, '0');
const fmtDate = d => `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
const extOf = n => { const i = n.lastIndexOf('.'); return i > 0 ? n.slice(i + 1).toLowerCase() : ''; };
const baseOf = n => { const i = n.lastIndexOf('.'); return i > 0 ? n.slice(0, i) : n; };
const parentOf = p => p === '/' ? null : (p.slice(0, p.lastIndexOf('/')) || '/');
const join = (p, n) => (p === '/' ? '' : p) + '/' + n;
const nameOf = p => p === '/' ? 'Macintosh HD' : p.slice(p.lastIndexOf('/') + 1);

// ------------------------------------------------------------------ mock file system
const T = s => new Date(s);
const dir = (name, children = [], o = {}) => ({ name, type: 'dir', children, mtime: T(o.m || '2026-10-20T10:00'), ctime: T(o.c || '2026-01-12T09:00'), ...o });
const file = (name, size, m, o = {}) => ({ name, type: 'file', size: Math.round(size), mtime: T(m), ctime: T(o.c || m), ...o });
const imgs = (pfx, n, start) => Array.from({ length: n }, (_, i) => file(`${pfx}${start + i}.jpg`, (1.2 + (i * 0.37) % 3) * MB, `2026-${pad(10 - (i % 4))}-${pad(28 - i)}T1${i % 9}:2${i % 6}`, { art: start + i * 3 }));

const FS = dir('', [
  dir('Applications', ['Calculator', 'Calendar', 'Khoj', 'Notes', 'Preview', 'Terminal', 'Visual Studio Code'].map((a, i) => file(a + '.app', (40 + i * 37) * MB, `2026-09-${pad(10 + i)}T09:1${i}`))),
  dir('Library', [dir('Fonts'), dir('Preferences')], { system: true }),
  dir('System', [dir('Library')], { system: true }),
  dir('Users', [
    dir('Shared'),
    dir('you', [
      dir('Desktop', [file('Screenshot 2026-10-29 at 10.41.22.png', 812 * KB, '2026-10-29T10:41'), file('Notes.txt', 3 * KB, '2026-10-28T18:02'), file('Pick list.xlsx', 46 * KB, '2026-10-27T12:20'), dir('Work in progress', [file('draft-v2.docx', 88 * KB, '2026-10-26T11:00')], { m: '2026-10-26T11:00' })], { m: '2026-10-29T10:41' }),
      dir('Documents', [dir('Invoices', [file('INV-1042.pdf', 210 * KB, '2026-10-01T10:00'), file('INV-1043.pdf', 198 * KB, '2026-10-15T10:00')], { m: '2026-10-15T10:00' }), file('Resume.pdf', 164 * KB, '2026-08-11T21:15'), file('Budget 2026.xlsx', 72 * KB, '2026-10-02T08:40'), file('Meeting notes.docx', 41 * KB, '2026-10-22T16:05'), file('Roadmap.pptx', 3.4 * MB, '2026-09-30T14:00')], { m: '2026-10-22T16:05' }),
      dir('Downloads', [file('Khoj-1.0.0-arm64.dmg', 98 * MB, '2026-10-30T09:12'), file('installer.pkg', 212 * MB, '2026-10-18T19:44'), file('photo.jpg', 2.4 * MB, '2026-10-12T13:10', { art: 7 }), file('archive.zip', 18.2 * MB, '2026-10-05T17:31')], { m: '2026-10-30T09:12' }),
      dir('Pictures', [dir('Wallpapers', imgs('Wallpaper-', 6, 1), { m: '2026-10-11T10:00' }), ...imgs('IMG_20', 12, 41)], { m: '2026-10-28T10:00' }),
      dir('Music', [dir('Playlists'), file('track01.mp3', 7.8 * MB, '2026-06-03T20:00'), file('track02.mp3', 6.1 * MB, '2026-06-03T20:04')], { m: '2026-06-03T20:04' }),
      dir('Movies', [file('Trip.mov', 1.6 * GB, '2026-07-21T18:00'), file('Demo recording.mp4', 240 * MB, '2026-10-19T15:22')], { m: '2026-10-19T15:22' }),
      dir('Library', [dir('Mobile Documents', [dir('com~apple~CloudDocs', [dir('Shared docs', [file('Family budget.xlsx', 52 * KB, '2026-10-10T10:10')]), file('Passport scan.pdf', 1.1 * MB, '2026-03-02T09:00'), file('Ideas.md', 4 * KB, '2026-10-25T22:30')])])], { hidden: true }),
      file('.zshrc', 2 * KB, '2026-05-01T10:00', { hidden: true }),
    ], { m: '2026-10-30T09:12' }),
  ]),
  dir('Volumes', [
    dir('MyDATA', [
      dir('Db', [file('backup_2026_10_08.bak', 1.9 * GB, '2026-10-08T16:45'), file('schema.sql', 38 * KB, '2026-10-08T16:40')], { m: '2026-10-08T16:45' }),
      dir('Deployment', [file('deploy.sh', 4 * KB, '2026-06-04T12:48'), file('release-notes.md', 9 * KB, '2026-06-04T12:40')], { m: '2026-06-04T12:48' }),
      dir('Dev', [dir('khoj', [dir('src', [file('main.ts', 12 * KB, '2026-10-29T11:00'), file('preload.ts', 3 * KB, '2026-10-29T11:00')]), file('package.json', 2 * KB, '2026-10-29T11:00'), file('README.md', 6 * KB, '2026-10-29T11:00')], { m: '2026-10-29T11:00' }), dir('api-server'), dir('scripts')], { m: '2026-06-19T16:36' }),
      dir('Projects', [dir('Inventory app'), dir('Delivery app')], { m: '2026-10-28T14:51' }),
      dir('Personal', [file('Notes 2026.docx', 92 * KB, '2026-10-29T10:41')], { m: '2026-10-29T10:41' }),
      dir('Wallpaper', imgs('Wall-', 5, 10), { m: '2026-06-26T10:06' }),
      file('build_output.txt', 180 * KB, '2026-10-29T13:25'),
      file('Investigation Report.pdf', 4.01 * MB, '2026-05-23T10:46'),
      file('EnviroMaintDB_15-Apr-2026.zip', 312 * MB, '2026-04-15T12:28'),
      file('UI Issues.docx', 1.18 * MB, '2026-10-07T17:44', { author: 'You' }),
      file('.DS_Store', 6 * KB, '2026-10-29T13:25', { hidden: true }),
    ]),
    dir('BACKUP', [dir('Archive 2025', [file('photos-2025.zip', 26.1 * GB, '2025-12-31T23:00')]), dir('Phone backup')]),
  ], { system: true }),
]);

const VOLS = [
  { name: 'Macintosh HD', letter: 'C', mount: '/', total: 374 * GB, free: 110 * GB, icon: 'i-drive-system' },
  { name: 'MyDATA', letter: 'E', mount: '/Volumes/MyDATA', total: 99.9 * GB, free: 59.0 * GB, icon: 'i-drive-external', ejectable: true },
  { name: 'BACKUP', letter: 'F', mount: '/Volumes/BACKUP', total: 29.8 * GB, free: 2.1 * GB, icon: 'i-drive-usb', ejectable: true },
];
const KNOWN = {
  [HOME + '/Desktop']: { label: 'Desktop', icon: 'i-desktop' },
  [HOME + '/Downloads']: { label: 'Downloads', icon: 'i-downloads' },
  [HOME + '/Documents']: { label: 'Documents', icon: 'i-documents' },
  [HOME + '/Pictures']: { label: 'Pictures', icon: 'i-pictures' },
  [HOME + '/Music']: { label: 'Music', icon: 'i-music' },
  [HOME + '/Movies']: { label: 'Videos', icon: 'i-videos' },
  [ICLOUD]: { label: 'iCloud Drive', icon: 'i-icloud' },
  ['/Applications']: { label: 'Applications', icon: 'i-applications' },
};
const SPECIAL = {
  home: { label: 'Home', icon: 'i-home' },
  gallery: { label: 'Gallery', icon: 'i-gallery' },
  thispc: { label: 'This PC', icon: 'i-this-mac' },
  network: { label: 'Network', icon: 'i-network' },
  trash: { label: 'Trash', icon: 'i-trash' },
};
const TRASH = []; // { node, from, deleted }

function getNode(p) {
  if (p === '/') return FS;
  let n = FS;
  for (const part of p.split('/').filter(Boolean)) {
    if (!n || n.type !== 'dir') return null;
    n = n.children.find(c => c.name === part);
  }
  return n || null;
}
const volOf = p => VOLS.filter(v => v.mount !== '/').find(v => p === v.mount || p.startsWith(v.mount + '/')) || VOLS[0];
const isSpecial = l => !!SPECIAL[l];

function typeOf(n) {
  if (n.type === 'dir') return 'File folder';
  const e = extOf(n.name);
  const T = { txt: 'Text Document', md: 'Markdown File', pdf: 'PDF Document', docx: 'DOCX Document', xlsx: 'XLSX Worksheet', pptx: 'PPTX Presentation', zip: 'Compressed (zipped) Folder', png: 'PNG File', jpg: 'JPG File', mp3: 'MP3 File', mp4: 'MP4 File', mov: 'MOV File', app: 'Application', dmg: 'Disk Image', pkg: 'Installer Package', sh: 'Shell Script', sql: 'SQL File', json: 'JSON File', ts: 'TypeScript File', bak: 'BAK File' };
  return T[e] || (e ? e.toUpperCase() + ' File' : 'File');
}
function iconOf(n, p) {
  if (p && KNOWN[p]) return KNOWN[p].icon;
  if (n.type === 'dir') { if (n.system) return 'i-folder-system'; if (S.pinned.includes(p)) return 'i-folder'; return n.children && n.children.length ? 'i-folder' : 'i-folder-empty'; }
  const e = extOf(n.name);
  const M = { txt: 'file-text', md: 'file-text', pdf: 'file-pdf', docx: 'file-doc', xlsx: 'file-sheet', pptx: 'file-slides', zip: 'file-archive', png: 'file-image', jpg: 'file-image', mp3: 'file-audio', mp4: 'file-video', mov: 'file-video', app: 'file-app', dmg: 'disk-image', pkg: 'file-archive', sh: 'file-code', sql: 'file-code', json: 'file-code', ts: 'file-code', bak: 'file-generic' };
  return 'i-' + (M[e] || 'file-generic');
}
const isImage = n => n.type === 'file' && /^(jpg|png)$/.test(extOf(n.name));
function artCss(seed) {
  const h1 = (seed * 47) % 360, h2 = (h1 + 60 + seed * 13) % 360;
  return `background:radial-gradient(circle at 70% 28%, hsl(${(h1 + 40) % 360} 90% 78%) 0 10%, transparent 11%),
    linear-gradient(160deg, transparent 52%, hsl(${h2} 45% 32%) 52.5% 70%, transparent 70.5%),
    linear-gradient(200deg, transparent 58%, hsl(${h2} 50% 24%) 58.5%),
    linear-gradient(180deg, hsl(${h1} 70% 62%), hsl(${h2} 65% 48%));`;
}

// ------------------------------------------------------------------ state
const S = {
  theme: 'dark', winStyle: 'windows', letters: true, keys: 'both', hidden: false, exts: true, compact: false, textScale: 1, newTabFolders: false,
  pinned: [HOME + '/Desktop', HOME + '/Downloads', HOME + '/Documents', HOME + '/Pictures', HOME + '/Music', HOME + '/Movies', '/Volumes/MyDATA/Dev'],
  expanded: new Set(['thispc']),
  details: false, max: false,
  tabs: [], active: 0,
  clip: null, undo: [], search: '', addrEdit: false, homeTab: 'recent',
  renaming: null, navW: 300, frame: true,
};
let tabSeq = 1;
function newTab(loc = 'thispc') { return { id: tabSeq++, hist: [loc], i: 0, sel: new Set(), anchor: null, focus: null, view: 'details', sort: { key: 'name', dir: 1 } }; }
const tab = () => S.tabs[S.active];
const loc = () => tab().hist[tab().i];

// ------------------------------------------------------------------ path display / parsing
function displayPath(p) {
  if (isSpecial(p)) return SPECIAL[p].label;
  if (!S.letters) return p;
  const v = volOf(p);
  const rest = v.mount === '/' ? p : p.slice(v.mount.length);
  return `${v.letter}:\\` + rest.split('/').filter(Boolean).join('\\');
}
function parseInput(s) {
  s = s.trim();
  const low = s.toLowerCase();
  for (const [k, v] of Object.entries(SPECIAL)) if (low === v.label.toLowerCase() || low === k) return k;
  if (low === 'recycle bin') return 'trash';
  if (low === 'this mac') return 'thispc';
  if (s.startsWith('~')) s = HOME + s.slice(1);
  const m = s.match(/^([a-zA-Z]):[\\/]?(.*)$/);
  if (m) {
    const v = VOLS.find(v => v.letter === m[1].toUpperCase());
    if (!v) return null;
    const rest = m[2].split(/[\\/]/).filter(Boolean).join('/');
    s = v.mount === '/' ? '/' + rest : v.mount + (rest ? '/' + rest : '');
  }
  s = s.replace(/\\/g, '/');
  if (s.length > 1) s = s.replace(/\/+$/, '');
  const n = getNode(s);
  return n && n.type === 'dir' ? s : null;
}
function locLabel(l) {
  if (isSpecial(l)) return SPECIAL[l].label;
  if (KNOWN[l]) return KNOWN[l].label;
  const v = VOLS.find(v => v.mount === l);
  if (v) return S.letters ? `${v.name} (${v.letter}:)` : v.name;
  return nameOf(l);
}
function locIcon(l) {
  if (isSpecial(l)) return SPECIAL[l].icon;
  const v = VOLS.find(v => v.mount === l);
  if (v) return v.icon;
  return iconOf(getNode(l) || { type: 'dir', children: [1] }, l);
}
function crumbsFor(l) {
  if (isSpecial(l)) return { root: SPECIAL[l].icon, segs: [{ label: SPECIAL[l].label, loc: l }] };
  if (l.startsWith(ICLOUD)) {
    const segs = [{ label: 'iCloud Drive', loc: ICLOUD }];
    let acc = ICLOUD; for (const part of l.slice(ICLOUD.length).split('/').filter(Boolean)) { acc += '/' + part; segs.push({ label: part, loc: acc }); }
    return { root: 'i-icloud', segs };
  }
  if (l === HOME || l.startsWith(HOME + '/')) {
    const segs = [{ label: 'you', loc: HOME }];
    let acc = HOME; for (const part of l.slice(HOME.length).split('/').filter(Boolean)) { acc += '/' + part; segs.push({ label: KNOWN[acc] ? KNOWN[acc].label : part, loc: acc }); }
    return { root: 'i-home', segs };
  }
  const v = volOf(l);
  const segs = [{ label: 'This PC', loc: 'thispc' }, { label: locLabel(v.mount), loc: v.mount }];
  let acc = v.mount; const rest = v.mount === '/' ? l : l.slice(v.mount.length);
  for (const part of rest.split('/').filter(Boolean)) { acc = join(acc, part); segs.push({ label: part, loc: acc }); }
  return { root: 'i-this-mac', segs };
}

// ------------------------------------------------------------------ listing
function listItems(l) {
  if (l === 'trash') return TRASH.map(t => ({ node: t.node, path: '\u0000trash/' + t.node.name, from: t.from, deleted: t.deleted }));
  const n = getNode(l); if (!n || n.type !== 'dir') return [];
  let items = n.children.map(c => ({ node: c, path: join(l, c.name) }));
  if (!S.hidden) items = items.filter(it => !it.node.hidden && !it.node.name.startsWith('.'));
  if (S.search) items = searchAll(l);
  return sortItems(items);
}
function searchAll(l) {
  const q = S.search.toLowerCase(), out = [];
  (function walk(p, n, depth) {
    if (depth > 8) return;
    for (const c of n.children || []) {
      if (!S.hidden && (c.hidden || c.name.startsWith('.'))) continue;
      const cp = join(p, c.name);
      if (c.name.toLowerCase().includes(q)) out.push({ node: c, path: cp, inFolder: p });
      if (c.type === 'dir') walk(cp, c, depth + 1);
    }
  })(l, getNode(l), 0);
  return out;
}
function sortItems(items) {
  const { key, dir: d } = tab().sort;
  const cmp = {
    name: (a, b) => a.node.name.localeCompare(b.node.name, undefined, { numeric: true, sensitivity: 'base' }),
    date: (a, b) => a.node.mtime - b.node.mtime,
    type: (a, b) => typeOf(a.node).localeCompare(typeOf(b.node)),
    size: (a, b) => (a.node.size || 0) - (b.node.size || 0),
  }[key];
  return items.slice().sort((a, b) => {
    if (key === 'name' || key === 'type') { const f = (b.node.type === 'dir') - (a.node.type === 'dir'); if (f) return f; }
    return cmp(a, b) * d || a.node.name.localeCompare(b.node.name);
  });
}
const shown = n => (S.exts || n.type === 'dir') ? n.name : baseOf(n.name);
let CURRENT = []; // items currently rendered (for keyboard nav)

// ------------------------------------------------------------------ navigation
function go(l, { push = true } = {}) {
  if (!l) return;
  const t = tab();
  if (push) { t.hist = t.hist.slice(0, t.i + 1); t.hist.push(l); t.i = t.hist.length - 1; }
  t.sel = new Set(); t.anchor = null; t.focus = null; S.search = ''; S.addrEdit = false; S.renaming = null;
  if (!isSpecial(l)) { let p = parentOf(l); while (p && p !== '/') { S.expanded.add(p); p = parentOf(p); } }
  render();
}
const back = () => { const t = tab(); if (t.i > 0) { t.i--; go(t.hist[t.i], { push: false }); } };
const fwd = () => { const t = tab(); if (t.i < t.hist.length - 1) { t.i++; go(t.hist[t.i], { push: false }); } };
function up() {
  const l = loc();
  if (isSpecial(l)) return;
  const v = VOLS.find(v => v.mount === l);
  if (v || l === HOME && false) return go('thispc');
  const p = parentOf(l);
  if (l === ICLOUD) return go('home');
  go(p === '/Volumes' ? 'thispc' : p);
}
function open(it, newTabToo = false) {
  const n = it.node;
  if (n.type === 'dir') {
    if (newTabToo || S.newTabFolders) { S.tabs.push(newTab(it.path)); S.active = S.tabs.length - 1; render(); return; }
    return go(it.path);
  }
  note(`<b>Open</b> “${esc(n.name)}” → real app calls <code>shell.openPath()</code>, which opens the file in its default macOS app.`);
}

// ------------------------------------------------------------------ selection
function selectedItems() { const t = tab(); return CURRENT.filter(it => t.sel.has(it.path)); }
function clickItem(path, e) {
  const t = tab(), idx = CURRENT.findIndex(i => i.path === path);
  const mod = e.metaKey || e.ctrlKey;
  if (e.shiftKey && t.anchor) {
    const a = CURRENT.findIndex(i => i.path === t.anchor);
    const [lo, hi] = [Math.min(a, idx), Math.max(a, idx)];
    if (!mod) t.sel = new Set();
    for (let k = lo; k <= hi; k++) t.sel.add(CURRENT[k].path);
  } else if (mod) {
    t.sel.has(path) ? t.sel.delete(path) : t.sel.add(path); t.anchor = path;
  } else { t.sel = new Set([path]); t.anchor = path; }
  t.focus = path;
  if (S.renaming) { S.renaming = null; renderMain(); } else paintSelection();
  renderCommand(); renderStatus(); renderDetails();
}
// update selection classes in place (keeps DOM nodes alive so double-click works)
function paintSelection() {
  const t = tab();
  document.querySelectorAll('#main [data-path]').forEach(el => {
    const p = el.dataset.path;
    el.classList.toggle('sel', t.sel.has(p));
    el.classList.toggle('focus', t.focus === p && t.sel.size > 1);
  });
}
function moveFocus(delta, e) {
  if (!CURRENT.length) return;
  const t = tab();
  let idx = CURRENT.findIndex(i => i.path === t.focus);
  idx = idx < 0 ? 0 : Math.max(0, Math.min(CURRENT.length - 1, idx + delta));
  clickItem(CURRENT[idx].path, { shiftKey: e.shiftKey, metaKey: false, ctrlKey: false });
  const el = document.querySelector(`[data-path="${CSS.escape(CURRENT[idx].path)}"]`);
  el && el.scrollIntoView({ block: 'nearest' });
}

// ------------------------------------------------------------------ file operations (mock)
function uniqueName(parent, name, style = 'copy') {
  const has = x => parent.children.some(c => c.name === x);
  if (!has(name)) return name;
  const b = baseOf(name), e = extOf(name) ? '.' + extOf(name) : '';
  if (style === 'copy') { let x = `${b} - Copy${e}`, k = 2; while (has(x)) x = `${b} - Copy (${k++})${e}`; return x; }
  let k = 2, x; do { x = `${b} (${k++})${e}`; } while (has(x)); return x;
}
const clone = n => JSON.parse(JSON.stringify(n), (k, v) => (k === 'mtime' || k === 'ctime') ? new Date(v) : v);
function newFolder() {
  const l = loc(); const n = getNode(l); if (!n || isSpecial(l)) return;
  const name = uniqueName(n, 'New folder', 'num');
  n.children.push(dir(name, [], { m: new Date().toISOString() }));
  const p = join(l, name);
  S.undo.push({ t: 'new', p });
  tab().sel = new Set([p]); tab().focus = p; tab().anchor = p; S.renaming = p; render();
}
function newFile(ext = 'txt', label = 'New Text Document') {
  const l = loc(); const n = getNode(l); if (!n || isSpecial(l)) return;
  const name = uniqueName(n, `${label}.${ext}`, 'num');
  n.children.push(file(name, 0, new Date().toISOString()));
  const p = join(l, name); S.undo.push({ t: 'new', p });
  tab().sel = new Set([p]); tab().focus = p; S.renaming = p; render();
}
function del(permanent = false) {
  const items = selectedItems(); if (!items.length || loc() === 'trash') return;
  const go2 = () => {
    const rec = [];
    for (const it of items) {
      const par = getNode(parentOf(it.path)); par.children = par.children.filter(c => c !== it.node);
      if (!permanent) TRASH.push({ node: it.node, from: parentOf(it.path), deleted: new Date() });
      rec.push({ node: it.node, from: parentOf(it.path) });
    }
    if (!permanent) S.undo.push({ t: 'del', rec });
    tab().sel = new Set(); render();
  };
  if (permanent) {
    const what = items.length === 1 ? `“${esc(items[0].node.name)}”` : `these ${items.length} items`;
    dialog(`<div class="bd"><h2>Delete permanently?</h2><div>Are you sure you want to permanently delete ${what}? You can’t undo this action.</div></div>
      <div class="ft"><button class="btn primary" data-act="ok">Yes</button><button class="btn" data-act="close">No</button></div>`, { ok: () => { closeDialog(); go2(); } });
  } else go2();
}
function undo() {
  const u = S.undo.pop(); if (!u) return;
  if (u.t === 'del') for (const r of u.rec) { getNode(r.from).children.push(r.node); const k = TRASH.findIndex(t => t.node === r.node); if (k >= 0) TRASH.splice(k, 1); }
  if (u.t === 'new') { const par = getNode(parentOf(u.p)); par.children = par.children.filter(c => c.name !== nameOf(u.p)); }
  if (u.t === 'ren') { const n = getNode(join(u.dir, u.to)); if (n) n.name = u.from; }
  if (u.t === 'paste') for (const p of u.created) { const par = getNode(parentOf(p)); if (par) par.children = par.children.filter(c => c.name !== nameOf(p)); }
  if (u.t === 'move') for (const m of u.moved) { const par = getNode(m.to); par.children = par.children.filter(c => c !== m.node); getNode(m.from).children.push(m.node); }
  render();
}
function commitRename(path, val) {
  S.renaming = null;
  const n = getNode(path); if (!n) return render();
  val = val.trim();
  if (!S.exts && n.type === 'file' && extOf(n.name)) val += '.' + extOf(n.name);
  if (!val || val === n.name) return render();
  if (/[/:]/.test(val)) { render(); return note('A file name can’t contain any of the following characters: <b>/ :</b>'); }
  const par = getNode(parentOf(path));
  if (par.children.some(c => c !== n && c.name.toLowerCase() === val.toLowerCase())) { render(); return note(`There is already a file with the same name in this location.`); }
  S.undo.push({ t: 'ren', dir: parentOf(path), from: n.name, to: val });
  n.name = val; const np = join(parentOf(path), val);
  tab().sel = new Set([np]); tab().focus = np; render();
}
function copy(cut = false) { const it = selectedItems(); if (!it.length) return; S.clip = { cut, items: it.map(i => ({ path: i.path, node: i.node })) }; render(); }
function paste() {
  const l = loc(); const dst = getNode(l); if (!S.clip || !dst || isSpecial(l)) return;
  const items = S.clip.items.filter(i => getNode(i.path) || S.clip.cut === false);
  const conflict = items.find(i => parentOf(i.path) !== l && dst.children.some(c => c.name === i.node.name));
  const doIt = (mode) => {
    const created = [], moved = [];
    for (const i of items) {
      const exists = dst.children.find(c => c.name === i.node.name);
      if (S.clip.cut) {
        if (parentOf(i.path) === l) continue;
        if (exists && mode === 'skip') continue;
        if (exists && mode === 'replace') dst.children = dst.children.filter(c => c !== exists);
        const src = getNode(parentOf(i.path)); src.children = src.children.filter(c => c !== i.node);
        if (exists && mode === 'both') i.node.name = uniqueName(dst, i.node.name, 'num');
        dst.children.push(i.node); moved.push({ node: i.node, from: parentOf(i.path), to: l });
      } else {
        const c = clone(i.node);
        if (parentOf(i.path) === l) c.name = uniqueName(dst, c.name, 'copy');
        else if (exists) { if (mode === 'skip') continue; if (mode === 'replace') dst.children = dst.children.filter(x => x !== exists); else c.name = uniqueName(dst, c.name, 'num'); }
        c.mtime = new Date(); dst.children.push(c); created.push(join(l, c.name));
      }
    }
    if (S.clip.cut) { S.undo.push({ t: 'move', moved }); S.clip = null; } else S.undo.push({ t: 'paste', created });
    tab().sel = new Set(created.length ? created : moved.map(m => join(l, m.node.name))); render();
  };
  const total = items.reduce((s, i) => s + sizeOf(i.node), 0);
  const run = (mode) => total > 40 * MB ? progressDialog(items, l, () => doIt(mode)) : doIt(mode);
  if (conflict) conflictDialog(conflict, items.length, l, run); else run('both');
}
function sizeOf(n) { return n.type === 'file' ? n.size : (n.children || []).reduce((s, c) => s + sizeOf(c), 0); }
function togglePin(path) { const k = S.pinned.indexOf(path); k >= 0 ? S.pinned.splice(k, 1) : S.pinned.push(path); render(); }
function restore(items) { for (const it of items) { const k = TRASH.findIndex(t => t.node === it.node); if (k >= 0) { getNode(TRASH[k].from).children.push(it.node); TRASH.splice(k, 1); } } render(); }
function emptyTrash() { if (!TRASH.length) return; dialog(`<div class="bd"><h2>Empty Trash?</h2><div>Are you sure you want to permanently delete these ${TRASH.length} items?</div></div><div class="ft"><button class="btn primary" data-act="ok">Yes</button><button class="btn" data-act="close">No</button></div>`, { ok: () => { TRASH.length = 0; closeDialog(); render(); } }); }

// ------------------------------------------------------------------ RENDER: window chrome
function render() {
  document.documentElement.dataset.theme = S.theme;
  document.documentElement.style.setProperty('--text-scale', S.textScale);
  document.documentElement.style.setProperty('--nav-w', S.navW + 'px');
  document.body.classList.toggle('macbuttons', S.winStyle === 'mac');
  document.body.classList.toggle('compact', S.compact);
  document.body.classList.toggle('noframe', !S.frame);
  $('#win').classList.toggle('max', S.max);
  renderTabs(); renderAddress(); renderCommand(); renderNav(); renderMain(); renderDetails(); renderStatus();
}
function renderTabs() {
  $('#tabs').innerHTML = S.tabs.map((t, i) => {
    const l = t.hist[t.i];
    return `<div class="tab ${i === S.active ? 'active' : ''}" data-tab="${i}">${ic(locIcon(l), 16)}<span class="t">${esc(locLabel(l))}</span>
      <button class="x" data-closetab="${i}" title="Close tab (Ctrl+W)">${ui('close', 12)}</button></div>`;
  }).join('');
}
function renderAddress() {
  const l = loc(), t = tab();
  $('#bk').disabled = t.i === 0; $('#fw').disabled = t.i >= t.hist.length - 1; $('#upb').disabled = isSpecial(l);
  const a = $('#addr');
  if (S.addrEdit) {
    a.classList.add('editing');
    a.innerHTML = `<input id="addrIn" spellcheck="false" value="${esc(displayPath(l))}">`;
    const inp = $('#addrIn'); inp.focus(); inp.select();
  } else {
    a.classList.remove('editing');
    const { root, segs } = crumbsFor(l);
    a.innerHTML = `<div class="crumbs"><span class="crumb root" data-addr-edit>${ic(root, 16)}</span>` +
      segs.map((s, i) => `<button class="crumbchev" data-crumbmenu="${esc(s.loc)}">${ui('chevron-right', 12)}</button><button class="crumb" data-go="${esc(s.loc)}">${esc(s.label)}</button>`).join('') +
      `<button class="crumbchev" data-crumbmenu="${esc(l)}">${ui('chevron-right', 12)}</button></div><div class="addr-fill" data-addr-edit></div>`;
  }
  const si = $('#searchIn');
  si.placeholder = `Search ${locLabel(l)}`;
  if (document.activeElement !== si) si.value = S.search;
}
function renderCommand() {
  const l = loc(), has = selectedItems().length > 0, fsLoc = !isSpecial(l), trash = l === 'trash';
  const dis = c => c ? '' : 'disabled';
  $('#cmdbar').innerHTML = `
    <button class="cmd" data-menu="new" ${dis(fsLoc)}>${ui('new', 20)}<span class="lbl">New</span>${ui('chevron-down', 12).replace('class="ui"', 'class="ui dd"')}</button>
    <div class="sep-v"></div>
    <button class="cmd" data-cmd="cut" title="Cut (Ctrl+X)" ${dis(has && !trash)}>${ui('cut', 20)}</button>
    <button class="cmd" data-cmd="copy" title="Copy (Ctrl+C)" ${dis(has && !trash)}>${ui('copy', 20)}</button>
    <button class="cmd" data-cmd="paste" title="Paste (Ctrl+V)" ${dis(S.clip && fsLoc)}>${ui('paste', 20)}</button>
    <button class="cmd" data-cmd="rename" title="Rename (F2)" ${dis(selectedItems().length === 1 && !trash)}>${ui('rename', 20)}</button>
    <button class="cmd" data-cmd="share" title="Share" ${dis(has && !trash)}>${ui('share', 20)}</button>
    <button class="cmd" data-cmd="delete" title="Delete (Delete)" ${dis(has && !trash)}>${ui('delete', 20)}</button>
    <div class="sep-v"></div>
    <button class="cmd" data-menu="sort">${ui('sort', 20)}<span class="lbl">Sort</span>${ui('chevron-down', 12)}</button>
    <button class="cmd" data-menu="view">${ui('view', 20)}<span class="lbl">View</span>${ui('chevron-down', 12)}</button>
    ${trash ? `<div class="sep-v"></div><button class="cmd" data-cmd="restore" ${dis(has)}>${ui('undo', 20)}<span class="lbl">Restore</span></button><button class="cmd" data-cmd="empty" ${dis(TRASH.length)}>${ui('delete', 20)}<span class="lbl">Empty Trash</span></button>` : ''}
    <div class="sep-v"></div>
    <button class="cmd" data-menu="more" title="See more">${ui('more', 20)}</button>
    <div class="cmd-spacer"></div>
    <button class="cmd ${S.details ? 'on' : ''}" data-cmd="details" title="Details pane (Alt+Shift+P)">${ui('details-pane', 20)}<span class="lbl">Details</span></button>`;
}

// ------------------------------------------------------------------ RENDER: navigation pane
function renderNav() {
  const l = loc(); const rows = [];
  const row = (o) => {
    const depth = o.depth || 0;
    const chev = o.expandable ? `<span class="chev" data-toggle="${esc(o.key)}">${ui(S.expanded.has(o.key) ? 'chevron-down' : 'chevron-right', 12)}</span>` : `<span class="chev none"></span>`;
    rows.push(`<div class="nav-item ${o.loc === l ? 'sel' : ''}" data-go="${esc(o.loc)}" data-navpath="${esc(o.loc)}" style="padding-left:${depth * 8}px">${chev}${ic(o.icon, 16)}<span class="name">${esc(o.label)}</span>${o.pin ? `<span class="pin">${ui('pin', 14)}</span>` : ''}</div>`);
  };
  const subdirs = (p, depth) => {
    if (!S.expanded.has(p)) return;
    const n = getNode(p); if (!n) return;
    n.children.filter(c => c.type === 'dir' && (S.hidden || (!c.hidden && !c.name.startsWith('.')))).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
      .forEach(c => { const cp = join(p, c.name); row({ key: cp, loc: cp, label: c.name, icon: iconOf(c, cp), depth, expandable: c.children.some(x => x.type === 'dir') }); subdirs(cp, depth + 1); });
  };
  row({ key: 'home', loc: 'home', label: 'Home', icon: 'i-home' });
  row({ key: 'gallery', loc: 'gallery', label: 'Gallery', icon: 'i-gallery' });
  row({ key: ICLOUD, loc: ICLOUD, label: 'iCloud Drive', icon: 'i-icloud', expandable: true }); subdirs(ICLOUD, 1);
  rows.push('<div class="nav-sep"></div>');
  for (const p of S.pinned) { const n = getNode(p); if (!n) continue; row({ key: 'pin:' + p, loc: p, label: locLabel(p), icon: locIcon(p), pin: true }); }
  rows.push('<div class="nav-sep"></div>');
  row({ key: 'thispc', loc: 'thispc', label: 'This PC', icon: 'i-this-mac', expandable: true });
  if (S.expanded.has('thispc')) for (const v of VOLS) { row({ key: v.mount, loc: v.mount, label: locLabel(v.mount), icon: v.icon, depth: 1, expandable: true }); subdirs(v.mount, 2); }
  row({ key: 'network', loc: 'network', label: 'Network', icon: 'i-network', expandable: true });
  row({ key: 'trash', loc: 'trash', label: 'Trash', icon: TRASH.length ? 'i-trash-full' : 'i-trash' });
  $('#nav').innerHTML = rows.join('');
}

// ------------------------------------------------------------------ RENDER: main area
function itemAttrs(it) {
  const t = tab();
  const cls = ['it', t.sel.has(it.path) ? 'sel' : '', t.focus === it.path && t.sel.size > 1 ? 'focus' : '', S.clip && S.clip.cut && S.clip.items.some(c => c.path === it.path) ? 'cut' : ''].join(' ');
  return `class="${cls}" data-path="${esc(it.path)}" draggable="true"`;
}
function nameCell(it) {
  if (S.renaming === it.path) return `<input class="rn" id="rn" spellcheck="false" value="${esc(shown(it.node))}">`;
  return `<span class="nm">${esc(shown(it.node))}</span>`;
}
function thumbOr(it, size) {
  if (isImage(it.node) && size >= 48) return `<div class="thumb" style="width:${size}px;height:${Math.round(size * .75)}px;${artCss(it.node.art || 1)}"></div>`;
  return ic(iconOf(it.node, it.path), size);
}
function renderMain() {
  const l = loc(), t = tab(), main = $('#main');
  main.className = 'main ' + (isSpecial(l) && l !== 'trash' ? 'v-page' : 'v-' + t.view);
  let html = '';
  if (l === 'thispc') html = viewThisPC();
  else if (l === 'home') html = viewHome();
  else if (l === 'gallery') html = viewGallery();
  else if (l === 'network') html = viewNetwork();
  else {
    CURRENT = listItems(l);
    if (S.search && !CURRENT.length) html = `<div class="empty">No items match your search.</div>`;
    else if (!CURRENT.length) html = `<div class="empty">${l === 'trash' ? 'Trash is empty.' : 'This folder is empty.'}</div>`;
    else html = viewItems(CURRENT, l);
  }
  main.innerHTML = `<div class="scroll" id="scroll">${html}</div>`;
  const rn = $('#rn');
  if (rn) { rn.focus(); const v = rn.value, d = v.lastIndexOf('.'); rn.setSelectionRange(0, getNode(S.renaming)?.type === 'file' && d > 0 ? d : v.length); }
}
function viewItems(items, l) {
  const v = tab().view, trash = l === 'trash';
  if (v === 'details') {
    const s = tab().sort, arrow = k => s.key === k ? `<span class="arrow">${ui(s.dir > 0 ? 'chevron-up' : 'chevron-down', 10)}</span>` : '';
    const c3 = trash ? 'Original location' : S.search ? 'Folder' : 'Type';
    return `<div class="hdr"><div data-sort="name">Name${arrow('name')}</div><div data-sort="date">${trash ? 'Date deleted' : 'Date modified'}${arrow('date')}</div><div data-sort="type">${c3}${arrow('type')}</div><div data-sort="size">Size${arrow('size')}</div></div>
    <div class="items">${items.map(it => `<div ${itemAttrs(it)}><div>${ic(iconOf(it.node, it.path), 16)}${nameCell(it)}</div><div>${fmtDate(trash ? it.deleted : it.node.mtime)}</div><div>${esc(trash ? displayPath(it.from) : S.search ? displayPath(it.inFolder) : typeOf(it.node))}</div><div>${it.node.type === 'file' ? kbSize(it.node.size) : ''}</div></div>`).join('')}</div>`;
  }
  if (v === 'content') return `<div class="items">${items.map(it => {
    const n = it.node, f = n.type === 'file';
    return `<div ${itemAttrs(it)}><div class="a">${thumbOr(it, 32)}<div class="tx">${nameCell(it)}${f ? `<div class="sub">${n.author ? `Authors: <b>${esc(n.author)}</b>` : `Type: <b>${esc(typeOf(n))}</b>`}</div>` : ''}</div></div>
      <div class="b"><span>Date modified: <b>${fmtDate(n.mtime)}</b></span>${f ? `<span>Size: <b>${shortSize(n.size)}</b></span>` : ''}</div></div>`;
  }).join('')}</div>`;
  if (v === 'tiles') return `<div class="items">${items.map(it => `<div ${itemAttrs(it)}>${thumbOr(it, 48)}<div class="tx">${nameCell(it)}<span class="sub">${esc(typeOf(it.node))}</span>${it.node.type === 'file' ? `<span class="sub">${shortSize(it.node.size)}</span>` : ''}</div></div>`).join('')}</div>`;
  if (v === 'large') return `<div class="items">${items.map(it => `<div ${itemAttrs(it)}>${thumbOr(it, 96)}${nameCell(it)}</div>`).join('')}</div>`;
  if (v === 'medium') return `<div class="items">${items.map(it => `<div ${itemAttrs(it)}>${thumbOr(it, 48)}${nameCell(it)}</div>`).join('')}</div>`;
  return `<div class="items">${items.map(it => `<div ${itemAttrs(it)}>${ic(iconOf(it.node, it.path), 16)}${nameCell(it)}</div>`).join('')}</div>`;
}
function viewThisPC() {
  CURRENT = VOLS.map(v => ({ node: { name: v.name, type: 'dir', mtime: new Date(), children: getNode(v.mount).children, vol: v }, path: v.mount }));
  const t = tab();
  return `<div class="ghead">${ui('chevron-down', 12)}<span>Devices and drives</span></div>
  <div class="drives">${VOLS.map(v => {
    const used = (v.total - v.free) / v.total, low = v.free / v.total < .1;
    return `<div class="drive it ${t.sel.has(v.mount) ? 'sel' : ''}" data-path="${esc(v.mount)}">${ic(v.icon, 48)}<div class="meta"><span class="n">${esc(locLabel(v.mount))}</span>
      <div class="dbar ${low ? 'low' : ''}"><i style="width:${(used * 100).toFixed(1)}%"></i></div><span class="free">${shortSize(v.free)} free of ${shortSize(v.total)}</span></div></div>`;
  }).join('')}</div>`;
}
function recentFiles() {
  const out = [];
  (function walk(p, n) { for (const c of n.children || []) { if (c.hidden || c.name.startsWith('.') || c.system) continue; const cp = join(p, c.name); if (c.type === 'file' && !/\.app$/.test(c.name)) out.push({ node: c, path: cp, inFolder: p }); else if (c.type === 'dir') walk(cp, c); } })('', FS);
  return out.sort((a, b) => b.node.mtime - a.node.mtime).slice(0, 12);
}
function viewHome() {
  const qa = S.pinned.filter(p => getNode(p)).map(p => ({ node: getNode(p), path: p }));
  const rec = recentFiles(); CURRENT = [...qa, ...rec];
  const t = tab();
  return `<div class="ghead">${ui('chevron-down', 12)}<span>Quick access</span></div>
  <div class="qa">${qa.map(it => `<div ${itemAttrs(it)}>${ic(locIcon(it.path), 48)}<div><div class="nm">${esc(locLabel(it.path))}</div><div class="sub">${it.path.startsWith('/Volumes') ? esc(locLabel(volOf(it.path).mount)) : 'Stored locally'}</div></div></div>`).join('')}</div>
  <div class="pills"><button class="pill ${S.homeTab === 'recent' ? 'on' : ''}" data-hometab="recent">Recent</button><button class="pill ${S.homeTab === 'fav' ? 'on' : ''}" data-hometab="fav">Favorites</button><button class="pill" data-hometab="shared">Shared</button></div>
  <div class="v-details"><div class="hdr"><div>Name</div><div>Date modified</div><div>File location</div><div>Size</div></div>
  <div class="items">${(S.homeTab === 'recent' ? rec : []).map(it => `<div ${itemAttrs(it)}><div>${ic(iconOf(it.node, it.path), 16)}<span class="nm">${esc(it.node.name)}</span></div><div>${fmtDate(it.node.mtime)}</div><div>${esc(displayPath(it.inFolder))}</div><div>${kbSize(it.node.size)}</div></div>`).join('') || `<div class="empty">After you’ve favourited some files, we’ll show them here.</div>`}</div></div>`;
}
function viewGallery() {
  const out = [];
  (function walk(p, n) { for (const c of n.children || []) { const cp = join(p, c.name); if (isImage(c)) out.push({ node: c, path: cp }); else if (c.type === 'dir') walk(cp, c); } })(HOME + '/Pictures', getNode(HOME + '/Pictures'));
  out.sort((a, b) => b.node.mtime - a.node.mtime); CURRENT = out;
  const months = {};
  for (const it of out) { const k = it.node.mtime.toLocaleString('en-US', { month: 'long', year: 'numeric' }); (months[k] = months[k] || []).push(it); }
  return Object.entries(months).map(([m, list]) => `<div class="ghead"><span>${m}</span></div><div class="gal">${list.map(it => `<div ${itemAttrs(it)}><div class="art" style="${artCss(it.node.art || 1)}"></div></div>`).join('')}</div>`).join('');
}
function viewNetwork() {
  CURRENT = [];
  const pcs = ['NAS-HOME', 'OFFICE-PC'];
  return `<div class="ghead">${ui('chevron-down', 12)}<span>Computer (${pcs.length})</span></div><div class="drives">${pcs.map(p => `<div class="drive it" data-net="${p}">${ic('i-drive-network', 48)}<div class="meta"><span class="n">${p}</span><span class="free">smb://${p.toLowerCase()}.local</span></div></div>`).join('')}</div>`;
}

// ------------------------------------------------------------------ RENDER: details pane & status bar
function renderDetails() {
  const el = $('#details'); el.classList.toggle('show', S.details);
  if (!S.details) return;
  const sel = selectedItems(), l = loc();
  if (l === 'thispc' && sel.length === 1) {
    const v = VOLS.find(v => v.mount === sel[0].path), used = v.total - v.free, pct = used / v.total * 100;
    el.innerHTML = `<div class="dp-hero"><div class="donut" style="background:conic-gradient(var(--c-bar-fill) 0 ${pct}%, var(--c-bar-track) ${pct}% 100%)"></div></div>
      <div class="dp-name">${esc(locLabel(v.mount))}</div><div class="dp-type">${v.mount === '/' ? 'Local Disk · APFS' : 'External Disk · ExFAT'}</div>
      ${v.ejectable ? `<div class="dp-actions"><button class="btn" data-cmd="eject">${ui('eject')}Eject</button></div>` : ''}
      <div class="dp-h">Properties</div><div class="kv"><span class="k">Used space</span><span class="v">${shortSize(used)}</span><span class="k">Free space</span><span class="v">${shortSize(v.free)}</span><span class="k">Capacity</span><span class="v">${shortSize(v.total)}</span><span class="k">Mount point</span><span class="v">${esc(v.mount)}</span><span class="k">Drive letter</span><span class="v">${v.letter}: <span class="badge">display only</span></span></div>`;
    return;
  }
  if (sel.length === 0) {
    const n = isSpecial(l) ? null : getNode(l);
    el.innerHTML = `<div class="dp-hero">${ic(locIcon(l), 96)}</div><div class="dp-name">${esc(locLabel(l))}</div>
      <div class="dp-type">${CURRENT.length} items</div>${n ? `<div class="dp-h">Properties</div><div class="kv"><span class="k">Location</span><span class="v">${esc(displayPath(l))}</span><span class="k">Modified</span><span class="v">${fmtDate(n.mtime)}</span></div>` : '<div class="muted">Select a single file to get more information.</div>'}`;
    return;
  }
  if (sel.length > 1) {
    const total = sel.reduce((s, i) => s + sizeOf(i.node), 0);
    el.innerHTML = `<div class="dp-hero">${ic('i-folder', 96)}</div><div class="dp-name">${sel.length} items selected</div><div class="dp-type">Total size ${shortSize(total)}</div>`;
    return;
  }
  const it = sel[0], n = it.node;
  const hero = isImage(n) ? `<div class="thumb" style="width:240px;height:170px;${artCss(n.art || 1)}"></div>` : ic(iconOf(n, it.path), 96);
  el.innerHTML = `<div class="dp-hero">${hero}</div><div class="dp-name">${esc(n.name)}</div><div class="dp-type">${esc(typeOf(n))}</div>
    <div class="dp-actions"><button class="btn" data-cmd="open">${ui('open-with')}Open</button><button class="btn" data-cmd="share">${ui('share')}Share</button></div>
    <div class="dp-h">Properties</div><div class="kv">
      <span class="k">Size</span><span class="v">${shortSize(sizeOf(n))}</span>
      <span class="k">Date modified</span><span class="v">${fmtDate(n.mtime)}</span>
      <span class="k">Date created</span><span class="v">${fmtDate(n.ctime || n.mtime)}</span>
      <span class="k">Location</span><span class="v">${esc(displayPath(it.inFolder || parentOf(it.path) || '/'))}</span>
      ${n.author ? `<span class="k">Authors</span><span class="v">${esc(n.author)}</span>` : ''}
      <span class="k">Tags</span><span class="v muted">Add a tag</span></div>`;
}
function renderStatus() {
  const sel = selectedItems(), v = tab().view;
  const size = sel.length && sel.every(i => i.node.type === 'file') ? `${shortSize(sel.reduce((s, i) => s + i.node.size, 0))}` : '';
  $('#status').innerHTML = `<span>${CURRENT.length} item${CURRENT.length === 1 ? '' : 's'}</span><span class="bar"></span>
    ${sel.length ? `<span>${sel.length} item${sel.length === 1 ? '' : 's'} selected${size ? '&nbsp;&nbsp;' + size : ''}</span><span class="bar"></span>` : ''}
    <div class="right"><button class="${v === 'details' ? 'on' : ''}" data-view="details" title="Details">${ui('details-view', 14)}</button><button class="${v === 'large' ? 'on' : ''}" data-view="large" title="Large icons">${ui('grid', 14)}</button></div>`;
}

// ------------------------------------------------------------------ menus
let menuEl = null;
function closeMenu() { if (menuEl) { menuEl.remove(); menuEl = null; document.querySelectorAll('.cmd.open').forEach(b => b.classList.remove('open')); } }
function showMenu(html, x, y, actions) {
  closeMenu();
  menuEl = document.createElement('div'); menuEl.className = 'menu'; menuEl.innerHTML = html; document.body.appendChild(menuEl);
  const r = menuEl.getBoundingClientRect();
  menuEl.style.left = Math.min(x, innerWidth - r.width - 8) + 'px';
  menuEl.style.top = (y + r.height > innerHeight - 8 ? Math.max(8, y - r.height) : y) + 'px';
  menuEl.addEventListener('click', e => {
    const b = e.target.closest('[data-m]'); if (!b || b.classList.contains('dis')) return;
    const fn = actions[b.dataset.m]; closeMenu(); fn && fn();
  });
}
const MOD = () => S.keys === 'mac' ? '⌘' : 'Ctrl+';
const mi = (id, label, icon = '', acc = '', on = null, disabled = false) =>
  `<div class="mi ${disabled ? 'dis' : ''}" data-m="${id}"><span class="ico">${on === true ? ui('check', 14) : on === 'dot' ? '<span class="dot"></span>' : icon ? ui(icon) : ''}</span><span>${label}</span>${acc ? `<span class="acc">${acc}</span>` : ''}</div>`;
const sep = '<div class="msep"></div>';

function menuFor(kind, anchor) {
  const r = anchor.getBoundingClientRect(); anchor.classList.add('open');
  const x = r.left, y = r.bottom + 4, t = tab();
  if (kind === 'new') return showMenu(mi('folder', 'Folder', 'new-folder', MOD() + 'Shift+N') + sep + mi('txt', 'Text Document', 'new-file') + mi('md', 'Markdown File', 'new-file'), x, y,
    { folder: newFolder, txt: () => newFile('txt', 'New Text Document'), md: () => newFile('md', 'New Markdown File') });
  if (kind === 'sort') {
    const s = t.sort, o = k => s.key === k ? 'dot' : null;
    return showMenu(mi('name', 'Name', '', '', o('name')) + mi('date', 'Date modified', '', '', o('date')) + mi('type', 'Type', '', '', o('type')) + mi('size', 'Size', '', '', o('size')) + sep +
      mi('asc', 'Ascending', '', '', s.dir > 0 ? 'dot' : null) + mi('desc', 'Descending', '', '', s.dir < 0 ? 'dot' : null), x, y,
      { name: () => setSort('name'), date: () => setSort('date'), type: () => setSort('type'), size: () => setSort('size'), asc: () => { t.sort.dir = 1; render(); }, desc: () => { t.sort.dir = -1; render(); } });
  }
  if (kind === 'view') {
    const v = t.view, o = k => v === k ? 'dot' : null, M = S.keys === 'mac' ? '⌘⇧' : 'Ctrl+Shift+';
    return showMenu(mi('large', 'Large icons', '', M + '2', o('large')) + mi('medium', 'Medium icons', '', M + '3', o('medium')) + mi('list', 'List', '', M + '5', o('list')) + mi('details', 'Details', '', M + '6', o('details')) + mi('tiles', 'Tiles', '', M + '7', o('tiles')) + mi('content', 'Content', '', M + '8', o('content')) + sep +
      mi('compact', 'Compact view', '', '', S.compact) + sep + mi('dpane', 'Details pane', '', 'Alt+Shift+P', S.details) + mi('hidden', 'Hidden items', '', '', S.hidden) + mi('exts', 'File name extensions', '', '', S.exts), x, y,
      { large: () => setView('large'), medium: () => setView('medium'), list: () => setView('list'), details: () => setView('details'), tiles: () => setView('tiles'), content: () => setView('content'),
        compact: () => { S.compact = !S.compact; render(); }, dpane: () => { S.details = !S.details; render(); }, hidden: () => { S.hidden = !S.hidden; render(); }, exts: () => { S.exts = !S.exts; render(); } });
  }
  if (kind === 'more') return showMenu(mi('all', 'Select all', 'select-all', MOD() + 'A') + mi('none', 'Select none', '') + mi('inv', 'Invert selection', '') + sep +
    mi('props', 'Properties', 'properties', S.keys === 'mac' ? '⌘I' : 'Alt+Enter', null, !selectedItems().length) + mi('term', 'Open in Terminal', 'terminal') + sep + mi('opts', 'Options', 'settings') + mi('keys', 'Keyboard shortcuts', 'keyboard'), r.right - 260, y,
    { all: selectAll, none: () => { t.sel = new Set(); render(); }, inv: () => { t.sel = new Set(CURRENT.filter(i => !t.sel.has(i.path)).map(i => i.path)); render(); }, props: propertiesDialog, term: () => note('Real app: <code>open -a Terminal "&lt;folder&gt;"</code>'), opts: settingsDialog, keys: shortcutsDialog });
}
function contextMenu(e, onItem) {
  e.preventDefault();
  const l = loc(), sel = selectedItems(), one = sel.length === 1 ? sel[0] : null, trash = l === 'trash';
  if (trash && onItem) return showMenu(mi('restore', 'Put back', 'undo') + mi('del', 'Delete immediately…', 'delete'), e.clientX, e.clientY, { restore: () => restore(sel), del: () => { sel.forEach(i => { const k = TRASH.findIndex(t => t.node === i.node); TRASH.splice(k, 1); }); render(); } });
  if (onItem && sel.length) {
    const isDir = one && one.node.type === 'dir', isVol = l === 'thispc';
    const top = `<div class="mrow"><button data-m="cut" title="Cut">${ui('cut', 18)}</button><button data-m="copy" title="Copy">${ui('copy', 18)}</button><button data-m="rename" title="Rename">${ui('rename', 18)}</button><button data-m="share" title="Share">${ui('share', 18)}</button><button data-m="delete" title="Delete">${ui('delete', 18)}</button></div>${sep}`;
    return showMenu((isVol ? '' : top) + mi('open', 'Open', 'open-with', 'Enter') + (isDir ? mi('newtab', 'Open in new tab', 'tab-new') : mi('openwith', 'Open with', '', '›')) +
      (one ? mi('pin', S.pinned.includes(one.path) ? 'Unpin from Quick access' : 'Pin to Quick access', S.pinned.includes(one.path) ? 'unpin' : 'pin') : '') +
      (isVol ? (one.node.vol.ejectable ? mi('eject', 'Eject', 'eject') : '') : mi('zip', 'Compress to ZIP file', 'zip')) + mi('path', 'Copy as path', 'link', MOD() + 'Shift+C') +
      mi('ql', 'Quick Look', 'quicklook', 'Space') + mi('props', 'Properties', 'properties', S.keys === 'mac' ? '⌘I' : 'Alt+Enter') + sep +
      mi('finder', 'Show in Finder', 'folder') + mi('term', 'Open in Terminal', 'terminal'), e.clientX, e.clientY, {
        cut: () => copy(true), copy: () => copy(false), rename: startRename, share: () => note('Real app: macOS share sheet via <code>ShareMenu</code> (AirDrop, Mail, Messages…)'), delete: () => del(),
        open: () => open(one || sel[0]), newtab: () => open(one, true), openwith: () => note('Real app: lists apps from <code>LSCopyApplicationURLsForURL</code> (native helper).'),
        pin: () => togglePin(one.path), zip: () => note('Real app: runs <code>ditto -c -k --keepParent</code> → creates “' + esc(baseOf(sel[0].node.name)) + '.zip”'), eject: () => note('Real app: <code>diskutil eject</code> on ' + esc(one.path)),
        path: () => { const t = sel.map(i => displayPath(i.path)).join('\n'); navigator.clipboard && navigator.clipboard.writeText(t).catch(() => {}); note('Copied: <code>' + esc(t) + '</code>'); },
        ql: quickLook, props: propertiesDialog, finder: () => note('Real app: <code>shell.showItemInFolder()</code> reveals it in Finder.'), term: () => note('Real app: <code>open -a Terminal</code> at this folder.'),
      });
  }
  const fsLoc = !isSpecial(l);
  showMenu(mi('view', 'View', 'view', '›') + mi('sort', 'Sort by', 'sort', '›') + sep + mi('refresh', 'Refresh', 'refresh', 'F5') + mi('paste', 'Paste', 'paste', MOD() + 'V', null, !(S.clip && fsLoc)) + mi('undo', 'Undo', 'undo', MOD() + 'Z', null, !S.undo.length) + sep +
    mi('nf', 'New folder', 'new-folder', MOD() + 'Shift+N', null, !fsLoc) + mi('nt', 'New text document', 'new-file', '', null, !fsLoc) + sep + mi('term', 'Open in Terminal', 'terminal') + mi('props', 'Properties', 'properties'), e.clientX, e.clientY, {
      view: () => menuFor('view', $('[data-menu="view"]')), sort: () => menuFor('sort', $('[data-menu="sort"]')), refresh: render, paste, undo, nf: newFolder, nt: () => newFile(), term: () => note('Real app: <code>open -a Terminal</code> at this folder.'), props: propertiesDialog });
}
function crumbMenu(anchor, p) {
  let kids = [];
  if (p === 'thispc') kids = VOLS.map(v => ({ loc: v.mount, label: locLabel(v.mount), icon: v.icon }));
  else if (!isSpecial(p)) { const n = getNode(p); kids = (n?.children || []).filter(c => c.type === 'dir' && !c.hidden && !c.name.startsWith('.')).map(c => ({ loc: join(p, c.name), label: c.name, icon: iconOf(c, join(p, c.name)) })); }
  if (!kids.length) return;
  const r = anchor.getBoundingClientRect(), acts = {};
  showMenu(kids.map((k, i) => { acts['k' + i] = () => go(k.loc); return `<div class="mi" data-m="k${i}"><span class="ico">${ic(k.icon, 16)}</span><span>${esc(k.label)}</span></div>`; }).join(''), r.left, r.bottom + 4, acts);
}
function setView(v) { tab().view = v; render(); }
function setSort(k) { const s = tab().sort; if (s.key === k) s.dir *= -1; else { s.key = k; s.dir = 1; } render(); }
function selectAll() { tab().sel = new Set(CURRENT.map(i => i.path)); render(); }
function startRename() { const s = selectedItems(); if (s.length !== 1 || loc() === 'trash' || isSpecial(loc()) && loc() !== 'home') return; S.renaming = s[0].path; renderMain(); }

// ------------------------------------------------------------------ dialogs
let dlgActions = {};
function dialog(html, actions = {}, cls = '') {
  closeDialog(); dlgActions = actions;
  const s = document.createElement('div'); s.className = 'scrim'; s.id = 'scrim';
  s.innerHTML = `<div class="dlg ${cls}">${html}</div>`; document.body.appendChild(s);
  s.addEventListener('click', e => {
    if (e.target === s && !actions.modal) return closeDialog();
    const b = e.target.closest('[data-act]'); if (!b) return;
    const a = b.dataset.act; if (a === 'close') return closeDialog(); actions[a] && actions[a](b);
  });
}
function closeDialog() { const s = $('#scrim'); s && s.remove(); clearInterval(progTimer); }
let progTimer = null;
function progressDialog(items, dest, done) {
  const total = items.reduce((s, i) => s + sizeOf(i.node), 0);
  const from = items[0] ? locLabel(parentOf(items[0].path)) : '', to = locLabel(dest);
  dialog(`<div class="bd"><div class="muted">${S.clip?.cut ? 'Moving' : 'Copying'} ${items.length} item${items.length > 1 ? 's' : ''} from <b>${esc(from)}</b> to <b>${esc(to)}</b></div>
    <h2 id="pp" style="margin-top:8px">0% complete</h2><div class="chart"><i id="pc" style="width:0%"></i></div>
    <div class="kv"><span class="k">Name</span><span class="v">${esc(items[0].node.name)}</span><span class="k">Time remaining</span><span class="v" id="pt">Calculating…</span><span class="k">Items remaining</span><span class="v" id="pr">${items.length} (${shortSize(total)})</span><span class="k">Speed</span><span class="v" id="ps">—</span></div></div>
    <div class="ft"><button class="btn" data-act="pause">Pause</button><button class="btn" data-act="close">Cancel</button></div>`, { pause: b => { paused = !paused; b.textContent = paused ? 'Resume' : 'Pause'; } });
  let p = 0, paused = false;
  progTimer = setInterval(() => {
    if (paused) return;
    p = Math.min(100, p + 4 + Math.random() * 6);
    const pp = $('#pp'); if (!pp) return clearInterval(progTimer);
    pp.textContent = Math.floor(p) + '% complete'; $('#pc').style.width = p + '%';
    $('#ps').textContent = (180 + Math.random() * 60).toFixed(1) + ' MB/s';
    $('#pt').textContent = p < 100 ? `About ${Math.max(1, Math.round((100 - p) / 12))} seconds` : 'Done';
    $('#pr').textContent = `${Math.max(0, Math.ceil(items.length * (1 - p / 100)))} (${shortSize(total * (1 - p / 100))})`;
    if (p >= 100) { clearInterval(progTimer); setTimeout(() => { closeDialog(); done(); }, 350); }
  }, 120);
}
function conflictDialog(it, count, dest, run) {
  const ex = getNode(join(dest, it.node.name));
  dialog(`<div class="bd"><h2>Replace or Skip Files</h2><div class="muted" style="margin-bottom:6px">${S.clip.cut ? 'Moving' : 'Copying'} ${count} item${count > 1 ? 's' : ''} to <b>${esc(locLabel(dest))}</b></div>
    <div style="margin-bottom:14px">The destination already has a file named “${esc(it.node.name)}”</div>
    <div class="opt" data-act="replace">${ui('check', 20)}<div><div class="t">Replace the file in the destination</div><div class="muted">${shortSize(sizeOf(it.node))} · modified ${fmtDate(it.node.mtime)}</div></div></div>
    <div class="opt" data-act="skip">${ui('redo', 20)}<div><div class="t">Skip this file</div><div class="muted">Keep the existing ${shortSize(sizeOf(ex))} file</div></div></div>
    <div class="opt" data-act="both">${ui('copy', 20)}<div><div class="t">Keep both</div><div class="muted">The copy will be named “${esc(uniqueName(getNode(dest), it.node.name, 'num'))}”</div></div></div>
    <div class="opt" data-act="compare">${ui('details-pane', 20)}<div><div class="t">Compare info for both files</div></div></div></div>
    <div class="ft"><button class="btn" data-act="close">Cancel</button></div>`,
    { replace: () => { closeDialog(); run('replace'); }, skip: () => { closeDialog(); run('skip'); }, both: () => { closeDialog(); run('both'); }, compare: () => note('Real app: side-by-side compare (size, dates, thumbnail).') });
}
function propertiesDialog() {
  const s = selectedItems(); const it = s[0]; if (!it) return;
  const n = it.node;
  dialog(`<div class="bd"><div style="display:flex;gap:16px;align-items:center;margin-bottom:16px">${ic(iconOf(n, it.path), 48)}<input class="rn" style="height:32px;font-size:14px" value="${esc(n.name)}"></div>
    <div class="kv"><span class="k">Type</span><span class="v">${esc(typeOf(n))}</span><span class="k">Location</span><span class="v">${esc(displayPath(parentOf(it.path) || '/'))}</span><span class="k">macOS path</span><span class="v">${esc(it.path)}</span>
    <span class="k">Size</span><span class="v">${shortSize(sizeOf(n))} (${sizeOf(n).toLocaleString('en-US')} bytes)</span><span class="k">Created</span><span class="v">${fmtDate(n.ctime || n.mtime)}</span><span class="k">Modified</span><span class="v">${fmtDate(n.mtime)}</span>
    <span class="k">Attributes</span><span class="v"><label><input type="checkbox"> Read-only (locked)</label>&nbsp;&nbsp;<label><input type="checkbox" ${n.hidden ? 'checked' : ''}> Hidden</label></span></div></div>
    <div class="ft"><button class="btn primary" data-act="close">OK</button><button class="btn" data-act="close">Cancel</button><button class="btn" data-act="close">Apply</button></div>`, {});
}
function quickLook() {
  const it = selectedItems()[0]; if (!it) return;
  const n = it.node;
  const body = isImage(n) ? `<div style="width:460px;height:320px;border-radius:4px;${artCss(n.art || 1)}"></div>` : ic(iconOf(n, it.path), 160);
  dialog(`<div class="qh">${ui('close', 14)}<span style="flex:1;text-align:center">${esc(n.name)}</span><span style="opacity:.7">Open with Default App</span></div><div class="qb">${body}</div>`, {}, 'ql');
}
function settingsDialog() {
  const seg = (k, opts) => `<div class="seg">${opts.map(([v, l]) => `<button class="${S[k] === v ? 'on' : ''}" data-act="set" data-k="${k}" data-v="${v}">${l}</button>`).join('')}</div>`;
  const tg = (k) => `<button class="tgl ${S[k] ? 'on' : ''}" data-act="tgl" data-k="${k}"></button>`;
  dialog(`<div class="bd"><h2>Options</h2>
    <div class="row2"><div><div>Theme</div><div class="d">Follows macOS by default</div></div>${seg('theme', [['light', 'Light'], ['dark', 'Dark']])}</div>
    <div class="row2"><div><div>Window buttons</div><div class="d">Windows: minimise / maximise / close on the right</div></div>${seg('winStyle', [['windows', 'Windows'], ['mac', 'macOS']])}</div>
    <div class="row2"><div><div>Keyboard shortcuts</div><div class="d">“Both” = Ctrl and ⌘ work</div></div>${seg('keys', [['windows', 'Ctrl'], ['mac', '⌘'], ['both', 'Both']])}</div>
    <div class="row2"><div><div>Show drive letters</div><div class="d">Macintosh HD → C:, external drives → D:, E:…</div></div>${tg('letters')}</div>
    <div class="row2"><div><div>Show hidden items</div><div class="d">Dot-files and macOS hidden flag</div></div>${tg('hidden')}</div>
    <div class="row2"><div><div>Show file name extensions</div></div>${tg('exts')}</div>
    <div class="row2"><div><div>Compact view</div><div class="d">Decrease space between items</div></div>${tg('compact')}</div>
    <div class="row2"><div><div>Open each folder in a new tab</div></div>${tg('newTabFolders')}</div>
    <div class="row2"><div><div>Text size</div></div>${seg('textScale', [[1, '100%'], [1.1, '110%'], [1.25, '125%']])}</div></div>
    <div class="ft"><button class="btn primary" data-act="close">Done</button></div>`, {
    set: b => { const k = b.dataset.k; let v = b.dataset.v; if (k === 'textScale') v = +v; S[k] = v; render(); settingsDialog(); },
    tgl: b => { const k = b.dataset.k; S[k] = !S[k]; render(); settingsDialog(); },
  }, 'wide');
  $('.dlg').style.width = '600px';
}
function shortcutsDialog() {
  const M = S.keys === 'mac' ? '⌘' : 'Ctrl';
  const rows = [['New tab / close tab', `${M}+T / ${M}+W`], ['Back / Forward / Up', 'Alt+← / Alt+→ / Alt+↑'], ['Address bar', `Alt+D, ${M}+L`], ['Search', `${M}+E, ${M}+F`], ['New folder', `${M}+Shift+N`], ['Rename', 'F2'], ['Delete / Delete permanently', 'Delete / Shift+Delete'], ['Cut, Copy, Paste, Undo', `${M}+X, C, V, Z`], ['Select all', `${M}+A`], ['Details pane', 'Alt+Shift+P'], ['Properties', `Alt+Enter, ${M}+I`], ['Quick Look', 'Space'], ['Refresh', 'F5'], ['Views', `${M}+Shift+2…8`]];
  dialog(`<div class="bd"><h2>Keyboard shortcuts</h2><div class="kv" style="grid-template-columns:1fr auto">${rows.map(([a, b]) => `<span>${a}</span><span class="muted">${b}</span>`).join('')}</div></div><div class="ft"><button class="btn primary" data-act="close">Close</button></div>`);
}
function onboardingDialog() {
  let done = { folders: false, fda: false };
  const draw = () => dialog(`<div class="bd" style="padding:28px 28px 20px"><div style="display:flex;gap:16px;align-items:center;margin-bottom:8px"><svg width="64" height="64"><use href="#app-icon"/></svg><div><h2 style="margin:0">Welcome to Khoj</h2><div class="muted">The Windows-style file explorer for your Mac</div></div></div>
    <div class="step ${done.folders ? 'ok' : ''}"><span class="n">${done.folders ? ui('check', 14) : 1}</span><div class="grow"><div>Allow access to Desktop, Documents and Downloads</div><div class="muted" style="font-size:12px">macOS will ask once for each folder.</div></div><button class="btn ${done.folders ? '' : 'primary'}" data-act="folders">${done.folders ? 'Allowed' : 'Allow'}</button></div>
    <div class="step"><span class="n">2</span><div class="grow"><div>External drives</div><div class="muted" style="font-size:12px">You’ll be asked the first time you open a USB or network drive.</div></div><span class="badge">automatic</span></div>
    <div class="step ${done.fda ? 'ok' : ''}"><span class="n">${done.fda ? ui('check', 14) : 3}</span><div class="grow"><div>Full Disk Access <span class="badge">optional</span></div><div class="muted" style="font-size:12px">Needed only to browse protected folders like Mail or Safari data.</div></div><button class="btn" data-act="fda">Open System Settings</button></div>
    <div class="row2" style="margin-top:6px"><div>Keyboard</div><div class="seg">${[['windows', 'Windows (Ctrl)'], ['mac', 'Mac (⌘)'], ['both', 'Both']].map(([v, l]) => `<button class="${S.keys === v ? 'on' : ''}" data-act="keys" data-v="${v}">${l}</button>`).join('')}</div></div>
    <div class="row2"><div>Window buttons</div><div class="seg">${[['windows', 'Windows style'], ['mac', 'macOS style']].map(([v, l]) => `<button class="${S.winStyle === v ? 'on' : ''}" data-act="win" data-v="${v}">${l}</button>`).join('')}</div></div></div>
    <div class="ft"><button class="btn primary" data-act="close">Get started</button></div>`, {
    modal: true,
    folders: () => { done.folders = true; draw(); }, fda: () => { done.fda = true; draw(); note('Real app opens <code>x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles</code>'); },
    keys: b => { S.keys = b.dataset.v; draw(); }, win: b => { S.winStyle = b.dataset.v; render(); draw(); },
  });
  draw(); $('.dlg').style.width = '600px';
}
let noteTimer;
function note(html) {
  document.querySelectorAll('.note').forEach(n => n.remove());
  const n = document.createElement('div'); n.className = 'note'; n.innerHTML = `${ui('info')}<span>${html}</span><span class="badge">prototype</span>`; document.body.appendChild(n);
  clearTimeout(noteTimer); noteTimer = setTimeout(() => n.remove(), 4200);
}

// ------------------------------------------------------------------ events
function init() {
  S.tabs = [newTab('thispc')];
  applyHash();
  render();
  const root = document.body;

  root.addEventListener('click', e => {
    const el = e.target;
    if (menuEl && !menuEl.contains(el) && !el.closest('[data-menu]')) closeMenu();
    let b;
    if ((b = el.closest('[data-closetab]'))) { e.stopPropagation(); closeTab(+b.dataset.closetab); return; }
    if ((b = el.closest('[data-tab]'))) { S.active = +b.dataset.tab; render(); return; }
    if (el.closest('#newtab')) { S.tabs.push(newTab('home')); S.active = S.tabs.length - 1; render(); return; }
    if ((b = el.closest('[data-toggle]'))) { e.stopPropagation(); const k = b.dataset.toggle; S.expanded.has(k) ? S.expanded.delete(k) : S.expanded.add(k); renderNav(); return; }
    if ((b = el.closest('[data-crumbmenu]'))) { crumbMenu(b, b.dataset.crumbmenu); return; }
    if (el.closest('[data-addr-edit]')) { S.addrEdit = true; renderAddress(); return; }
    if ((b = el.closest('[data-go]'))) { go(b.dataset.go); return; }
    if ((b = el.closest('[data-menu]'))) { if (b.classList.contains('open')) return closeMenu(); menuFor(b.dataset.menu, b); return; }
    if ((b = el.closest('[data-cmd]'))) { command(b.dataset.cmd); return; }
    if ((b = el.closest('[data-view]'))) { setView(b.dataset.view); return; }
    if ((b = el.closest('[data-sort]'))) { setSort(b.dataset.sort); return; }
    if ((b = el.closest('[data-hometab]'))) { S.homeTab = b.dataset.hometab; renderMain(); return; }
    if ((b = el.closest('[data-net]'))) { note(`Real app: mounts <code>smb://${b.dataset.net.toLowerCase()}.local</code> with <code>open smb://…</code> and it appears under This PC.`); return; }
    if ((b = el.closest('#main [data-path]'))) { if (el.closest('.rn')) return; clickItem(b.dataset.path, e); return; }
    if (el.closest('#scroll') && !el.closest('.hdr')) { tab().sel = new Set(); if (S.renaming) { S.renaming = null; renderMain(); } else paintSelection(); renderCommand(); renderStatus(); renderDetails(); }
    if (el.closest('#bk')) back(); if (el.closest('#fw')) fwd(); if (el.closest('#upb')) up(); if (el.closest('#rf')) { render(); }
    if (el.closest('#cap-min')) note('Real app: <code>win.minimize()</code> → goes to the Dock.');
    if (el.closest('#cap-max')) { S.max = !S.max; render(); }
    if (el.closest('#cap-close')) note('Real app: closes the window (app stays in the Dock, like Finder).');
  });
  root.addEventListener('dblclick', e => {
    const b = e.target.closest('#main [data-path]');
    if (b && !e.target.closest('.rn')) { const it = CURRENT.find(i => i.path === b.dataset.path); if (it) loc() === 'trash' ? null : open(it); return; }
    if (e.target.closest('.drag') || (e.target.closest('.tabstrip') && !e.target.closest('.tab,.captions,#newtab'))) { S.max = !S.max; render(); }
  });
  root.addEventListener('contextmenu', e => {
    const b = e.target.closest('#main [data-path]');
    if (b) { if (!tab().sel.has(b.dataset.path)) clickItem(b.dataset.path, {}); contextMenu(e, true); return; }
    if (e.target.closest('#main')) { tab().sel = new Set(); renderMain(); contextMenu(e, false); return; }
    const n = e.target.closest('.nav-item');
    if (n) { e.preventDefault(); const p = n.dataset.navpath; if (isSpecial(p)) return; showMenu(mi('open', 'Open', 'open-with') + mi('newtab', 'Open in new tab', 'tab-new') + mi('pin', S.pinned.includes(p) ? 'Unpin from Quick access' : 'Pin to Quick access', S.pinned.includes(p) ? 'unpin' : 'pin') + sep + mi('props', 'Properties', 'properties'), e.clientX, e.clientY, { open: () => go(p), newtab: () => { S.tabs.push(newTab(p)); S.active = S.tabs.length - 1; render(); }, pin: () => togglePin(p), props: () => note('Properties for ' + esc(displayPath(p))) }); return; }
    e.preventDefault();
  });
  root.addEventListener('keydown', e => {
    const t = e.target;
    if (t.id === 'addrIn') { if (e.key === 'Enter') { const p = parseInput(t.value); if (p) go(p); else note(`Khoj can’t find “${esc(t.value)}”. Check the spelling and try again.`); } if (e.key === 'Escape') { S.addrEdit = false; renderAddress(); } return; }
    if (t.id === 'rn') { if (e.key === 'Enter') commitRename(S.renaming, t.value); if (e.key === 'Escape') { S.renaming = null; renderMain(); } return; }
    if (t.id === 'searchIn') { if (e.key === 'Escape') { S.search = ''; t.value = ''; renderMain(); renderStatus(); t.blur(); } return; }
    if (t.tagName === 'INPUT') return;
    if ($('#scrim')) { if (e.key === 'Escape' && !dlgActions.modal) closeDialog(); return; }
    shortcut(e);
  });
  $('#searchIn').addEventListener('input', e => { S.search = e.target.value; renderMain(); renderStatus(); });
  document.addEventListener('focusout', e => { if (e.target.id === 'rn' && S.renaming) commitRename(S.renaming, e.target.value); if (e.target.id === 'addrIn') setTimeout(() => { S.addrEdit = false; renderAddress(); }, 120); });
  window.addEventListener('resize', closeMenu);

  // splitter
  const sp = $('#split'); let dragging = false;
  sp.addEventListener('mousedown', () => { dragging = true; document.body.style.cursor = 'col-resize'; });
  window.addEventListener('mousemove', e => { if (!dragging) return; const left = $('#win').getBoundingClientRect().left; S.navW = Math.max(160, Math.min(600, e.clientX - left)); document.documentElement.style.setProperty('--nav-w', S.navW + 'px'); });
  window.addEventListener('mouseup', () => { dragging = false; document.body.style.cursor = ''; });

  // drag & drop: move into folders (inside the prototype only)
  root.addEventListener('dragstart', e => { const b = e.target.closest('#main [data-path]'); if (!b) return; if (!tab().sel.has(b.dataset.path)) clickItem(b.dataset.path, {}); e.dataTransfer.setData('text/plain', 'khoj'); });
  root.addEventListener('dragover', e => { const b = e.target.closest('[data-path],[data-navpath]'); if (b) e.preventDefault(); });
  root.addEventListener('drop', e => {
    const b = e.target.closest('[data-path],[data-navpath]'); if (!b) return; e.preventDefault();
    const dest = b.dataset.path || b.dataset.navpath; const dn = getNode(dest); if (!dn || dn.type !== 'dir' || isSpecial(dest)) return;
    const items = selectedItems().filter(i => i.path !== dest && !dest.startsWith(i.path + '/'));
    if (!items.length) return;
    const sameVol = volOf(items[0].path) === volOf(dest);
    S.clip = { cut: sameVol, items: items.map(i => ({ path: i.path, node: i.node })) };
    const cur = tab().hist[tab().i]; tab().hist[tab().i] = dest; paste(); tab().hist[tab().i] = cur; render();
    note(`${sameVol ? 'Moved' : 'Copied'} ${items.length} item(s) to <b>${esc(locLabel(dest))}</b> — same drive = move, different drive = copy (Windows rule).`);
  });
}
function closeTab(i) { if (S.tabs.length === 1) { S.tabs = [newTab('home')]; S.active = 0; } else { S.tabs.splice(i, 1); S.active = Math.min(S.active, S.tabs.length - 1); } render(); }
function command(c) {
  ({ cut: () => copy(true), copy: () => copy(false), paste, rename: startRename, delete: () => del(), details: () => { S.details = !S.details; render(); },
    share: () => note('Real app: macOS share sheet (AirDrop, Mail, Messages…).'), restore: () => restore(selectedItems()), empty: emptyTrash,
    open: () => { const s = selectedItems()[0]; s && open(s); }, eject: () => note('Real app: <code>diskutil eject</code>') })[c]?.();
}
function shortcut(e) {
  const k = e.key, mod = S.keys === 'windows' ? e.ctrlKey : S.keys === 'mac' ? e.metaKey : (e.ctrlKey || e.metaKey);
  const t = tab(), handled = () => e.preventDefault();
  if (mod && e.shiftKey && /^[2-8]$/.test(k)) { const m = { 2: 'large', 3: 'medium', 5: 'list', 6: 'details', 7: 'tiles', 8: 'content' }[k]; if (m) { handled(); setView(m); } return; }
  if (mod && e.shiftKey && k.toLowerCase() === 'n') { handled(); return newFolder(); }
  if (mod && e.shiftKey && k.toLowerCase() === 'c') { handled(); const s = selectedItems(); if (s.length) note('Copied: <code>' + esc(s.map(i => displayPath(i.path)).join(', ')) + '</code>'); return; }
  if (mod && !e.shiftKey) {
    const kk = k.toLowerCase();
    const map = { t: () => { S.tabs.push(newTab('home')); S.active = S.tabs.length - 1; render(); }, w: () => closeTab(S.active), a: selectAll, c: () => copy(false), x: () => copy(true), v: paste, z: undo,
      l: () => { S.addrEdit = true; renderAddress(); }, e: () => $('#searchIn').focus(), f: () => $('#searchIn').focus(), i: propertiesDialog, r: render, n: () => note('Real app: opens a new window.'),
      arrowup: up, '[': back, ']': fwd, enter: () => { const s = selectedItems()[0]; s && open(s, true); }, backspace: () => del(), arrowdown: () => { const s = selectedItems()[0]; s && open(s); } };
    if (map[kk]) { handled(); map[kk](); return; }
    if (k === 'Tab') { handled(); S.active = (S.active + 1) % S.tabs.length; render(); return; }
  }
  if (e.ctrlKey && k === 'Tab') { handled(); S.active = (S.active + (e.shiftKey ? S.tabs.length - 1 : 1)) % S.tabs.length; render(); return; }
  if (e.altKey && e.shiftKey && e.code === 'KeyP') { handled(); S.details = !S.details; render(); return; }
  if (e.altKey && k === 'ArrowLeft') { handled(); return back(); }
  if (e.altKey && k === 'ArrowRight') { handled(); return fwd(); }
  if (e.altKey && k === 'ArrowUp') { handled(); return up(); }
  if (e.altKey && e.code === 'KeyD') { handled(); S.addrEdit = true; return renderAddress(); }
  if (e.altKey && k === 'Enter') { handled(); return propertiesDialog(); }
  if (k === 'F2') { handled(); return startRename(); }
  if (k === 'F5') { handled(); return render(); }
  if (k === 'F3') { handled(); return $('#searchIn').focus(); }
  if (k === 'F4') { handled(); S.addrEdit = true; return renderAddress(); }
  if (k === 'Delete') { handled(); return del(e.shiftKey); }
  if (k === 'Backspace') { handled(); return back(); }
  if (k === 'Enter') { const s = selectedItems(); if (s.length) { handled(); open(s[0]); } return; }
  if (k === ' ') { handled(); return quickLook(); }
  if (k === 'Escape') { closeMenu(); if (S.clip?.cut) { S.clip = null; renderMain(); } return; }
  const cols = ['large', 'medium', 'tiles'].includes(t.view) ? Math.max(1, Math.floor(($('#scroll')?.clientWidth || 600) / ({ large: 122, medium: 94, tiles: 262 }[t.view]))) : 1;
  if (k === 'ArrowDown') { handled(); return moveFocus(cols, e); }
  if (k === 'ArrowUp') { handled(); return moveFocus(-cols, e); }
  if (k === 'ArrowRight' && cols > 1) { handled(); return moveFocus(1, e); }
  if (k === 'ArrowLeft' && cols > 1) { handled(); return moveFocus(-1, e); }
  if (k === 'Home') { handled(); return moveFocus(-1e6, e); }
  if (k === 'End') { handled(); return moveFocus(1e6, e); }
  if (k.length === 1 && !mod && !e.altKey) { const it = CURRENT.find(i => i.node.name.toLowerCase().startsWith(k.toLowerCase())); if (it) { clickItem(it.path, {}); } }
}

// ------------------------------------------------------------------ deep links (#theme=light&loc=/Volumes/MyDATA&view=content ...)
function applyHash() {
  const h = new URLSearchParams(location.hash.slice(1));
  if (h.get('theme')) S.theme = h.get('theme');
  if (h.get('win') === 'mac') S.winStyle = 'mac';
  if (h.get('frame') === '0') S.frame = false;
  if (h.get('max') === '1') S.max = true;
  if (h.get('letters') === '0') S.letters = false;
  const t = tab();
  if (h.get('loc')) { t.hist = [h.get('loc')]; t.i = 0; }
  if (h.get('view')) t.view = h.get('view');
  if (h.get('details') === '1') S.details = true;
  if (h.get('expand')) h.get('expand').split(',').forEach(p => S.expanded.add(p));
  if (h.get('tabs')) h.get('tabs').split(',').forEach(l => S.tabs.push(newTab(l)));
  if (h.get('search')) S.search = h.get('search');
  setTimeout(() => {
    const l = loc();
    if (h.get('sel')) { render(); const names = h.get('sel').split(','); t.sel = new Set(CURRENT.filter(i => names.includes(i.node.name)).map(i => i.path)); t.focus = [...t.sel][0]; render(); }
    if (h.get('ctx')) { const el = h.get('ctx') === 'bg' ? $('#scroll') : document.querySelector('#main .it.sel'); if (el) { const r = el.getBoundingClientRect(); const ev = { preventDefault() {}, clientX: r.left + (h.get('ctx') === 'bg' ? r.width * .55 : 160), clientY: r.top + (h.get('ctx') === 'bg' ? r.height * .55 : r.height - 6) }; contextMenu(ev, h.get('ctx') !== 'bg'); } }
    if (h.get('menu')) { const b = $(`[data-menu="${h.get('menu')}"]`); b && menuFor(h.get('menu'), b); }
    if (h.get('addr') === '1') { S.addrEdit = true; renderAddress(); }
    const d = h.get('dialog');
    if (d === 'onboarding') onboardingDialog();
    if (d === 'settings') settingsDialog();
    if (d === 'properties') propertiesDialog();
    if (d === 'quicklook') quickLook();
    if (d === 'conflict') { S.clip = { cut: false, items: [{ path: '/Volumes/MyDATA/build_output.txt', node: getNode('/Volumes/MyDATA/build_output.txt') }] }; const dest = HOME + '/Desktop'; getNode(dest).children.push(file('build_output.txt', 120 * KB, '2026-10-20T09:00')); t.hist = [dest]; t.i = 0; render(); paste(); }
    if (d === 'copy') { S.clip = { cut: false, items: [{ path: '/Volumes/MyDATA/Db', node: getNode('/Volumes/MyDATA/Db') }] }; t.hist = [HOME + '/Desktop']; t.i = 0; render(); progressDialog(S.clip.items, HOME + '/Desktop', () => {}); setTimeout(() => clearInterval(progTimer), +(h.get('stop') || 700)); }
    if (h.get('rename')) { render(); startRename(); }
  }, 0);
}

document.addEventListener('DOMContentLoaded', init);
})();
