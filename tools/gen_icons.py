#!/usr/bin/env python3
"""
Khoj icon generator.
Writes every icon of the kit as an individual SVG file plus one SVG sprite
(<symbol> per icon) that the prototype inlines.

All artwork here is ORIGINAL (drawn for this project). It is styled to *feel*
like a modern Fluent / Windows 11 desktop, but it does not copy Microsoft's
shell icons, logos or the Windows flag.

Usage:  python3 tools/gen_icons.py            (run from the kit root)
"""
import os, json, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "icons")

COLOR = {}   # name -> (category, viewBox, inner)
MONO = {}    # name -> inner (20x20, stroke=currentColor)


def colored(cat, name, inner, vb="0 0 48 48"):
    COLOR[name] = (cat, vb, inner)


def ids(name, s):
    """Namespace gradient ids so many icons can live in one HTML document."""
    return s.replace("#G", f"#{name}-").replace('id="G', f'id="{name}-')


# ---------------------------------------------------------------- helpers
def lg(id_, c1, c2, x1=0, y1=0, x2=0, y2=1):
    return (f'<linearGradient id="G{id_}" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}">'
            f'<stop offset="0" stop-color="{c1}"/><stop offset="1" stop-color="{c2}"/></linearGradient>')


FOLDER_BACK = 'M4 12.5A3.5 3.5 0 0 1 7.5 9h10.6a3.5 3.5 0 0 1 2.47 1.03l2.4 2.4A3.5 3.5 0 0 0 25.44 13.5H40.5A3.5 3.5 0 0 1 44 17v19.5a3.5 3.5 0 0 1-3.5 3.5h-33A3.5 3.5 0 0 1 4 36.5z'
FOLDER_FRONT = 'M4 20.5A3.5 3.5 0 0 1 7.5 17h33a3.5 3.5 0 0 1 3.5 3.5v16a3.5 3.5 0 0 1-3.5 3.5h-33A3.5 3.5 0 0 1 4 36.5z'


def folder(name, front=("#FFDB7A", "#FFC23A"), back=("#E8A62C", "#D58F14"), glyph=""):
    inner = (
        "<defs>" + lg("b", *back) + lg("f", *front) + "</defs>"
        f'<path d="{FOLDER_BACK}" fill="url(#Gb)"/>'
        '<rect x="8" y="13.5" width="32" height="8" rx="1.5" fill="#FFFFFF"/>'
        '<rect x="8" y="13.5" width="32" height="8" rx="1.5" fill="#000" opacity=".06"/>'
        f'<path d="{FOLDER_FRONT}" fill="url(#Gf)"/>'
        '<path d="M4 20.5A3.5 3.5 0 0 1 7.5 17h33a3.5 3.5 0 0 1 3.5 3.5v.9H4z" fill="#FFF" opacity=".35"/>'
        + glyph
    )
    colored("folders", name, ids(name, inner))


# ---------------------------------------------------------------- folders
folder("folder")
folder("folder-open",
       glyph='<path d="M4 36.5V22l3-3h34l3 3" fill="none" stroke="#C98612" stroke-width="1" opacity=".5"/>')
folder("folder-empty", front=("#FFE7A6", "#FFD36B"))
folder("folder-pinned", glyph=(
    '<circle cx="36" cy="33" r="7.5" fill="#2F7DE1"/>'
    '<path d="M33.6 29.6h4.8l-.7 3 1.6 1.4h-6.6l1.6-1.4zM36 34v3.6" fill="#FFF" stroke="#FFF" stroke-width="1" stroke-linejoin="round"/>'))
folder("folder-shared", glyph=(
    '<circle cx="36" cy="33" r="7.5" fill="#1F9D55"/>'
    '<circle cx="34" cy="31.5" r="1.8" fill="#FFF"/><circle cx="38.4" cy="31.8" r="1.5" fill="#FFF"/>'
    '<path d="M30.8 36.6c.4-2 1.7-3 3.2-3s2.8 1 3.2 3zM36.6 36.6c.2-1.5 1.1-2.4 2.3-2.4 1.1 0 2 .8 2.3 2.4z" fill="#FFF"/>'))
folder("folder-system", front=("#C9D3E0", "#AAB7C8"), back=("#8D9BB0", "#7A889D"))


# ---------------------------------------------------------------- places
colored("places", "home", ids("home",
    "<defs>" + lg("roof", "#FF9D4D", "#E2622A") + lg("body", "#FFFFFF", "#E3E3E3") + lg("door", "#4BA3F0", "#1C6FCC") + "</defs>"
    '<path d="M9 22.5 24 10l15 12.5V39a2.5 2.5 0 0 1-2.5 2.5h-25A2.5 2.5 0 0 1 9 39z" fill="url(#Gbody)" stroke="#BDBDBD" stroke-width="1"/>'
    '<path d="M4.6 23.2 22.1 8.6a3 3 0 0 1 3.8 0l17.5 14.6a1.6 1.6 0 0 1-1 2.8h-.4a2 2 0 0 1-1.3-.5L24 12.4 7.3 25.5a2 2 0 0 1-1.3.5h-.4a1.6 1.6 0 0 1-1-2.8z" fill="url(#Groof)"/>'
    '<rect x="20" y="28" width="8" height="13.5" rx="1.5" fill="url(#Gdoor)"/>'))

