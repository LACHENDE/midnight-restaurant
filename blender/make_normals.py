"""Tileable normal maps for the tall shop's floor (OpenGL style, green = up), made from height fields.

Run:  python3 blender/make_normals.py      -> blender/textures/wood_normal.png, tile_normal.png (+ *_height.png to look at)
Free: numpy + Pillow only. Edit the numbers below and re-run, then re-render with tall_shop.py.
"""
import os
import numpy as np
from PIL import Image

N = 1024
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'textures')
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(7)
u, v = np.meshgrid(np.arange(N) / N, np.arange(N) / N)   # 0..1, tileable when every wave is a whole number of periods


def noise(freq, octaves=4, seed=0):
    """tileable value noise from random sine sums"""
    r = np.random.default_rng(seed); h = np.zeros((N, N))
    for o in range(octaves):
        f = freq * 2 ** o
        for _ in range(6):
            kx, ky = r.integers(-f, f + 1), r.integers(-f, f + 1)
            if kx == 0 and ky == 0: continue
            h += np.sin(2 * np.pi * (kx * u + ky * v) + r.uniform(0, 2 * np.pi)) / (2 ** o)
    return h / np.abs(h).max()


def to_normal(h, strength):
    dx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * 0.5 * N
    dy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * 0.5 * N
    n = np.dstack([-dx * strength, dy * strength, np.ones_like(h)])   # image rows go down, so +dy flips for OpenGL
    n /= np.linalg.norm(n, axis=2, keepdims=True)
    return Image.fromarray(((n * 0.5 + 0.5) * 255).astype(np.uint8))


def save(name, h, strength):
    to_normal(h, strength).save(os.path.join(OUT, name + '_normal.png'))
    g = (h - h.min()) / (h.max() - h.min())
    Image.fromarray((g * 255).astype(np.uint8)).save(os.path.join(OUT, name + '_height.png'))


# wood: grain lines running along the plank (u), wobbling, with growth rings, a couple of knots and soft dents
warp = noise(2, 3, 1) * 0.06 + noise(6, 2, 2) * 0.01
grain = np.sin(2 * np.pi * (24 * v + warp * 24)) * 0.5 + np.sin(2 * np.pi * (61 * v + warp * 40)) * 0.2
pores = noise(48, 2, 3) * 0.12
knots = np.zeros((N, N))
for kx, ky in [(0.3, 0.42), (0.78, 0.8)]:
    d = np.hypot(((u - kx + 0.5) % 1 - 0.5) * 1.0, ((v - ky + 0.5) % 1 - 0.5) * 3.0)
    knots += np.sin(d * 140) * np.exp(-d * 18) * 0.8
dents = -np.clip(noise(5, 2, 4), 0.55, 1) * 0.6 + 0.33
save('wood', grain * 0.35 + pores + knots + dents * 0.5, 0.012)

# kitchen tiles: one tile per image, a soft pillow edge, a gentle glaze ripple and a few pits
edge = np.minimum.reduce([u, 1 - u, v, 1 - v])
pillow = np.clip(edge / 0.06, 0, 1) ** 0.5
ripple = noise(3, 3, 5) * 0.06 + noise(20, 2, 6) * 0.015
pits = (noise(60, 1, 7) > 0.85) * -0.05
save('tile', pillow * 0.5 + ripple + pits, 0.02)
print('ok', OUT)
