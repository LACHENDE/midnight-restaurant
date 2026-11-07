"""The tall shop (floor mode, portrait) in Blender: a cozy clay-toy diorama rendered for the 2D game.

Run:  Blender -b --factory-startup -P blender/tall_shop.py -- <out dir> [samples] [save .blend path]
Then: python3 blender/pack_art.py <out dir>   (webp files into public/art/floor + src/floor/art3d.json)

Units: positions are GAME units (the tall room is 600 x 1080, x right, y down; see src/floor/data.ts TALL).
Heights are SCREEN units: how many game units tall a thing looks in the game.
The ortho camera looks down at 58 degrees. Floor positions are stretched in depth by 1/cos(58) so the floor
lands 1:1 on game coordinates (2 px per unit); furniture and props keep their real shapes ("natural"), so a
round table top looks like an oval, the way it does in the owner's picture.

Front pieces (tables, front stools, the prep island, the sink) are also rendered on their own, in place, with
the rest of the room held out (same light, same shadows): the game draws them sorted with the people, so a
guest behind a table is hidden behind it. Their sort keys and the counter tops (where the game puts pots and
bowls) go to meta.json.
"""
import bpy, bmesh, math, random, sys, os, json
from mathutils import Matrix, Vector
from bpy_extras.object_utils import world_to_camera_view

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else '/tmp/tall_shop'
SAMPLES = int(argv[1]) if len(argv) > 1 else 128
BLEND = argv[2] if len(argv) > 2 else None
os.makedirs(OUT, exist_ok=True)
random.seed(11)

TH = math.radians(58)
C, S = math.cos(TH), math.sin(TH)
SY = 1 / C
W_GAME, H_GAME = 600, 1080
FL, KX, BOT = 262, 356, 850          # back wall line, kitchen starts, railing
CH = 50                              # kitchen counter height (screen units)
DIV_H = 54                           # the counter between the rooms
TABLE_TOP, STOOL_TOP = 42, 20

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
META = {'scale': 2, 'tops': {}, 'labels': {}, 'occ': []}

# ---------------------------------------------------------------- materials
def lin(h):
    h = h.lstrip('#')
    return tuple((int(h[i:i + 2], 16) / 255) ** 2.2 for i in (0, 2, 4))

MATS = {}
def mat(name, col, rough=0.6, emit=None, es=0.0, metal=0.0, sss=0.0, coat=0.0):
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*lin(col), 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if sss:
        b.inputs['Subsurface Weight'].default_value = sss
        b.inputs['Subsurface Radius'].default_value = (0.05, 0.03, 0.02)
    if coat: b.inputs['Coat Weight'].default_value = coat
    if emit:
        b.inputs['Emission Color'].default_value = (*lin(emit), 1)
        b.inputs['Emission Strength'].default_value = es
    MATS[name] = m
    return m

TEX = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'textures')
def nmap(m, file, strength=1.0):
    """a tangent-space normal map (blender/textures, made by make_normals.py) on the object's UVMap"""
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    im = bpy.data.images.load(os.path.join(TEX, file), check_existing=True); im.colorspace_settings.name = 'Non-Color'
    t = nt.nodes.new('ShaderNodeTexImage'); t.image = im; t.interpolation = 'Cubic'
    uvn = nt.nodes.new('ShaderNodeUVMap'); uvn.uv_map = 'UVMap'
    nm = nt.nodes.new('ShaderNodeNormalMap'); nm.uv_map = 'UVMap'; nm.inputs['Strength'].default_value = strength
    nt.links.new(uvn.outputs['UV'], t.inputs['Vector']); nt.links.new(t.outputs['Color'], nm.inputs['Color'])
    nt.links.new(nm.outputs['Normal'], b.inputs['Normal'])
    return m

def grain(m, dark=0.8, scale=5.0):
    """soft wood bands along x on top of the base colour"""
    nt = m.node_tree; b = nt.nodes['Principled BSDF']; base = b.inputs['Base Color'].default_value[:]
    tc = nt.nodes.new('ShaderNodeTexCoord'); wv = nt.nodes.new('ShaderNodeTexWave')
    wv.wave_type = 'BANDS'; wv.bands_direction = 'Y'; wv.inputs['Scale'].default_value = scale
    wv.inputs['Distortion'].default_value = 6; wv.inputs['Detail'].default_value = 3
    rp = nt.nodes.new('ShaderNodeValToRGB')
    rp.color_ramp.elements[0].color = (base[0] * dark, base[1] * dark, base[2] * dark, 1); rp.color_ramp.elements[1].color = base
    rp.color_ramp.elements[0].position = 0.35
    nt.links.new(tc.outputs['Object'], wv.inputs['Vector']); nt.links.new(wv.outputs['Fac'], rp.inputs['Fac'])
    nt.links.new(rp.outputs['Color'], b.inputs['Base Color'])
    return m