colored("places", "gallery", ids("gallery",
    "<defs>" + lg("back", "#9AD8FF", "#5BB6F5") + lg("sky", "#5EC2FF", "#1E7FE0") + lg("hill", "#7CE0A5", "#20A35B") + "</defs>"
    '<rect x="10" y="5" width="32" height="26" rx="4" fill="url(#Gback)"/>'
    '<rect x="6" y="11" width="34" height="30" rx="4.5" fill="url(#Gsky)"/>'
    '<circle cx="30.5" cy="19.5" r="3.6" fill="#FFE27A"/>'
    '<path d="M6 34.5 16.5 24a2 2 0 0 1 2.8 0L30 34.7l3.4-3.3a2 2 0 0 1 2.8 0L40 35.2v1.3a4.5 4.5 0 0 1-4.5 4.5h-25A4.5 4.5 0 0 1 6 36.5z" fill="url(#Ghill)"/>'))

colored("places", "desktop", ids("desktop",
    "<defs>" + lg("scr", "#56C0FF", "#0B66D0", 0, 0, 1, 1) + lg("bez", "#4A4F57", "#2C3036") + "</defs>"
    '<rect x="3.5" y="7" width="41" height="28" rx="3.5" fill="url(#Gbez)"/>'
    '<rect x="6" y="9.5" width="36" height="23" rx="1.8" fill="url(#Gscr)"/>'
    '<path d="M6 27c6-4.5 13-6 20-3.5S38 26 42 24v6.7a1.8 1.8 0 0 1-1.8 1.8H7.8A1.8 1.8 0 0 1 6 30.7z" fill="#FFF" opacity=".25"/>'
    '<path d="M19 35h10l1.2 5H17.8z" fill="#9AA1AB"/><rect x="14" y="39.5" width="20" height="3" rx="1.5" fill="#B9C0C9"/>'))

colored("places", "downloads", ids("downloads",
    "<defs>" + lg("arr", "#4ADE95", "#119A54") + lg("tray", "#D7DCE2", "#A9B1BC") + "</defs>"
    '<path d="M20 5.5h8a1.5 1.5 0 0 1 1.5 1.5v13h7.1a1.2 1.2 0 0 1 .86 2.04L24.86 34.2a1.2 1.2 0 0 1-1.72 0L9.54 22.04A1.2 1.2 0 0 1 10.4 20h7.1V7A1.5 1.5 0 0 1 19 5.5z" fill="url(#Garr)"/>'
    '<rect x="6" y="37" width="36" height="5.5" rx="2.75" fill="url(#Gtray)"/>'))

colored("places", "documents", ids("documents",
    "<defs>" + lg("pg", "#FFFFFF", "#ECEFF3") + lg("band", "#6E9BF2", "#3C6DD8") + "</defs>"
    '<path d="M11 4.5h18.5L39 14v28a2.5 2.5 0 0 1-2.5 2.5h-25A2.5 2.5 0 0 1 9 42V7a2.5 2.5 0 0 1 2-2.5z" fill="url(#Gpg)" stroke="#B9C0CA"/>'
    '<path d="M29.5 4.5V12a2 2 0 0 0 2 2H39" fill="#DDE3EA" stroke="#B9C0CA"/>'
    '<rect x="14" y="19" width="20" height="3" rx="1.5" fill="url(#Gband)"/>'
    '<rect x="14" y="25" width="20" height="2.2" rx="1.1" fill="#9FB3D1"/><rect x="14" y="30" width="20" height="2.2" rx="1.1" fill="#9FB3D1"/>'
    '<rect x="14" y="35" width="13" height="2.2" rx="1.1" fill="#9FB3D1"/>'))

colored("places", "pictures", ids("pictures",
    "<defs>" + lg("sky", "#7FD6FF", "#2C9CEB") + lg("m1", "#3FBF77", "#1E8A4C") + lg("m2", "#7EDB9F", "#3BAE69") + "</defs>"
    '<rect x="4.5" y="8" width="39" height="32" rx="4.5" fill="url(#Gsky)"/>'
    '<circle cx="15" cy="17" r="4" fill="#FFE27A"/>'
    '<path d="M4.5 33 17 21.5a2 2 0 0 1 2.7 0L36 36.5V40H9a4.5 4.5 0 0 1-4.5-4.5z" fill="url(#Gm1)"/>'
    '<path d="M22 40 32.3 29.6a2 2 0 0 1 2.8 0l8.4 8.1V35.5A4.5 4.5 0 0 1 39 40z" fill="url(#Gm2)"/>'))

colored("places", "music", ids("music",
    "<defs>" + lg("c", "#FF9A62", "#E8336D", 0, 0, 1, 1) + "</defs>"
    '<circle cx="24" cy="24" r="19.5" fill="url(#Gc)"/>'
    '<path d="M21 31.2V15.6l11-2.6v14.6" fill="none" stroke="#FFF" stroke-width="2.6" stroke-linejoin="round"/>'
    '<ellipse cx="18.2" cy="31.6" rx="3.6" ry="3" fill="#FFF"/><ellipse cx="29.2" cy="28" rx="3.6" ry="3" fill="#FFF"/>'))

colored("places", "videos", ids("videos",
    "<defs>" + lg("v", "#A97BF0", "#5E35C2", 0, 0, 1, 1) + "</defs>"
    '<rect x="4.5" y="9" width="39" height="30" rx="5" fill="url(#Gv)"/>'
    '<g fill="#FFF" opacity=".35"><rect x="8" y="12" width="3" height="3" rx=".8"/><rect x="8" y="22.5" width="3" height="3" rx=".8"/><rect x="8" y="33" width="3" height="3" rx=".8"/>'
    '<rect x="37" y="12" width="3" height="3" rx=".8"/><rect x="37" y="22.5" width="3" height="3" rx=".8"/><rect x="37" y="33" width="3" height="3" rx=".8"/></g>'
    '<path d="M20.5 17.6a1.2 1.2 0 0 1 1.8-1l9.2 5.5a1.2 1.2 0 0 1 0 2l-9.2 5.5a1.2 1.2 0 0 1-1.8-1z" fill="#FFF"/>'))

