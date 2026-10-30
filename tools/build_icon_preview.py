#!/usr/bin/env python3
"""Builds icons/preview.html - a contact sheet of every icon on light + dark."""
import os, json

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ICONS = os.path.join(ROOT, "icons")
sprite = open(os.path.join(ICONS, "sprite.svg"), encoding="utf-8").read()
man = json.load(open(os.path.join(ICONS, "manifest.json"), encoding="utf-8"))


def cell(sym, label, sizes):
    svgs = "".join(f'<svg width="{s}" height="{s}"><use href="#{sym}"/></svg>' for s in sizes)
    return f'<div class="c"><div class="row">{svgs}</div><span>{label}</span></div>'


sections = []
for cat, names in man["colored"].items():
    cells = "".join(cell(f"i-{n}", n, (48, 32, 20, 16)) for n in names)
    sections.append(f"<h2>{cat}</h2><div class='g'>{cells}</div>")
mono_cells = "".join(cell(f"u-{n}", n, (20, 16)) for n in man["mono"])
sections.append(f"<h2>ui (monochrome, currentColor)</h2><div class='g mono'>{mono_cells}</div>")
body = "".join(sections)

html = f"""<!DOCTYPE html><html><head><meta charset="utf-8"><title>Khoj icon set</title>
<style>
body{{margin:0;font:12px/16px "Segoe UI Variable Text","Segoe UI",Selawik,Inter,system-ui,sans-serif}}
.theme{{padding:20px 28px}} .light{{background:#fff;color:#1b1b1b}} .dark{{background:#191919;color:#fff}}
h1{{font-size:20px;line-height:28px;font-weight:600;margin:0 0 4px}} h2{{font-size:14px;font-weight:600;margin:18px 0 8px;text-transform:capitalize}}
.g{{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}}
.c{{border-radius:8px;padding:10px;display:flex;flex-direction:column;gap:6px}}
.light .c{{background:#f6f6f6}} .dark .c{{background:#232323}}
.row{{display:flex;align-items:flex-end;gap:10px}} .c span{{opacity:.75}}
.top{{display:flex;align-items:center;gap:14px}}
</style></head><body>{sprite}
<div class="theme light"><div class="top"><svg width="72" height="72"><use href="#app-icon"/></svg><div><h1>Khoj icon set — light</h1><div>Original artwork, Windows-11-inspired. 48 / 32 / 20 / 16 px.</div></div></div>{body}</div>
<div class="theme dark"><h1>Khoj icon set — dark</h1>{body}</div>
</body></html>"""
open(os.path.join(ICONS, "preview.html"), "w", encoding="utf-8").write(html)
print("wrote icons/preview.html")