PLANK = [nmap(grain(mat('plank%d' % i, c, 0.62)), 'wood_normal.png', 1.0) for i, c in enumerate(['#B9733C', '#A9672F', '#C27F43', '#B06D36'])]
TILE = [nmap(mat('tile%d' % i, c, 0.3, coat=0.3), 'tile_normal.png', 3.0) for i, c in enumerate(['#C4CACE', '#BBC2C7', '#C0C6CB'])]
GROUT = mat('grout', '#8B949A', 0.85)
BOARD = [grain(mat('board0', '#5E3721', 0.7), 0.85, 3), grain(mat('board1', '#6A4029', 0.7), 0.85, 3)]
DARK = mat('darkwood', '#3E2314', 0.7)
MID = grain(mat('midwood', '#8A5531', 0.6), 0.85, 4)
LIGHT = grain(mat('lightwood', '#D9A066', 0.55), 0.88, 4)
HONEY = grain(mat('honey', '#C98C52', 0.5, coat=0.2), 0.85, 3)
PLASTER = mat('plaster', '#EADFCB', 0.9)
SUBWAY = mat('subway', '#F7F3EA', 0.25, coat=0.4)
STEEL = mat('steel', '#D3DADF', 0.28, metal=0.6)
STEELF = mat('steelfront', '#AEB7BE', 0.35, metal=0.55)
STEELD = mat('steeldark', '#59626A', 0.4, metal=0.5)
BLACK = mat('black', '#25292D', 0.5)
RED = mat('red', '#C93C2F', 0.65, sss=0.05)
CREAM = mat('cream', '#FFF2DC', 0.6)
WHITE = mat('white', '#F7F5F0', 0.3, coat=0.3)
GOLD = mat('gold', '#E2B33C', 0.25, metal=0.85)
LEAF = [mat('leaf0', '#4C8A43', 0.55, sss=0.15), mat('leaf1', '#6BAE59', 0.55, sss=0.15), mat('leaf2', '#3E7A3A', 0.55, sss=0.15)]
POT = mat('planter', '#B5643C', 0.8)
NEGI = mat('negi', '#7CC35A', 0.45, sss=0.2)
YOLK = mat('yolk', '#F2B33A', 0.4, sss=0.3)
PINK = mat('pink', '#E9839F', 0.6)
BLOOM = [mat('bloom0', '#F7BCCB', 0.7, sss=0.3), mat('bloom1', '#F4A3B8', 0.7, sss=0.3), mat('bloom2', '#FCD3DC', 0.7, sss=0.3)]
STONE = mat('stone', '#A3A09A', 0.9)
STONEDK = mat('stonedark', '#74716B', 0.9)
DECK = grain(mat('deck', '#3C2818', 0.8), 0.8, 3)
NIGHT = mat('night', '#000000', 0.9, emit='#1E2A4C', es=1.2)
GLOW = mat('glow', '#FFE2A8', 0.5, emit='#FFC979', es=12.0)
FAIRY = mat('fairy', '#FFE9B0', 0.5, emit='#FFCF7A', es=40.0)
LANTERN = mat('lantern', '#FFE9C2', 0.5, emit='#FFB45E', es=10.0)
LANTERN_R = mat('lanternred', '#E2553F', 0.5, emit='#FF7A4E', es=6.0)
WINDOW = mat('window', '#FCE6B4', 0.5, emit='#F7C77E', es=5.0)
NOODLE = mat('noodle', '#F3E3B0', 0.55, sss=0.2)
TOWEL = mat('towel', '#F4EFE6', 0.95)
WATER = mat('water', '#7F9AA8', 0.08, metal=0.3)
SEAT = mat('seat', '#A8432F', 0.75, sss=0.05)
SOY = mat('soy', '#2A1408', 0.15, coat=0.5)
CHILI = mat('chili', '#D2462E', 0.3, sss=0.1)
MAT_RUB = mat('mat', '#3A3F44', 0.95)
CERAMIC = mat('ceramic', '#E8E1D3', 0.3, coat=0.4)

# ---------------------------------------------------------------- geometry
COL = None
def coll(name):
    c = bpy.data.collections.new(name); sc.collection.children.link(c); return c

def X(x): return x * 0.01
def Y(y): return -y * 0.01 * SY
def Z(s): return s * 0.01 / S

def finish(name, bm, m, bev=0.0, seg=4, smooth=True):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); COL.objects.link(o)
    me.materials.append(m)
    if smooth:
        for p in me.polygons: p.use_smooth = True
        try: me.set_sharp_from_angle(angle=math.radians(35))
        except Exception: pass
    if bev > 0:
        md = o.modifiers.new('bevel', 'BEVEL'); md.width = bev; md.segments = seg; md.limit_method = 'ANGLE'; md.harden_normals = True
    return o

def box(name, x0, y0, x1, y1, s0, s1, m, bev=0.02, uv=None, nat=False):
    """an upright box on the floor footprint x0..x1, y0..y1, from height s0 to s1 (nat: depth not stretched, centred)"""
    bm = bmesh.new()
    if nat:
        cy, hy = (y0 + y1) / 2, (y1 - y0) / 2
        ya, yb = Y(cy) - hy * 0.01, Y(cy) + hy * 0.01
    else:
        ya, yb = Y(y1), Y(y0)
    v = [bm.verts.new(p) for p in [(X(x0), ya, Z(s0)), (X(x1), ya, Z(s0)), (X(x1), yb, Z(s0)), (X(x0), yb, Z(s0)),
                                    (X(x0), ya, Z(s1)), (X(x1), ya, Z(s1)), (X(x1), yb, Z(s1)), (X(x0), yb, Z(s1))]]
    for f in [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]:
        bm.faces.new([v[i] for i in f])
    if uv:
        ru, rv, ou, ov = uv; o = v[0].co.copy(); bm.normal_update(); lay = bm.loops.layers.uv.new('UVMap')
        for f in bm.faces:
            n = f.normal
            for l in f.loops:
                d = l.vert.co - o
                a, b = (d.x, d.y) if abs(n.z) > 0.5 else (d.x, d.z) if abs(n.y) > 0.5 else (d.y, d.z)
                l[lay].uv = (a / ru + ou, b / rv + ov)
    bev = min(bev, abs(X(x1) - X(x0)) * 0.45, abs(yb - ya) * 0.45, abs(Z(s1) - Z(s0)) * 0.45)
    return finish(name, bm, m, bev, smooth=False)