colored("places", "this-mac", ids("this-mac",
    "<defs>" + lg("scr", "#5CC6FF", "#0D63CF", 0, 0, 1, 1) + lg("base", "#D9DEE5", "#A7AFBA") + "</defs>"
    '<rect x="7" y="8" width="34" height="23.5" rx="3" fill="#3B4048"/>'
    '<rect x="9.2" y="10.2" width="29.6" height="19.1" rx="1.5" fill="url(#Gscr)"/>'
    '<path d="M9.2 24.5c5-3.6 10.5-4.4 16-2.4s9.7 1.4 13.6-.4v6.1a1.5 1.5 0 0 1-1.5 1.5H10.7a1.5 1.5 0 0 1-1.5-1.5z" fill="#FFF" opacity=".25"/>'
    '<path d="M3 33.5h42l-2 4.2a3 3 0 0 1-2.7 1.8H7.7A3 3 0 0 1 5 37.7z" fill="url(#Gbase)"/>'
    '<rect x="19.5" y="33.5" width="9" height="1.6" rx=".8" fill="#8D96A3"/>'))

colored("places", "network", ids("network",
    "<defs>" + lg("g", "#5EC8FF", "#1667D8", 0, 0, 1, 1) + "</defs>"
    '<circle cx="24" cy="21" r="15" fill="url(#Gg)"/>'
    '<g fill="none" stroke="#FFF" stroke-width="1.6" opacity=".9"><ellipse cx="24" cy="21" rx="6.5" ry="15"/><path d="M9 21h30M11 13.5h26M11 28.5h26"/></g>'
    '<path d="M24 36v4" stroke="#8C96A3" stroke-width="2"/><rect x="14" y="40" width="20" height="3.5" rx="1.75" fill="#A9B1BC"/>'))

colored("places", "icloud", ids("icloud",
    "<defs>" + lg("c", "#8FD3FF", "#2C86EE") + "</defs>"
    '<path d="M14 38a9 9 0 0 1-1.3-17.9A12 12 0 0 1 35.6 17 10.5 10.5 0 0 1 35 38z" fill="url(#Gc)"/>'
    '<path d="M14 38a9 9 0 0 1-1.3-17.9A12 12 0 0 1 35.6 17" fill="none" stroke="#FFF" stroke-width="1.4" opacity=".45"/>'))

colored("places", "trash", ids("trash",
    "<defs>" + lg("b", "#C9D2DC", "#8C99A8") + lg("l", "#E3E8EE", "#AEB9C6") + "</defs>"
    '<path d="M10.5 15h27l-2.2 24.2A3 3 0 0 1 32.3 42H15.7a3 3 0 0 1-3-2.8z" fill="url(#Gb)"/>'
    '<g stroke="#FFF" stroke-width="2" stroke-linecap="round" opacity=".7"><path d="M18.5 20.5 19 36.5M24 20.5v16M29.5 20.5 29 36.5"/></g>'
    '<rect x="7" y="10" width="34" height="5.5" rx="2.2" fill="url(#Gl)"/>'
    '<path d="M19.5 10V8.4A2.4 2.4 0 0 1 21.9 6h4.2a2.4 2.4 0 0 1 2.4 2.4V10" fill="none" stroke="#AEB9C6" stroke-width="2"/>'))

colored("places", "trash-full", ids("trash-full",
    "<defs>" + lg("b", "#C9D2DC", "#8C99A8") + lg("l", "#E3E8EE", "#AEB9C6") + "</defs>"
    '<path d="M10.5 15h27l-2.2 24.2A3 3 0 0 1 32.3 42H15.7a3 3 0 0 1-3-2.8z" fill="url(#Gb)"/>'
    '<path d="M13 15 15.5 6.5l6 3 3-5 4 6 6-2.5L36 15z" fill="#FFF" stroke="#C3CBD5"/>'
    '<rect x="7" y="13" width="34" height="5" rx="2.2" fill="url(#Gl)"/>'
    '<g stroke="#FFF" stroke-width="2" stroke-linecap="round" opacity=".7"><path d="M18.5 22.5 19 36.5M24 22.5v14M29.5 22.5 29 36.5"/></g>'))

colored("places", "applications", ids("applications",
    "<defs>" + lg("t", "#8A6BFF", "#3F51E8", 0, 0, 1, 1) + "</defs>"
    '<rect x="5" y="5" width="38" height="38" rx="9" fill="url(#Gt)"/>'
    '<path d="M16 15.5 21.5 26h-11z" fill="#FFD166"/>'
    '<circle cx="31.5" cy="20.5" r="5.5" fill="#6EE7B7"/>'
    '<rect x="11" y="29" width="10.5" height="10.5" rx="2.5" fill="#FFFFFF"/>'
    '<path d="M31.5 29v10.5M26.25 34.25h10.5" stroke="#FFF" stroke-width="3" stroke-linecap="round"/>'))

colored("places", "recent", ids("recent",
    "<defs>" + lg("c", "#62C3FF", "#1D6FDB", 0, 0, 1, 1) + "</defs>"
    '<circle cx="24" cy="24" r="19" fill="url(#Gc)"/>'
    '<circle cx="24" cy="24" r="14.5" fill="#FFF"/>'
    '<path d="M24 14.5V24l6.5 4" fill="none" stroke="#1D6FDB" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'))

