"""Génère app/icon.png (512x512) : carré sombre arrondi, quatre tuiles stylisées."""
import sys
from PIL import Image, ImageDraw

out = sys.argv[1]
S = 512
img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
d = ImageDraw.Draw(img)
d.rounded_rectangle([0, 0, S - 1, S - 1], radius=112, fill=(14, 14, 17, 255))
pad, gap = 120, 28
w = (S - 2 * pad - gap) // 2
cols = [(245, 245, 247), (120, 120, 128), (120, 120, 128), (120, 120, 128)]
for i, c in enumerate(cols):
    x = pad + (i % 2) * (w + gap)
    y = pad + (i // 2) * (w + gap)
    d.rounded_rectangle([x, y, x + w, y + w], radius=30, fill=c + (255,))
img.save(out)