def cyl(name, x, y, rx, ry, s0, s1, m, seg=40, top=1.0, bev=0.012, nat=True):
    """an upright (elliptic) cylinder or cone standing at floor (x, y); nat keeps its real round shape"""
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=seg, radius1=1, radius2=top, depth=1)
    bmesh.ops.scale(bm, vec=(X(rx), ry * 0.01 * (1 if nat else SY), Z(s1) - Z(s0)), verts=bm.verts)
    bmesh.ops.translate(bm, vec=(X(x), Y(y), (Z(s0) + Z(s1)) / 2), verts=bm.verts)
    bev = min(bev, X(rx) * 0.3, (Z(s1) - Z(s0)) * 0.3)
    return finish(name, bm, m, bev)

def ball(name, x, y, rx, ry, s, rs, m, seg=28, nat=True):
    """an ellipsoid centred at floor (x, y) and height s; radii rx, ry (floor) and rs (screen units, up)"""
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=seg // 2 + 2, radius=1)
    bmesh.ops.scale(bm, vec=(X(rx), ry * 0.01 * (1 if nat else SY), Z(rs)), verts=bm.verts)
    bmesh.ops.translate(bm, vec=(X(x), Y(y), Z(s)), verts=bm.verts)
    return finish(name, bm, m)

def plate(name, x, y, r, s, depth, m, seg=32):
    """a flat disc facing the camera, standing at floor line y (axis along y)"""
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=seg, radius1=1, radius2=1, depth=1)
    bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 2, 3, 'X'))
    bmesh.ops.scale(bm, vec=(X(r), depth * 0.01, Z(r)), verts=bm.verts)
    bmesh.ops.translate(bm, vec=(X(x), Y(y), Z(s)), verts=bm.verts)
    return finish(name, bm, m)

def bowl(name, x, y, s, r=13, h=8, rim=RED):
    cyl(name, x, y, r * 0.6, r * 0.6, s, s + h, WHITE, top=1 / 0.6, bev=0.004)
    cyl(name + 'rim', x, y, r * 1.02, r * 1.02, s + h - 1.6, s + h, rim, bev=0.002)

def plant(x, y, s0, size=1.0, pot=POT, w=14):
    cyl('planter', x, y, w * size, w * size, s0, s0 + 22 * size, pot, top=1.15, bev=0.01)
    cyl('soil', x, y, w * size * 1.05, w * size * 1.05, s0 + 20 * size, s0 + 22 * size, DARK, bev=0)
    for i in range(9):
        a = i * 2.4; r = (4 + (i % 3) * 5) * size
        ball('leaf', x + math.cos(a) * r, y + math.sin(a) * r * 0.6, 9 * size, 8 * size, s0 + (26 + (i % 4) * 7) * size, 7 * size, LEAF[i % 3], 16)

def chochin(x, y, s, r=10, m=LANTERN):
    cyl('chcap', x, y, r * 0.6, r * 0.6, s + r * 1.2, s + r * 1.45, BLACK, bev=0.002)
    ball('chochin', x, y, r, r, s, r * 1.3, m, 20)
    cyl('chfoot', x, y, r * 0.6, r * 0.6, s - r * 1.45, s - r * 1.2, BLACK, bev=0.002)

def tops(key, x, y):
    META['tops'][key] = [round(x, 1), round(y, 1)]