colored("places", "favorites", ids("favorites",
    "<defs>" + lg("s", "#FFD86B", "#F5A300", 0, 0, 1, 1) + "</defs>"
    '<path d="M24 5.5l5.4 11.3 12.4 1.6-9.1 8.6 2.3 12.3L24 33.3l-11 6 2.3-12.3-9.1-8.6 12.4-1.6z" fill="url(#Gs)" stroke="#E09400" stroke-linejoin="round"/>'))


# ---------------------------------------------------------------- drives
def slab(name, led="#3BD16F", badge=""):
    inner = (
        "<defs>" + lg("top", "#F4F6F8", "#D9DEE4") + lg("front", "#C8CED6", "#9AA3AE") + "</defs>"
        '<path d="M8.5 22h31l3.5 7.5H5z" fill="url(#Gtop)" stroke="#AEB6C0" stroke-width=".8" stroke-linejoin="round"/>'
        '<rect x="5" y="29.5" width="38" height="10" rx="2.2" fill="url(#Gfront)"/>'
        '<rect x="5" y="29.5" width="38" height="1.2" fill="#FFF" opacity=".5"/>'
        f'<circle cx="37.5" cy="34.6" r="1.7" fill="{led}"/>'
        '<rect x="9" y="33.6" width="14" height="2" rx="1" fill="#7F8995" opacity=".55"/>'
        + badge
    )
    colored("drives", name, ids(name, inner))


slab("drive-system", badge=(
    '<rect x="6" y="5" width="17" height="15" rx="3.5" fill="#1D72E0"/>'
    '<rect x="9" y="8.4" width="11" height="6.6" rx="1" fill="#FFF"/>'
    '<rect x="8" y="16.2" width="13" height="1.6" rx=".8" fill="#FFF"/>'))
slab("drive-external", led="#4FA3FF", badge=(
    '<path d="M30 6.5h7a1.5 1.5 0 0 1 1.5 1.5v6.5h-10V8A1.5 1.5 0 0 1 30 6.5z" fill="#6B7684"/>'
    '<rect x="31" y="8.6" width="1.8" height="2.6" fill="#FFF"/><rect x="34.7" y="8.6" width="1.8" height="2.6" fill="#FFF"/>'
    '<path d="M33.5 14.5v5.5" stroke="#6B7684" stroke-width="2"/>'))
slab("drive-network", led="#3BD16F", badge=(
    '<path d="M24 39.5v4.5M12 44h24" stroke="#5F6B79" stroke-width="2" stroke-linecap="round"/>'
    '<circle cx="24" cy="12" r="7" fill="#1D72E0"/><g fill="none" stroke="#FFF" stroke-width="1.2"><ellipse cx="24" cy="12" rx="3" ry="7"/><path d="M17 12h14"/></g>'))
colored("drives", "drive-usb", ids("drive-usb",
    "<defs>" + lg("b", "#4CA6FF", "#1665CC", 0, 0, 1, 1) + lg("m", "#E9EDF1", "#B4BCC6") + "</defs>"
    '<rect x="14" y="4.5" width="20" height="13" rx="1.5" fill="url(#Gm)" stroke="#9AA3AE" stroke-width=".8"/>'
    '<rect x="18" y="8" width="3.5" height="3.5" fill="#7F8995"/><rect x="26.5" y="8" width="3.5" height="3.5" fill="#7F8995"/>'
    '<rect x="11" y="16.5" width="26" height="27" rx="5" fill="url(#Gb)"/>'
    '<circle cx="24" cy="35.5" r="2.4" fill="#FFF" opacity=".75"/>'))
colored("drives", "disk-image", ids("disk-image",
    "<defs>" + lg("b", "#FFFFFF", "#DCE1E7") + lg("d", "#E8ECF1", "#B7C0CB", 0, 0, 1, 1) + "</defs>"
    '<rect x="6" y="6" width="36" height="36" rx="6" fill="url(#Gb)" stroke="#B3BCC7"/>'
    '<circle cx="24" cy="24" r="12.5" fill="url(#Gd)" stroke="#9AA4B1"/>'
    '<circle cx="24" cy="24" r="3.4" fill="#FFF" stroke="#9AA4B1"/>'
    '<path d="M16.5 17.5a10 10 0 0 1 5-3.2" stroke="#FFF" stroke-width="2" fill="none" stroke-linecap="round"/>'))


# ---------------------------------------------------------------- files
PAGE = 'M12 4.5h17L38.5 14v28a2.5 2.5 0 0 1-2.5 2.5H12A2.5 2.5 0 0 1 9.5 42V7A2.5 2.5 0 0 1 12 4.5z'
FOLD = 'M29 4.5V12a2 2 0 0 0 2 2h7.5'


def page(name, extra="", label=None, color="#6B7684"):
    lab = ""
    if label:
        w = 6 + 5.2 * len(label)
        lab = (f'<rect x="5" y="26" width="{w:.1f}" height="12" rx="2.2" fill="{color}"/>'
               f'<text x="{5 + w/2:.1f}" y="34.6" text-anchor="middle" font-family="Segoe UI, Selawik, Inter, Arial, sans-serif" '
               f'font-size="8.4" font-weight="700" fill="#FFF">{label}</text>')
    inner = (
        "<defs>" + lg("pg", "#FFFFFF", "#F0F2F5") + "</defs>"
        f'<path d="{PAGE}" fill="url(#Gpg)" stroke="#B9C0CA"/>'
        f'<path d="{FOLD}" fill="#E1E6EC" stroke="#B9C0CA"/>' + extra + lab
    )
    colored("files", name, ids(name, inner))


