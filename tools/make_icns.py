#!/usr/bin/env python3
"""Builds the macOS icon set from icons/app-icon/khoj-1024.png:
   - AppIcon.iconset/ (Apple naming, for `iconutil -c icns` on a Mac)
   - Khoj.icns         (built with Pillow, works on any OS)
   - png/ sizes 16..1024 for docs, Electron and the DMG background."""
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APP = os.path.join(ROOT, "icons", "app-icon")
src = Image.open(os.path.join(APP, "khoj-1024.png")).convert("RGBA")

png_dir = os.path.join(APP, "png")
iconset = os.path.join(APP, "AppIcon.iconset")
os.makedirs(png_dir, exist_ok=True)
os.makedirs(iconset, exist_ok=True)

for s in (16, 32, 48, 64, 128, 256, 512, 1024):
    src.resize((s, s), Image.LANCZOS).save(os.path.join(png_dir, f"khoj-{s}.png"))

for base in (16, 32, 128, 256, 512):
    src.resize((base, base), Image.LANCZOS).save(os.path.join(iconset, f"icon_{base}x{base}.png"))
    src.resize((base * 2, base * 2), Image.LANCZOS).save(os.path.join(iconset, f"icon_{base}x{base}@2x.png"))

src.save(os.path.join(APP, "Khoj.icns"), format="ICNS")
print("icns + iconset + png sizes written")