# ---------------------------------------------------------------- the room
def build_room():
    global COL
    COL = coll('room')
    box('base', -80, 100, 680, 1300, -8, -1, DARK, 0)
    # dining planks: rows 30 wide, 190 long, joints staggered, a normal map per plank
    for r, y in enumerate(range(FL, BOT, 30)):
        x = -((r * 83) % 190)
        while x < KX:
            a, b = max(14, x) + 0.8, min(KX, x + 190) - 0.8
            if b - a > 4: box('plank', a, y + 0.8, b, y + 29.2, -1, 1.5, random.choice(PLANK), 0.008, uv=(1.9, 0.6 * SY, random.random(), random.random()))
            x += 190
    # kitchen tiles
    box('grout', KX, FL, 600, BOT, -1, 0, GROUT, 0)
    for r, y in enumerate(range(FL, BOT, 36)):
        for k, x in enumerate(range(KX, 600, 36)):
            box('tile', x + 1.5, y + 1.5, min(598, x + 34.5), min(BOT, y + 34.5), -1, 1.4, TILE[(r * 3 + k * 5) % 7 % 3], 0.01, uv=(0.33, 0.33 * SY, 0, 0))
    # rubber mats in front of the stove and the island
    box('mat', 452, 322, 584, 356, 0, 2.5, MAT_RUB, 0.01)
    box('mat', 418, 452, 536, 494, 0, 2.5, MAT_RUB, 0.01)

    # ---- the shop front wall: boards, a lit lattice window, the entrance with the noren, menu slips
    for i, x in enumerate(range(0, KX, 22)):
        a, b = x + 0.4, min(KX, x + 21.6)
        segs = []
        if a < 182: segs.append((a, min(b, 182), 0))
        if b > 298: segs.append((max(a, 298), b, 0))
        if b > 182 and a < 298: segs.append((max(a, 182), min(b, 298), 176))
        for p, q, s0 in segs:
            if q - p > 1: box('board', p, 240, q, FL, s0, 270, BOARD[i % 2], 0.008)
    box('skirting', 14, FL, 176, FL + 4, 0, 10, DARK, 0.006)
    box('skirting', 304, FL, KX, FL + 4, 0, 10, DARK, 0.006)
    box('winframe', 54, FL - 2, 182, FL + 6, 40, 160, DARK, 0.02)
    box('winsill', 50, FL, 176, FL + 12, 36, 42, MID, 0.01)
    box('winglass', 62, FL, 174, FL + 6, 48, 152, WINDOW, 0)
    for x in range(90, 174, 28): box('lattice', x - 1.6, FL + 5, x + 1.6, FL + 8, 48, 152, MID, 0.004)
    for s in range(74, 152, 26): box('lattice', 62, FL + 5, 174, FL + 8, s - 1.6, s + 1.6, MID, 0.004)
    for x in (80, 156):
        cyl('sillpot', x, FL + 6, 6, 5, 42, 52, CERAMIC, 16, bev=0.002); ball('sillleaf', x, FL + 6, 7, 6, 57, 6, LEAF[1], 12)
    # entrance: a night street with a few lit windows beyond
    box('street', 120, 90, 360, 120, -2, 330, NIGHT, 0)
    for x, h in [(140, 120), (175, 90), (205, 150), (245, 110), (275, 140), (310, 95)]: box('town', x, 128, x + 34, 136, 0, h, mat('town', '#141A2E', 0.9), 0.004)
    for x, s in [(150, 70), (190, 40), (222, 100), (258, 60), (288, 90), (300, 120), (232, 55)]: box('townwin', x, 126, x + 5, 128, s, s + 5, GLOW, 0)
    box('step', 182, 120, 298, FL, -2, 0.5, STONEDK, 0.01)
    box('post', 174, FL - 6, 184, FL + 10, 0, 182, DARK, 0.02)
    box('post', 296, FL - 6, 306, FL + 10, 0, 182, DARK, 0.02)
    box('lintel', 168, FL - 6, 312, FL + 12, 166, 186, DARK, 0.02)
    box('signboard', 196, FL + 10, 284, FL + 14, 188, 214, HONEY, 0.01)
    META['labels']['shopsign'] = [240, FL + 12 - 201]
    box('norenrod', 176, FL + 8, 304, FL + 12, 156, 161, BLACK, 0.006)
    for i in range(3):
        x = 182 + i * 39
        box('noren', x, FL + 10, x + 37, FL + 13, 80, 158, RED, 0.012)
    plate('norenbowl', 240, FL + 14, 12, 118, 1.2, CREAM)
    box('norenbowlcut', 226, FL + 14.6, 254, FL + 16, 118, 134, RED, 0.002)
    for k in (-6, 0, 6): box('steam', 239 + k, FL + 14.6, 241 + k, FL + 16, 126, 140, CREAM, 0.004)
    # menu slips left of the window
    for i, x in enumerate([18, 33]):
        box('slip', x, FL + 2, x + 12, FL + 5, 64, 124, CREAM, 0.004)
        META['labels']['slip%d' % i] = [x + 6, FL + 3.5 - 94]
    # a shelf over the window with a lucky cat, sake bottles and a little plant
    box('wallshelf', 46, FL, 186, FL + 14, 174, 179, MID, 0.008)
    ball('catbody', 70, FL + 8, 9, 7, 188, 9, WHITE, 16); ball('cathead', 70, FL + 8, 8, 7, 202, 7, WHITE, 16)
    ball('catpaw', 76, FL + 13, 3, 3, 205, 3, WHITE, 10); ball('catbell', 70, FL + 14, 2.4, 2, 194, 2.4, GOLD, 10)
    for x, c in [(98, '#3B6E4A'), (112, '#7A2E22'), (126, '#2E4A6E')]:
        m = mat('bottle' + c, c, 0.15, coat=0.6)
        cyl('bottle', x, FL + 8, 5, 5, 179, 199, m, 16, bev=0.003); cyl('bottleneck', x, FL + 8, 2, 2, 199, 207, m, 10, bev=0)
    plant(160, FL + 8, 179, 0.55, CERAMIC, 10)
    # paper lanterns along the beam
    for x in [40, 110, 150, 326]:
        cyl('chcord', x, FL + 14, 0.8, 0.8, 236, 250, BLACK, 6, bev=0); chochin(x, FL + 14, 224, 9, LANTERN_R if x in (40, 326) else LANTERN)

    # ---- the kitchen back wall: plaster, subway tiles, the hood, shelves, ladles, a clock
    box('plaster', KX, 240, 600, FL, 0, 270, PLASTER, 0.01)
    for r, s in enumerate(range(0, 150, 14)):
        x = 444 - (r % 2) * 14
        while x < 600:
            a, b = max(444, x + 0.8), min(598, x + 27.2)
            if b - a > 3: box('subway', a, FL, b, FL + 1.8, s + 0.8, s + 13.2, SUBWAY, 0.005)
            x += 28
    box('hood', 446, FL, 590, 300, 186, 236, STEEL, 0.04)
    box('hoodlip', 442, FL, 594, 306, 178, 188, STEELD, 0.012)
    box('hoodlight', 470, 300, 566, 306, 179, 182, GLOW, 0)
    box('shelf', 364, FL, 440, 282, 112, 118, MID, 0.008)
    for i, (x, c) in enumerate([(372, '#C9A35A'), (386, '#8E3B2A'), (400, '#5C7A3A'), (414, '#D9C7A0'), (428, '#B8562E')]):
        m = mat('jar' + c, c, 0.3, coat=0.3); h = 132 - (i % 2) * 4
        cyl('jar', x, FL + 10, 5.5, 5.5, 118, h, m, 16, bev=0.003); cyl('jarlid', x, FL + 10, 6, 6, h, h + 3, STEELD, 16, bev=0.002)
    box('rail', 364, FL, 440, 266, 210, 214, STEELD, 0.004)
    for x in (378, 396, 414, 432):
        cyl('ladlehandle', x, FL + 6, 1.2, 1.2, 160, 212, STEEL, 8, bev=0)
        ball('ladlecup', x, FL + 8, 7, 6, 156, 6, STEEL)
    plate('clock', 400, FL + 2, 12, 250, 3, CREAM); plate('clockrim', 400, FL + 1, 13.5, 250, 2, DARK)
    box('beam', -60, 230, 660, 272, 236, 290, mat('beam', '#2A1609', 0.75), 0.03)

    # ---- the paper lantern by the left wall, plants
    box('bracket', 0, 296, 44, 302, 132, 137, BLACK, 0.004)
    cyl('lanterncord', 38, 300, 1, 1, 120, 134, BLACK, 6, bev=0)
    chochin(38, 300, 92, 22, LANTERN)
    plate('lanternmark', 38, 318, 8, 88, 1, RED)
    plant(318, 276, 0, 1.0)
    plant(30, 830, 0, 0.9)

    # ---- side walls, the bench with cushions
    box('leftwall', -60, 240, 14, BOT, 0, 270, DARK, 0.01)
    box('rightwall', 592, 240, 660, BOT, 0, 270, PLASTER, 0.01)
    box('bench', 14, 500, 36, 600, 0, 20, HONEY, 0.03)
    box('benchback', 10, 496, 20, 604, 20, 50, MID, 0.02)
    for y in (508, 538, 568): box('cushion', 16, y, 34, y + 26, 20, 26, SEAT, 0.03)

    # ---- kitchen counters along the back wall (people stand in front: part of the room picture)
    def counter(x0, y0, x1, y1, h=CH):
        box('counter', x0, y0, x1, y1, 0, h - 3, STEELF, 0.02)
        box('countertop', x0 - 1.5, y0 - 1.5, x1 + 1.5, y1 + 1.5, h - 3, h, STEEL, 0.02)
        box('kick', x0 + 2, y1 - 1, x1 - 2, y1 + 0.5, 0, 6, STEELD, 0.004)
    counter(390, FL, 444, 312)
    for i in range(5): bowl('bowl', 417, 287, CH + i * 6.5, 15, 6.5)
    tops('bowls', 417, 287 - CH - 30)
    box('stove', 444, FL, 590, 316, 0, CH - 4, STEELF, 0.02)
    box('stovedoor', 452, 316, 582, 317.5, 8, CH - 10, STEELD, 0.01)
    box('stovetop', 443, FL - 1, 591, 317, CH - 4, CH, BLACK, 0.015)
    for i, cx in enumerate((486, 556)):
        cyl('burner', cx, 289, 22, 22, CH, CH + 2, STEELD, bev=0.004, nat=False)
        cyl('burnerin', cx, 289, 13, 13, CH + 2, CH + 3, BLACK, bev=0.002, nat=False)
        tops('pot%d' % i, cx, 289 - CH - 2)
    for x in (470, 502, 540, 572): plate('knob', x, 319, 4, CH - 10, 3, BLACK, 16)
    counter(552, 380, 598, 446)
    box('crate', 556, 386, 596, 440, CH, CH + 20, MID, 0.015)
    for x, y in [(566, 398), (586, 400), (566, 424), (587, 426)]: ball('nest', x, y, 9, 8, CH + 20, 4, NOODLE, 16)
    META['labels']['noodles'] = [576, 413 - CH - 34]
    tops('noodles', 576, 413 - CH - 22)
    cyl('bin', 576, 668, 19, 19, 0, 48, mat('bin', '#6E7A82', 0.45, metal=0.3), bev=0.02, nat=False)
    cyl('binlid', 576, 668, 21, 21, 48, 53, STEELD, bev=0.02, nat=False)
    tops('trash', 576, 668 - 30)
    # the counter between the rooms with the pass and the bell
    box('divider', 330, FL, 356, 700, 0, DIV_H - 4, MID, 0.025)
    box('dividertop', 327, FL - 2, 359, 703, DIV_H - 4, DIV_H, HONEY, 0.02)
    box('pass', 331, 428, 355, 528, DIV_H, DIV_H + 1, mat('pass', '#F1C792', 0.45), 0.004)
    box('passmark', 325, 421, 361, 428, DIV_H - 4, DIV_H + 3, RED, 0.008)
    box('passmark', 325, 528, 361, 535, DIV_H - 4, DIV_H + 3, RED, 0.008)
    for i, y in enumerate((454, 502)): tops('pass%d' % i, 343, y - DIV_H - 4)
    cyl('bellbase', 343, 478, 8, 4, DIV_H, DIV_H + 1.5, DARK, bev=0.002)
    ball('bell', 343, 478, 6.5, 6.5, DIV_H + 1.5, 6.5, GOLD)
    for y in (300, 360):
        cyl('sauce', 343, y, 4, 4, DIV_H, DIV_H + 14, SOY, 12, bev=0.002); cyl('saucecap', 343, y, 2.5, 2.5, DIV_H + 14, DIV_H + 18, RED, 10, bev=0)
    plant(343, 640, DIV_H, 0.6, CERAMIC, 11)

    # ---- the railing, the deck, a cherry tree, planters, fairy lights and a stone lantern
    box('deck', -60, BOT, 660, 1300, -3, 0, DECK, 0)
    for y in range(BOT + 26, 1140, 26): box('deckline', -60, y, 660, y + 1.2, 0, 0.3, mat('deckline', '#24170E', 0.9), 0)
    for x in range(6, 600, 48): box('railpost', x, BOT - 4, x + 9, BOT + 5, 0, 40, MID, 0.015)
    box('rail', -10, BOT - 6, 610, BOT + 6, 36, 44, LIGHT, 0.02)
    box('rail2', -10, BOT - 3, 610, BOT + 3, 12, 16, MID, 0.01)
    for x in range(10, 600, 20):
        sag = 6 * math.sin((x % 96) / 96 * math.pi)
        ball('fairy', x, BOT + 8, 2.2, 2.2, 32 - sag, 2.2, FAIRY, 10)
    for x0 in (120, 330):
        box('planterbox', x0, 930, x0 + 110, 960, 0, 22, MID, 0.02)
        for k in range(6): ball('bush', x0 + 10 + k * 18, 945, 13, 11, 26 + (k % 2) * 5, 10, LEAF[k % 3], 16)
    cyl('trunk', 26, 1060, 10, 10, 0, 110, DARK, 12, top=0.55, bev=0)
    cyl('branch', 70, 1030, 5, 5, 60, 120, DARK, 10, top=0.5, bev=0)
    clusters = [(30, 1000, 16), (58, 966, 14), (94, 944, 15), (130, 926, 13), (156, 914, 11), (72, 898, 12), (40, 940, 12),
                (112, 972, 10), (14, 962, 11), (178, 930, 9), (8, 900, 13), (120, 890, 11), (60, 1030, 13), (200, 905, 8), (96, 1010, 10)]
    for i, (x, y, r) in enumerate(clusters):
        for j in range(6):
            a = j * math.tau / 6 + i
            ball('bloom', x + math.cos(a) * r * 0.8, y + 80 + math.sin(a) * r * 0.5, r * 0.9, r * 0.8, 80 + math.sin(a) * r * 0.7, r * 0.8, BLOOM[(i + j) % 3], 14)
    for x, y in [(30, 1060), (90, 1075), (160, 1050), (60, 1100)]: ball('petal', x, y, 3, 2, 0.5, 0.6, BLOOM[0], 8)
    lx, ly = 548, 1044
    box('slbase', lx - 26, ly - 10, lx + 26, ly + 10, 0, 12, STONE, 0.025, nat=True)
    box('slpillar', lx - 9, ly - 7, lx + 9, ly + 7, 12, 62, STONE, 0.02, nat=True)
    box('slshelf', lx - 24, ly - 12, lx + 24, ly + 12, 62, 72, STONEDK, 0.02, nat=True)
    box('slbox', lx - 18, ly - 10, lx + 18, ly + 10, 72, 106, STONE, 0.02, nat=True)
    box('sllight', lx - 10, ly - 11, lx + 10, ly - 10, 78, 100, GLOW, 0.002, nat=True)
    cyl('slroof', lx, ly, 36, 22, 104, 128, STONEDK, 4, top=0.15, bev=0.01)
    ball('sltop', lx, ly, 6, 6, 132, 6, STONE, 12)
    return COL