LINES = ''.join(f'<rect x="14" y="{y}" width="{w}" height="2" rx="1" fill="#A9B3C0"/>' for y, w in [(18, 14), (22.5, 20), (27, 20), (31.5, 20), (36, 12)])
page("file-generic")
page("file-text", LINES)
page("file-pdf", '<path d="M17 14c3 6 7 11 14 14M18 26c4-2 9-6 11-12" stroke="#E5534B" stroke-width="1.6" fill="none" opacity=".55"/>', "PDF", "#D93A2F")
page("file-doc", LINES.replace("#A9B3C0", "#9DB5DE"), "DOC", "#2F6BD8")
page("file-sheet",
     '<g fill="none" stroke="#5DB37E" stroke-width="1.3"><rect x="14" y="16" width="20" height="22" rx="1"/><path d="M14 21.5h20M14 27h20M14 32.5h20M21 16v22M27.5 16v22"/></g>',
     "XLS", "#1E8A4C")
page("file-slides",
     '<rect x="14" y="16" width="20" height="13" rx="1.5" fill="none" stroke="#F08C4A" stroke-width="1.3"/><path d="M17 26l4-4 3 2.5 4.5-5" stroke="#F08C4A" stroke-width="1.4" fill="none"/>',
     "PPT", "#D9631E")
page("file-image",
     '<rect x="13.5" y="17" width="21" height="17" rx="2" fill="#5AB8F5"/><circle cx="19" cy="22" r="2.2" fill="#FFE27A"/>'
     '<path d="M13.5 31.5 20.5 25a1.4 1.4 0 0 1 1.9 0L30 32l1.8-1.6a1.4 1.4 0 0 1 1.9 0l.8.8V32A2 2 0 0 1 32.5 34h-17a2 2 0 0 1-2-2z" fill="#2FA866"/>')
page("file-video",
     '<rect x="13.5" y="17" width="21" height="17" rx="2.5" fill="#7E52D9"/><path d="M21.5 21.3a.9.9 0 0 1 1.35-.78l5.4 3.2a.9.9 0 0 1 0 1.56l-5.4 3.2a.9.9 0 0 1-1.35-.78z" fill="#FFF"/>')
page("file-audio",
     '<circle cx="24" cy="26" r="9" fill="#EC4F7E"/><path d="M22.4 30v-8.2l5-1.2v6.8" stroke="#FFF" stroke-width="1.5" fill="none"/>'
     '<ellipse cx="21" cy="30.2" rx="1.9" ry="1.5" fill="#FFF"/><ellipse cx="26" cy="27.6" rx="1.9" ry="1.5" fill="#FFF"/>')
page("file-archive",
     '<rect x="20.5" y="4.6" width="7" height="33" fill="#F5B92E"/>'
     + ''.join(f'<rect x="{x}" y="{y}" width="3.5" height="2.4" fill="#8A5A00"/>' for x, y in [(20.5, 7), (24, 10), (20.5, 13), (24, 16), (20.5, 19), (24, 22)])
     + '<rect x="20" y="25.5" width="8" height="8" rx="1.5" fill="#8A5A00"/><rect x="22.2" y="27.6" width="3.6" height="3.4" rx=".6" fill="#F5B92E"/>')
page("file-code",
     '<rect x="13" y="17" width="22" height="18" rx="2.5" fill="#263241"/>'
     '<path d="M19.5 22.5 16.5 26l3 3.5M28.5 22.5l3 3.5-3 3.5M25.4 21.5l-2.8 9" stroke="#7FD4FF" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>')
page("file-font", '<text x="24" y="33" text-anchor="middle" font-family="Georgia, serif" font-size="15" font-weight="700" fill="#4B5563">Aa</text>')
colored("files", "file-app", ids("file-app",
    "<defs>" + lg("a", "#5EC8FF", "#3F51E8", 0, 0, 1, 1) + "</defs>"
    '<rect x="6" y="6" width="36" height="36" rx="9" fill="url(#Ga)"/>'
    '<path d="M24 13l9.5 5.5v11L24 35l-9.5-5.5v-11z" fill="none" stroke="#FFF" stroke-width="2.4" stroke-linejoin="round"/>'
    '<path d="M14.5 18.5 24 24l9.5-5.5M24 24v11" fill="none" stroke="#FFF" stroke-width="2" stroke-linejoin="round" opacity=".8"/>'))
colored("files", "file-alias", ids("file-alias",
    "<defs>" + lg("pg", "#FFFFFF", "#F0F2F5") + "</defs>"
    f'<path d="{PAGE}" fill="url(#Gpg)" stroke="#B9C0CA"/><path d="{FOLD}" fill="#E1E6EC" stroke="#B9C0CA"/>'
    '<rect x="6" y="30" width="13" height="13" rx="2.5" fill="#FFF" stroke="#8C96A3"/>'
    '<path d="M10 39.5c0-4 2-6 6-6M13.8 31l2.6 2.5-2.6 2.6" fill="none" stroke="#1D72E0" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>'))


