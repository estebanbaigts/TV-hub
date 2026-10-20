"""Génère app/icon.png (512×512) pour « Accueil+ » : maison + signe plus, fond dégradé Aurore."""
import sys
from PIL import Image, ImageDraw

out = sys.argv[1]
S = 512
SS = 4  # suréchantillonnage pour des bords lisses
W = S * SS

# Fond : dégradé diagonal violet → magenta → turquoise
grad = Image.new("RGB", (W, W))
px = grad.load()
stops = [(0.0, (124, 60, 255)), (0.55, (236, 64, 170)), (1.0, (0, 200, 210))]
for y in range(0, W, SS):
    for x in range(0, W, SS):
        t = (x + y) / (2 * W)
        for i in range(len(stops) - 1):
            a, ca = stops[i]
            b, cb = stops[i + 1]
            if a <= t <= b:
                k = (t - a) / (b - a)
                c = tuple(int(ca[j] + (cb[j] - ca[j]) * k) for j in range(3))
                break
        for dy in range(SS):
            for dx in range(SS):
                px[x + dx, y + dy] = c

mask = Image.new("L", (W, W), 0)
ImageDraw.Draw(mask).rounded_rectangle([0, 0, W - 1, W - 1], radius=112 * SS, fill=255)
img = Image.new("RGBA", (W, W), (0, 0, 0, 0))
img.paste(grad, (0, 0), mask)

d = ImageDraw.Draw(img)
white = (255, 255, 255, 255)
lw = 30 * SS
# Maison (contour)
cx, top, base, half = W * 0.46, W * 0.22, W * 0.76, W * 0.25
roof = [(cx - half - lw * 0.2, W * 0.47), (cx, top), (cx + half + lw * 0.2, W * 0.47)]
d.line(roof, fill=white, width=lw, joint="curve")
d.line([(cx - half * 0.78, W * 0.44), (cx - half * 0.78, base), (cx + half * 0.78, base), (cx + half * 0.78, W * 0.44)],
       fill=white, width=lw, joint="curve")
# Pastille « + »
r = W * 0.15
bx, by = W * 0.72, W * 0.70
d.ellipse([bx - r, by - r, bx + r, by + r], fill=white)
pc = (124, 60, 255, 255)
arm, th = r * 0.55, 15 * SS
d.rectangle([bx - arm, by - th, bx + arm, by + th], fill=pc)
d.rectangle([bx - th, by - arm, bx + th, by + arm], fill=pc)

img.resize((S, S), Image.LANCZOS).save(out)