# ---------------------------------------------------------------- front pieces (sorted with the people in the game)
TABLES = [(1, 100, 440, 40, 2), (2, 250, 440, 50, 4), (3, 100, 660, 40, 2), (4, 250, 660, 50, 4)]   # id, x, y, r, seats (data.ts TALL)
def seats(r, n):
    front = r * 0.8 + 30
    return [(0, -14), (0, front)] if n == 2 else [(-24, -14), (24, -14), (-24, front), (24, front)]

def stool(x, y):
    """a stool whose seat looks STOOL_TOP above the floor; the game's seat point is (x, y), the base sits at y + 8"""
    b = y + 8
    for a in range(4):
        ang = a * math.pi / 2 + math.pi / 4
        cyl('stoolleg', x + math.cos(ang) * 7, b + math.sin(ang) * 7, 1.8, 1.8, 0, STOOL_TOP - 4, DARK, 8, bev=0)
    cyl('stoolring', x, b, 8, 8, 5, 6.5, DARK, 24, bev=0)
    cyl('seatbase', x, b, 11, 11, STOOL_TOP - 6, STOOL_TOP - 3, MID, 32, bev=0.004)
    cyl('seat', x, b, 12, 12, STOOL_TOP - 4, STOOL_TOP, SEAT, 32, top=0.85, bev=0.03)