# ---------------------------------------------------------------- app icon
APP_ICON = (
    '<defs>'
    '<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1B3B8F"/><stop offset=".55" stop-color="#1268C9"/><stop offset="1" stop-color="#18B4E6"/></linearGradient>'
    '<radialGradient id="glow" cx=".3" cy=".2" r=".9"><stop offset="0" stop-color="#FFF" stop-opacity=".28"/><stop offset=".6" stop-color="#FFF" stop-opacity="0"/></radialGradient>'
    '<linearGradient id="fb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F2AE2E"/><stop offset="1" stop-color="#D88C0E"/></linearGradient>'
    '<linearGradient id="ff" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE08A"/><stop offset="1" stop-color="#FFBF2F"/></linearGradient>'
    '<linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E9F7FF" stop-opacity=".95"/><stop offset="1" stop-color="#9ED8FF" stop-opacity=".75"/></linearGradient>'
    '<filter id="sh" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="14" stdDeviation="18" flood-color="#04163D" flood-opacity=".45"/></filter>'
    '<filter id="ish" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#000" flood-opacity=".28"/></filter>'
    '</defs>'
    '<g filter="url(#sh)"><rect x="100" y="100" width="824" height="824" rx="186" fill="url(#bg)"/></g>'
    '<rect x="100" y="100" width="824" height="824" rx="186" fill="url(#glow)"/>'
    '<rect x="101.5" y="101.5" width="821" height="821" rx="184.5" fill="none" stroke="#FFF" stroke-opacity=".18" stroke-width="3"/>'
    '<g filter="url(#ish)">'
    '<path d="M228 338a44 44 0 0 1 44-44h150a44 44 0 0 1 31 13l36 36a44 44 0 0 0 31 13h226a44 44 0 0 1 44 44v330a44 44 0 0 1-44 44H272a44 44 0 0 1-44-44z" fill="url(#fb)"/>'
    '<rect x="282" y="350" width="460" height="110" rx="20" fill="#FFF"/>'
    '<path d="M228 452a44 44 0 0 1 44-44h480a44 44 0 0 1 44 44v278a44 44 0 0 1-44 44H272a44 44 0 0 1-44-44z" fill="url(#ff)"/>'
    '<path d="M228 452a44 44 0 0 1 44-44h480a44 44 0 0 1 44 44v14H228z" fill="#FFF" opacity=".4"/>'
    '</g>'
    '<g filter="url(#ish)">'
    '<path d="M700 690l118 118" stroke="#0C2A63" stroke-width="64" stroke-linecap="round"/>'
    '<path d="M700 690l118 118" stroke="#24467F" stroke-width="40" stroke-linecap="round"/>'
    '<circle cx="610" cy="600" r="138" fill="url(#glass)"/>'
    '<circle cx="610" cy="600" r="138" fill="none" stroke="#FFFFFF" stroke-width="34"/>'
    '<path d="M532 556a92 92 0 0 1 64-50" fill="none" stroke="#FFF" stroke-width="22" stroke-linecap="round" opacity=".9"/>'
    '</g>'
)


# ---------------------------------------------------------------- mono UI icons (20x20)
S = 'fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"'


def mono(name, d_or_inner, raw=False):
    MONO[name] = d_or_inner if raw else f'<path d="{d_or_inner}" {S}/>'


