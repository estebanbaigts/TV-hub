"""Génère les fonds d'écran premium (1920×1080, JPEG) : lumières douces, grain anti-bandes, vignettage.

Usage : python3 -I scripts/make_backgrounds.py <dossier_sortie>
Un fond précalculé évite les bandes visibles des dégradés CSS sur une dalle de TV,
et reste une image fixe peinte une seule fois (aucun coût pendant la navigation).
"""
import os
import sys

import numpy as np
from PIL import Image

W, H = 1920, 1080
rng = np.random.default_rng(7)

THEMES = {
    # nom : (couleur de base haut, couleur de base bas, [(x, y, rayon, couleur, intensité), ...])
    "nuit": ((14, 16, 34), (6, 7, 16), [
        (0.15, 0.10, 0.55, (64, 92, 255), 0.55),
        (0.85, 0.30, 0.50, (140, 70, 255), 0.40),
        (0.70, 1.05, 0.60, (0, 170, 190), 0.30),
    ]),
    "graphite": ((22, 22, 26), (10, 10, 12), [
        (0.80, 0.05, 0.60, (255, 170, 90), 0.30),
        (0.10, 0.95, 0.55, (120, 120, 150), 0.25),
        (0.50, 0.50, 0.70, (60, 60, 75), 0.30),
    ]),
    "aube": ((30, 14, 34), (12, 6, 16), [
        (0.10, 0.15, 0.55, (255, 110, 120), 0.35),
        (0.90, 0.20, 0.50, (150, 80, 255), 0.35),
        (0.55, 1.05, 0.60, (255, 150, 80), 0.25),
    ]),
}


def render(top, bottom, lights):
    y = np.linspace(0, 1, H)[:, None]
    x = np.linspace(0, 1, W)[None, :]
    img = np.zeros((H, W, 3))
    for c in range(3):  # dégradé vertical de base
        img[:, :, c] = top[c] + (bottom[c] - top[c]) * y
    aspect = W / H
    for lx, ly, r, col, k in lights:  # lumières douces (gaussiennes larges)
        d2 = ((x - lx) * aspect) ** 2 + (y - ly) ** 2
        g = np.exp(-d2 / (2 * (r * 0.6) ** 2)) * k
        for c in range(3):
            img[:, :, c] = img[:, :, c] * (1 - g) + col[c] * g
    vig = 1 - 0.35 * (((x - 0.5) * 1.2) ** 2 + ((y - 0.5) * 1.4) ** 2)  # vignettage
    img *= np.clip(vig, 0.55, 1)[:, :, None]
    img += rng.normal(0, 2.2, (H, W, 1))  # grain fin : supprime les bandes
    return Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))


def main():
    out = sys.argv[1]
    os.makedirs(out, exist_ok=True)
    for name, (top, bottom, lights) in THEMES.items():
        path = os.path.join(out, "bg-%s.jpg" % name)
        render(top, bottom, lights).save(path, quality=88, optimize=True)
        print(path, os.path.getsize(path) // 1024, "Ko")


if __name__ == "__main__":
    main()