def table(x, y, r):
    """the top's centre looks 6 above the game's table point (the game draws dishes and the number there)"""
    b = y - 6 + TABLE_TOP
    cyl('foot', x, b, 20, 20, 0, 4, DARK, bev=0.012)
    cyl('leg', x, b, 6, 6, 4, TABLE_TOP - 8, DARK, 16, bev=0)
    cyl('apron', x, b, r * 0.8, r * 0.8, TABLE_TOP - 11, TABLE_TOP - 6, MID, 48, bev=0.012)
    cyl('top', x, b, r, r, TABLE_TOP - 6, TABLE_TOP, HONEY, 64, bev=0.03)
    cx, cy = x + r * 0.42, b - r * 0.42     # a condiment tray at the back right: soy, chili, chopsticks
    box('tray', cx - 12, cy - 5, cx + 12, cy + 5, TABLE_TOP, TABLE_TOP + 2, DARK, 0.006, nat=True)
    cyl('soy', cx - 6, cy, 3, 3, TABLE_TOP + 2, TABLE_TOP + 12, SOY, 12, bev=0.002); cyl('soycap', cx - 6, cy, 2, 2, TABLE_TOP + 12, TABLE_TOP + 15, RED, 10, bev=0)
    cyl('chili', cx + 1, cy, 3, 3, TABLE_TOP + 2, TABLE_TOP + 9, CHILI, 12, bev=0.002)
    cyl('sticks', cx + 8, cy, 3, 3, TABLE_TOP + 2, TABLE_TOP + 11, CERAMIC, 12, bev=0.002)
    for k in (-1, 0, 1): cyl('stick', cx + 8 + k, cy, 0.6, 0.6, TABLE_TOP + 11, TABLE_TOP + 17, LIGHT, 6, bev=0)