mono("back", "M16 10H4M9 5 4 10l5 5")
mono("forward", "M4 10h12M11 5l5 5-5 5")
mono("up", "M10 16V4M5 9l5-5 5 5")
mono("refresh", "M16.2 10.4a6.2 6.2 0 1 1-1.9-5.1M16.5 3.6v3.6h-3.6")
mono("chevron-right", "M8 5l5 5-5 5")
mono("chevron-left", "M12 5l-5 5 5 5")
mono("chevron-down", "M5 8l5 5 5-5")
mono("chevron-up", "M5 12l5-5 5 5")
mono("search", f'<circle cx="8.6" cy="8.6" r="5.1" {S}/><path d="M12.4 12.4 17 17" {S}/>', True)
mono("new", f'<circle cx="10" cy="10" r="7.2" {S}/><path d="M10 6.6v6.8M6.6 10h6.8" {S}/>', True)
mono("plus", "M10 4v12M4 10h12")
mono("cut", f'<circle cx="6" cy="14.5" r="2.5" {S}/><circle cx="14" cy="14.5" r="2.5" {S}/><path d="M7.6 12.6 14 3M12.4 12.6 6 3" {S}/>', True)
mono("copy", f'<rect x="7" y="6.5" width="9.5" height="11" rx="2" {S}/><path d="M4.5 13.5V5a2.2 2.2 0 0 1 2.2-2.2h6.3" {S}/>', True)
mono("paste", f'<path d="M13 4.2h1.3a1.8 1.8 0 0 1 1.8 1.8v10.2a1.8 1.8 0 0 1-1.8 1.8H5.7a1.8 1.8 0 0 1-1.8-1.8V6a1.8 1.8 0 0 1 1.8-1.8H7" {S}/><rect x="7" y="2.6" width="6" height="3.2" rx="1" {S}/>', True)
mono("rename", f'<rect x="2.6" y="6" width="11.4" height="8" rx="2" {S}/><path d="M16.5 3.5v13M15 3.5h3M15 16.5h3" {S}/>', True)
mono("share", "M8.5 4.2H5.7a2 2 0 0 0-2 2v8.1a2 2 0 0 0 2 2h8.1a2 2 0 0 0 2-2v-2.8M12 3.5h4.5V8M16.5 3.5 9.5 10.5")
mono("delete", "M3.8 5.8h12.4M8 5.8V4.3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.5M5.4 5.8l.75 10a1.6 1.6 0 0 0 1.6 1.5h4.5a1.6 1.6 0 0 0 1.6-1.5l.75-10M8.5 9v5M11.5 9v5")
mono("sort", "M6 15.5V4.5M3 7.5l3-3 3 3M14 4.5v11M11 12.5l3 3 3-3")
mono("view", f'<rect x="3" y="4" width="3.2" height="3.2" rx=".8" {S}/><rect x="3" y="12.8" width="3.2" height="3.2" rx=".8" {S}/><path d="M9.2 5.6H17M9.2 14.4H17" {S}/>', True)
mono("more", '<circle cx="4.5" cy="10" r="1.3" fill="currentColor"/><circle cx="10" cy="10" r="1.3" fill="currentColor"/><circle cx="15.5" cy="10" r="1.3" fill="currentColor"/>', True)
mono("details-pane", f'<rect x="2.8" y="4" width="14.4" height="12" rx="2" {S}/><path d="M12 4v12" {S}/>', True)
mono("preview-pane", f'<rect x="2.8" y="4" width="14.4" height="12" rx="2" {S}/><path d="M12 4v12M13.8 7.5h1.6M13.8 10h1.6" {S}/>', True)
mono("pin", "M12.3 2.8 17.2 7.7M7.8 12.2 3 17M11.4 3.7l4.9 4.9-2.6 1.4-2.3 3.9.4 2.3-7-7 2.3.4 3.9-2.3z")
mono("unpin", "M12.3 2.8 17.2 7.7M7.8 12.2 3 17M11.4 3.7l4.9 4.9-2.6 1.4-2.3 3.9.4 2.3-7-7 2.3.4 3.9-2.3zM3 3l14 14")
mono("close", "M5 5l10 10M15 5 5 15")
mono("minimize", "M4.5 10h11")
mono("maximize", f'<rect x="4.5" y="4.5" width="11" height="11" rx="1.2" {S}/>', True)
mono("restore", f'<rect x="4" y="6.5" width="9.5" height="9.5" rx="1.2" {S}/><path d="M7 4h7.8A1.2 1.2 0 0 1 16 5.2V13" {S}/>', True)
mono("open-with", "M11.5 3.5h5v5M16.5 3.5 10 10M8.5 4.5H5.5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-3")
mono("properties", f'<circle cx="10" cy="10" r="7.2" {S}/><path d="M10 9v4.6" {S}/><circle cx="10" cy="6.6" r=".9" fill="currentColor"/>', True)
mono("terminal", f'<rect x="2.8" y="3.8" width="14.4" height="12.4" rx="2" {S}/><path d="M6 8l2.5 2L6 12M10.5 12.5h3.5" {S}/>', True)
mono("star", "M10 3.2l2 4.2 4.5.6-3.3 3.1.9 4.5-4.1-2.2-4.1 2.2.9-4.5L3.5 8l4.5-.6z")
mono("check", "M4.5 10.5l3.5 3.5 7.5-8")
mono("grid", f'<rect x="3.5" y="3.5" width="5.2" height="5.2" rx="1.2" {S}/><rect x="11.3" y="3.5" width="5.2" height="5.2" rx="1.2" {S}/><rect x="3.5" y="11.3" width="5.2" height="5.2" rx="1.2" {S}/><rect x="11.3" y="11.3" width="5.2" height="5.2" rx="1.2" {S}/>', True)
mono("list", "M7 5h10M7 10h10M7 15h10M3.5 5h.01M3.5 10h.01M3.5 15h.01")
mono("details-view", "M3 4.5h14M3 8.5h14M3 12.5h14M3 16.5h14M8 4.5v12")
mono("tiles", f'<rect x="3" y="3.5" width="5.5" height="5.5" rx="1.2" {S}/><rect x="3" y="11" width="5.5" height="5.5" rx="1.2" {S}/><path d="M11 5h6M11 7.5h4M11 12.5h6M11 15h4" {S}/>', True)
mono("content", f'<rect x="3" y="3.5" width="4.5" height="4.5" rx="1" {S}/><rect x="3" y="12" width="4.5" height="4.5" rx="1" {S}/><path d="M10 4.6h7M10 7h4.5M10 13.1h7M10 15.5h4.5" {S}/>', True)
mono("home", "M3.5 9 10 3.5 16.5 9v7a1 1 0 0 1-1 1H12v-4.5H8V17H4.5a1 1 0 0 1-1-1z")
mono("cloud", "M6 15.5a3.6 3.6 0 0 1-.5-7.2 4.9 4.9 0 0 1 9.4-1.3 4.3 4.3 0 0 1-.4 8.5z")
mono("eye", f'<path d="M2.5 10s2.8-5.5 7.5-5.5S17.5 10 17.5 10 14.7 15.5 10 15.5 2.5 10 2.5 10z" {S}/><circle cx="10" cy="10" r="2.4" {S}/>', True)
mono("filter", "M3.5 4.5h13l-5 6v5l-3-1.5v-3.5z")
mono("undo", "M7 5.5 3.5 9 7 12.5M3.5 9h8.5a4.5 4.5 0 0 1 0 9H9")
mono("redo", "M13 5.5 16.5 9 13 12.5M16.5 9H8a4.5 4.5 0 0 0 0 9h3")
mono("select-all", f'<rect x="3" y="3" width="14" height="14" rx="2" {S} stroke-dasharray="2.2 2"/><path d="M6.8 10.2l2.2 2.2 4.2-4.6" {S}/>', True)
mono("zip", f'<rect x="4" y="2.8" width="12" height="14.4" rx="2" {S}/><path d="M10 2.8v2M10 6.2v1.6M10 9.2v1.6" {S}/><rect x="8.4" y="11.8" width="3.2" height="3" rx=".8" {S}/>', True)
mono("extract", "M10 3v9M6.5 8.5 10 12l3.5-3.5M4 13.5v1.8A1.7 1.7 0 0 0 5.7 17h8.6a1.7 1.7 0 0 0 1.7-1.7v-1.8")
mono("new-folder", "M2.8 6.2a1.7 1.7 0 0 1 1.7-1.7h3.3l1.7 1.7h6a1.7 1.7 0 0 1 1.7 1.7v6.9a1.7 1.7 0 0 1-1.7 1.7H4.5a1.7 1.7 0 0 1-1.7-1.7zM10 8.6v4.6M7.7 10.9h4.6")
mono("new-file", "M11.5 2.8H6a1.6 1.6 0 0 0-1.6 1.6v11.2A1.6 1.6 0 0 0 6 17.2h8a1.6 1.6 0 0 0 1.6-1.6V6.9zM11.5 2.8v4.1h4.1M10 9.4v5M7.5 11.9h5")
mono("folder", "M2.8 6.2a1.7 1.7 0 0 1 1.7-1.7h3.3l1.7 1.7h6a1.7 1.7 0 0 1 1.7 1.7v6.9a1.7 1.7 0 0 1-1.7 1.7H4.5a1.7 1.7 0 0 1-1.7-1.7z")
mono("link", "M8.6 11.4a3 3 0 0 0 4.2 0l2.6-2.6a3 3 0 0 0-4.2-4.2l-.9.9M11.4 8.6a3 3 0 0 0-4.2 0l-2.6 2.6a3 3 0 0 0 4.2 4.2l.9-.9")
mono("tag", f'<path d="M3 4.6V9.3a1.6 1.6 0 0 0 .47 1.13l5.9 5.9a1.6 1.6 0 0 0 2.26 0l4.27-4.27a1.6 1.6 0 0 0 0-2.26l-5.9-5.9A1.6 1.6 0 0 0 8.87 3.4H4.2A1.2 1.2 0 0 0 3 4.6z" {S}/><circle cx="6.8" cy="7.2" r="1.1" fill="currentColor"/>', True)
mono("lock", f'<rect x="4.5" y="8.8" width="11" height="8.2" rx="1.8" {S}/><path d="M7 8.8V6.5a3 3 0 0 1 6 0v2.3" {S}/>', True)
mono("settings", f'<circle cx="10" cy="10" r="2.6" {S}/><path d="M10 2.6v2M10 15.4v2M2.6 10h2M15.4 10h2M4.8 4.8l1.4 1.4M13.8 13.8l1.4 1.4M4.8 15.2l1.4-1.4M13.8 6.2l1.4-1.4" {S}/>', True)
mono("sun", f'<circle cx="10" cy="10" r="3.2" {S}/><path d="M10 2.5v1.6M10 15.9v1.6M2.5 10h1.6M15.9 10h1.6M4.7 4.7l1.1 1.1M14.2 14.2l1.1 1.1M4.7 15.3l1.1-1.1M14.2 5.8l1.1-1.1" {S}/>', True)
mono("moon", "M15.8 12.3A6.6 6.6 0 0 1 7.7 4.2a6.6 6.6 0 1 0 8.1 8.1z")
mono("tab-new", "M10 5v10M5 10h10")
mono("drive", f'<rect x="2.8" y="9.5" width="14.4" height="6" rx="1.5" {S}/><path d="M4.8 9.5 6.4 4.8h7.2l1.6 4.7" {S}/><circle cx="14" cy="12.5" r=".9" fill="currentColor"/>', True)
mono("eject", "M10 4.5 4.5 11h11zM4.5 15h11")
mono("quicklook", f'<path d="M2.5 10s2.8-5.5 7.5-5.5S17.5 10 17.5 10 14.7 15.5 10 15.5 2.5 10 2.5 10z" {S}/><circle cx="10" cy="10" r="2.4" {S}/>', True)
mono("alert", "M10 3.2 17.4 16H2.6zM10 8v3.6M10 13.8v.01")
mono("info", f'<circle cx="10" cy="10" r="7.2" {S}/><path d="M10 9v4.6" {S}/><circle cx="10" cy="6.6" r=".9" fill="currentColor"/>', True)
mono("keyboard", f'<rect x="2.5" y="5" width="15" height="10" rx="2" {S}/><path d="M5.5 8h.01M8.5 8h.01M11.5 8h.01M14.5 8h.01M6.5 12h7" {S}/>', True)


