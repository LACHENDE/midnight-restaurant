"""Pack a tall_shop.py render into the game: public/art/floor/*.webp and src/floor/art3d.json.

Run:  python3 blender/pack_art.py <render dir>
The room gets a soft vignette; each front piece is cut to its own box (with the same vignette) and placed in game units.
"""
import sys, os, json
from PIL import Image, ImageChops, ImageDraw, ImageFilter

src = sys.argv[1]
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = os.path.join(root, 'public', 'art', 'floor'); os.makedirs(out, exist_ok=True)
meta = json.load(open(os.path.join(src, 'meta.json')))
room = Image.open(os.path.join(src, 'room.png')).convert('RGB')
W, H = room.size

# vignette: darker towards the edges (multiply), strongest in the corners
v = Image.new('L', (W, H), 0); d = ImageDraw.Draw(v)
d.ellipse((-W * 0.25, -H * 0.12, W * 1.25, H * 1.12), fill=255)
v = v.filter(ImageFilter.GaussianBlur(W * 0.18))
v = v.point(lambda a: int(150 + a * 105 / 255))
vig = Image.merge('RGB', (v, v, v))
ImageChops.multiply(room, vig).save(os.path.join(out, 'room-tall.webp'), quality=88, method=6)

occ = []
for o in meta['occ']:
    im = Image.open(os.path.join(src, o['k'] + '.png')).convert('RGBA')
    box = im.getchannel('A').getbbox()
    if not box: continue
    piece = im.crop(box)
    rgb = ImageChops.multiply(piece.convert('RGB'), vig.crop(box))
    rgb.putalpha(piece.getchannel('A'))
    rgb.save(os.path.join(out, o['k'] + '.webp'), quality=90, method=6)
    occ.append({**o, 'x': box[0] / 2, 'y': box[1] / 2, 'w': (box[2] - box[0]) / 2, 'h': (box[3] - box[1]) / 2})
art = {'v': 2, 'tops': meta['tops'], 'labels': meta['labels'], 'occ': occ}
json.dump(art, open(os.path.join(root, 'src', 'floor', 'art3d.json'), 'w'), indent=1)
for f in os.listdir(out):
    if f.startswith(('table40', 'table50', 'stool.')): os.remove(os.path.join(out, f))
print('packed', len(occ), 'pieces')