def build_front():
    """returns [(key, collection, sort y, extra)]"""
    global COL
    out = []
    back = coll('room_stools')
    for tid, x, y, r, n in TABLES:
        COL = coll('occ_table%d' % tid); table(x, y, r); out.append(('table%d' % tid, COL, y, {'table': tid}))
        for k, (dx, dy) in enumerate(seats(r, n)):
            if dy < 0:
                COL = back; stool(x + dx, y + dy)
            else:
                COL = coll('occ_stool%d_%d' % (tid, k)); stool(x + dx, y + dy); out.append(('stool%d_%d' % (tid, k), COL, y + dy - 0.5, {}))
    # the prep island: the cook works behind it (north), a waiter in front (south)
    COL = coll('occ_island')
    x0, x1, y0, y1 = 412, 542, 512, 580
    box('island', x0, y0, x1, y1, 0, CH - 3, STEELF, 0.02)
    box('islandtop', x0 - 1.5, y0 - 1.5, x1 + 1.5, y1 + 1.5, CH - 3, CH, STEEL, 0.02)
    box('islandkick', x0 + 3, y1 - 1, x1 - 3, y1 + 0.5, 0, 6, STEELD, 0.004)
    for k, a, b in [('tamago', 412, 455), ('negi', 455, 498), ('naruto', 498, 542)]:
        box('tray', a + 3, 514, b - 3, 540, CH, CH + 4, mat('traysteel', '#B9C1C8', 0.35, metal=0.4), 0.006)
        cx, ty = (a + b) / 2, 527
        if k == 'tamago':
            for dx, dy in [(-8, -4), (8, -3), (0, 6)]:
                ball('egg', cx + dx, ty + dy, 8, 6, CH + 5, 3.5, WHITE, 16); ball('yolk', cx + dx, ty + dy, 4.5, 3.4, CH + 7.5, 2.2, YOLK, 12)
        elif k == 'negi':
            for dx, dy in [(-9, -5), (0, -2), (9, -5), (-5, 5), (6, 6), (0, 9)]: cyl('negi', cx + dx, ty + dy, 4.2, 4.2, CH + 4, CH + 6.5, NEGI, 12, bev=0.001)
        else:
            for dx, dy in [(-8, -3), (8, -3), (0, 6)]:
                cyl('naruto', cx + dx, ty + dy, 8, 8, CH + 4, CH + 7, WHITE, 24, bev=0.002); cyl('swirl', cx + dx, ty + dy, 3.5, 3.5, CH + 7, CH + 7.5, PINK, 16, bev=0)
        META['labels'][k] = [cx, y1 - 18]
    tops('island0', 444, 562 - CH - 6); tops('island1', 510, 562 - CH - 6)
    out.append(('island', COL, y1, {}))
    # the sink (people wash from the north side)
    COL = coll('occ_sink')
    x0, x1, y0, y1 = 468, 586, 800, 836
    box('sink', x0, y0, x1, y1, 0, CH - 3, STEELF, 0.02)
    box('sinktop', x0 - 1.5, y0 - 1.5, x1 + 1.5, y1 + 1.5, CH - 3, CH, STEEL, 0.02)
    box('basin', 482, 804, 530, 830, CH - 1.5, CH + 0.4, WATER, 0.012)
    cyl('faucet', 506, 803, 2.6, 2.6, CH, CH + 34, STEEL, 12, bev=0)
    box('spout', 503, 803, 509, 812, CH + 30, CH + 34, STEEL, 0.004)
    box('towel', 488, y1, 514, y1 + 3, 6, 28, TOWEL, 0.008)
    box('towelline', 488, y1 + 2.5, 514, y1 + 4, 9, 11, RED, 0.002)
    box('rack', 540, 806, 578, 828, CH, CH + 3, STEELD, 0.004)
    for k in range(4): cyl('plate', 559, 817, 13, 13, CH + 3 + k * 2.2, CH + 4.8 + k * 2.2, WHITE, 32, bev=0.003)
    tops('sink', 506, 818 - CH - 4)
    out.append(('sink', COL, y1, {}))
    return out

# ---------------------------------------------------------------- lights, world, camera, render
def setup_world():
    w = bpy.data.worlds.new('world'); sc.world = w; w.use_nodes = True
    bg = w.node_tree.nodes['Background']; bg.inputs['Color'].default_value = (*lin('#1C2442'), 1); bg.inputs['Strength'].default_value = 0.6