# ---------------------------------------------------------------- write files
def write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)


manifest = {"colored": {}, "mono": [], "app": "app-icon/khoj-app-icon.svg"}
symbols = []

for name, (cat, vb, inner) in COLOR.items():
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" width="48" height="48">{inner}</svg>\n'
    write(os.path.join(OUT, cat, f"{name}.svg"), svg)
    manifest["colored"].setdefault(cat, []).append(name)
    symbols.append(f'<symbol id="i-{name}" viewBox="{vb}">{inner}</symbol>')

for name, inner in MONO.items():
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="20" height="20" color="#1b1b1b">{inner}</svg>\n'
    write(os.path.join(OUT, "ui", f"{name}.svg"), svg)
    manifest["mono"].append(name)
    symbols.append(f'<symbol id="u-{name}" viewBox="0 0 20 20">{inner}</symbol>')

app_svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">{APP_ICON}</svg>\n'
write(os.path.join(OUT, "app-icon", "khoj-app-icon.svg"), app_svg)
app_inner = APP_ICON.replace('id="', 'id="app-').replace("url(#", "url(#app-")
symbols.append('<symbol id="app-icon" viewBox="0 0 1024 1024">' + app_inner + '</symbol>')

sprite = '<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true">' + "".join(symbols) + "</svg>\n"
write(os.path.join(OUT, "sprite.svg"), sprite)
write(os.path.join(OUT, "manifest.json"), json.dumps(manifest, indent=2))

print(f"colored icons: {len(COLOR)}  mono icons: {len(MONO)}  -> {OUT}")
