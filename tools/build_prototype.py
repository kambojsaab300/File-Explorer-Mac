#!/usr/bin/env python3
"""Inlines tokens.css + app.css + app.js + the icon sprite into one
self-contained file: design/prototype/index.html (opens by double-click, works offline)."""
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = os.path.join(ROOT, "design", "prototype")
read = lambda *p: open(os.path.join(*p), encoding="utf-8").read()

html = read(P, "src", "shell.html")
html = html.replace("/*@@TOKENS@@*/", read(ROOT, "design", "tokens", "tokens.css"))
html = html.replace("/*@@APPCSS@@*/", read(P, "src", "app.css"))
html = html.replace("<!--@@SPRITE@@-->", read(ROOT, "icons", "sprite.svg"))
html = html.replace("/*@@APPJS@@*/", read(P, "src", "app.js"))
open(os.path.join(P, "index.html"), "w", encoding="utf-8").write(html)
print(f"design/prototype/index.html  ({len(html)//1024} KB)")