def lights():
    global COL
    COL = coll('lights')
    def add(name, kind, loc, energy, col, size=None, rot=(0, 0, 0), spot=None):
        d = bpy.data.lights.new(name, kind); d.energy = energy; d.color = lin(col)
        if kind == 'AREA' and size: d.size = size
        if kind == 'SUN' and size: d.angle = size
        if kind in ('POINT', 'SPOT') and size: d.shadow_soft_size = size
        if spot: d.spot_size, d.spot_blend = spot
        o = bpy.data.objects.new(name, d); o.location = loc; o.rotation_euler = rot; COL.objects.link(o); return o
    add('moon', 'SUN', (0, 0, 10), 0.5, '#AFC0FF', math.radians(8), (math.radians(-35), math.radians(-25), math.radians(15)))
    for tid, x, y, r, n in TABLES:   # warm pools of light over each table
        add('pool%d' % tid, 'SPOT', (X(x), Y(y + 30), 7.5), 1400, '#FFB066', 0.25, spot=(math.radians(50), 0.85))
    add('diningfill', 'AREA', (X(180), Y(560), 7), 130, '#FFC48A', 5)
    add('kitchen', 'AREA', (X(480), Y(560), 7), 300, '#FFEBD2', 3.2)
    add('hood', 'AREA', (X(518), Y(300), Z(178)), 60, '#FFE6B8', 1.2)
    add('lanternlight', 'POINT', (X(38), Y(320), Z(92)), 140, '#FFA850', 0.25)
    add('window', 'AREA', (X(118), Y(FL + 10), Z(100)), 80, '#FFC37A', 1.2, rot=(math.radians(-90), 0, 0))
    add('door', 'AREA', (X(240), Y(FL + 16), Z(130)), 60, '#FF9F5A', 0.9, rot=(math.radians(-90), 0, 0))
    add('stonelight', 'POINT', (X(548), Y(1030), Z(90)), 60, '#FFB060', 0.2)
    add('fairyglow', 'AREA', (X(300), Y(BOT + 10), Z(60)), 120, '#FFC070', 6, rot=(math.radians(-60), 0, 0))
    add('front', 'AREA', (X(300), Y(1400), 6), 120, '#FFD0A0', 8, rot=(math.radians(60), 0, 0))

def camera():
    cam = bpy.data.cameras.new('cam'); cam.type = 'ORTHO'; cam.ortho_scale = H_GAME * 0.01; cam.clip_end = 300
    o = bpy.data.objects.new('cam', cam); sc.collection.objects.link(o)
    up, d = Vector((0, C, S)), Vector((0, S, -C))
    pc = Vector((W_GAME / 2 * 0.01, 0, 0)) + up * (-H_GAME / 2 * 0.01)
    o.location = pc - d * 80; o.rotation_euler = (TH, 0, 0)
    sc.camera = o
    sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = W_GAME * 2, H_GAME * 2, 100
    return o

def setup_render():
    sc.render.engine = 'CYCLES'
    try:
        prefs = bpy.context.preferences.addons['cycles'].preferences
        prefs.compute_device_type = 'METAL'; prefs.get_devices()
        for dv in prefs.devices: dv.use = True
        sc.cycles.device = 'GPU'
    except Exception as e:
        print('GPU off:', e)
    sc.cycles.samples = SAMPLES; sc.cycles.use_denoising = True
    sc.cycles.max_bounces = 8
    sc.view_settings.view_transform = 'AgX'
    try: sc.view_settings.look = 'AgX - Medium High Contrast'
    except Exception: pass
    sc.view_settings.exposure = -0.2
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'

def compositor(on):
    sc.render.use_compositing = on
    if not on: return
    sc.use_nodes = True; nt = sc.node_tree
    for n in list(nt.nodes): nt.nodes.remove(n)
    rl = nt.nodes.new('CompositorNodeRLayers'); out = nt.nodes.new('CompositorNodeComposite')
    try:
        gl = nt.nodes.new('CompositorNodeGlare')
        gl.glare_type = 'FOG_GLOW'; gl.threshold = 1.2; gl.size = 7; gl.mix = -0.55; gl.quality = 'HIGH'
        nt.links.new(rl.outputs['Image'], gl.inputs['Image']); nt.links.new(gl.outputs['Image'], out.inputs['Image'])
    except Exception as e:
        print('no glare:', e)
        for n in [n for n in nt.nodes if n.bl_idname == 'CompositorNodeGlare']: nt.nodes.remove(n)
        nt.links.new(rl.outputs['Image'], out.inputs['Image'])

def layer_coll(name):
    return bpy.context.view_layer.layer_collection.children[name]

def bbox_px(col, cam):
    """the collection's box in render pixels (x0, y0, x1, y1), y down"""
    xs, ys = [], []
    dg = bpy.context.evaluated_depsgraph_get()
    for o in col.objects:
        ev = o.evaluated_get(dg)
        for c in ev.bound_box:
            p = world_to_camera_view(sc, cam, ev.matrix_world @ Vector(c)); xs.append(p.x); ys.append(1 - p.y)
    W, H = sc.render.resolution_x, sc.render.resolution_y
    return max(0, int(min(xs) * W) - 8), max(0, int(min(ys) * H) - 8), min(W, int(max(xs) * W) + 8), min(H, int(max(ys) * H) + 8)

# ---------------------------------------------------------------- build and render
setup_render(); setup_world(); lights()
room = build_room()
front = build_front()
cam = camera()
if BLEND: bpy.ops.wm.save_as_mainfile(filepath=BLEND)

compositor(True); sc.render.film_transparent = False
sc.render.filepath = os.path.join(OUT, 'room.png'); bpy.ops.render.render(write_still=True)

compositor(False); sc.render.film_transparent = True
sc.render.use_border = True; sc.render.use_crop_to_border = False
for key, col, sort_y, extra in front:
    for c in sc.collection.children:
        if c.name != 'lights': layer_coll(c.name).holdout = c is not col
    x0, y0, x1, y1 = bbox_px(col, cam)
    W, H = sc.render.resolution_x, sc.render.resolution_y
    sc.render.border_min_x, sc.render.border_max_x = x0 / W, x1 / W
    sc.render.border_min_y, sc.render.border_max_y = 1 - y1 / H, 1 - y0 / H
    sc.render.filepath = os.path.join(OUT, key + '.png'); bpy.ops.render.render(write_still=True)
    META['occ'].append({'k': key, 'sort': sort_y, **extra})
for c in sc.collection.children:
    if c.name != 'lights': layer_coll(c.name).holdout = False
sc.render.use_border = False
json.dump(META, open(os.path.join(OUT, 'meta.json'), 'w'), indent=1)
print('DONE', OUT)
