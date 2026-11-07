"""The tall shop (floor mode, portrait) in Blender, clay-toy style, rendered for the 2D game.

Run:  Blender -b --factory-startup -P blender/tall_shop.py -- <out dir> [samples] [save .blend path]

Everything is placed in GAME units (the floor is 600 x 1080, x right, y down; see src/floor/data.ts TALL)
and heights are in SCREEN units (how many game units tall a thing looks in the game).
The camera looks down at 50 degrees. The room is stretched in depth by 1/cos(50) so its floor lands 1:1
on the game's floor coordinates: the render can be drawn straight over the world (2 px per game unit).
Tables and stools are rendered on their own (unstretched, so their tops look round like the owner's picture)
because the game sorts them with the people.

Outputs: room.png (1200x2160), table40.png, table50.png, stool.png (transparent, anchors in sprites.json).
"""
import bpy, bmesh, math, random, sys, os, json
from mathutils import Matrix

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else '/tmp/tall_shop'
SAMPLES = int(argv[1]) if len(argv) > 1 else 96
BLEND = argv[2] if len(argv) > 2 else None
os.makedirs(OUT, exist_ok=True)
random.seed(7)

TH = math.radians(50)
C, S = math.cos(TH), math.sin(TH)
SY = 1 / C          # depth stretch while building the room; 1 while building sprites
LIFT = 34           # counter height in screen units (the game lifts items on counters by this)

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene

# ---------------------------------------------------------------- materials
def lin(h):
    h = h.lstrip('#')
    return tuple((int(h[i:i + 2], 16) / 255) ** 2.2 for i in (0, 2, 4))

MATS = {}
def mat(name, col, rough=0.62, emit=None, es=0.0, metal=0.0, sss=0.0):
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*lin(col), 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if sss: b.inputs['Subsurface Weight'].default_value = sss
    if emit:
        b.inputs['Emission Color'].default_value = (*lin(emit), 1)
        b.inputs['Emission Strength'].default_value = es
    MATS[name] = m
    return m

def grain(m, dark=0.78, scale=6.0):
    """wood grain: wave bands along x darken the base colour a little"""
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

WOOD = [grain(mat('plank%d' % i, c, 0.7)) for i, c in enumerate(['#B97A45', '#AB6E3B', '#C3874F'])]
DARKWOOD = mat('darkwood', '#4E2C18', 0.75)
WALLWOOD = [mat('board0', '#5E3721', 0.75), mat('board1', '#68402A', 0.75)]
MIDWOOD = mat('midwood', '#8A5531', 0.68)
LIGHTWOOD = mat('lightwood', '#D9A066', 0.6)
TILE = [nmap(mat('tile0', '#C3CBD1', 0.4), 'tile_normal.png', 3.0), nmap(mat('tile1', '#B9C2C9', 0.4), 'tile_normal.png', 3.0)]
for w in WOOD: nmap(w, 'wood_normal.png', 1.0)
GROUT = mat('grout', '#7F8A92', 0.8)
PLASTER = mat('plaster', '#E9DECB', 0.85)
SUBWAY = mat('subway', '#F6F2EA', 0.35)
STEEL = mat('steel', '#C9D1D8', 0.32, metal=0.55)
STEELD = mat('steeldark', '#5B646C', 0.4, metal=0.5)
BLACK = mat('black', '#24282C', 0.5)
RED = mat('red', '#C53A2E', 0.7, sss=0.05)
REDDK = mat('reddark', '#9E2A22', 0.7)
CREAM = mat('cream', '#FFF4E2', 0.6)
WHITE = mat('white', '#F7F5F0', 0.4)
GOLD = mat('gold', '#E2B33C', 0.3, metal=0.8)
GREEN = [mat('leaf0', '#4E8A44', 0.6, sss=0.1), mat('leaf1', '#6DAE5C', 0.6, sss=0.1)]
NEGI = mat('negi', '#7CC35A', 0.5, sss=0.15)
YOLK = mat('yolk', '#F2B33A', 0.45, sss=0.2)
PINK = mat('pink', '#E9839F', 0.6)
BLOOM = [mat('bloom0', '#F7BCCB', 0.7, sss=0.2), mat('bloom1', '#F4A9BD', 0.7, sss=0.2)]
STONE = mat('stone', '#9B9893', 0.85)
STONEDK = mat('stonedark', '#6F6C67', 0.85)
DECK = mat('deck', '#3A2617', 0.8)
NIGHT = mat('night', '#000000', 0.9, emit='#1B2645', es=1.0)
GLOW = mat('glow', '#FFE2A8', 0.5, emit='#FFC979', es=6.0)
LANTERN = mat('lantern', '#FFE9C2', 0.5, emit='#FFB45E', es=9.0)
WINDOW = mat('window', '#FCE6B4', 0.5, emit='#F7C77E', es=3.5)
NOODLE = mat('noodle', '#F3E3B0', 0.6, sss=0.1)
TOWEL = mat('towel', '#F4EFE6', 0.9)
WATER = mat('water', '#8FA7B4', 0.15, metal=0.2)

# ---------------------------------------------------------------- geometry (game units in, metres out)
COL = None
def coll(name):
    c = bpy.data.collections.new(name); sc.collection.children.link(c); return c

def X(x): return x * 0.01
def Y(y): return -y * 0.01 * SY
def Z(s): return s * 0.01 / S

def finish(name, bm, m, bev=0.0, smooth=False, seg=3):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); COL.objects.link(o)
    me.materials.append(m)
    if smooth:
        for p in me.polygons: p.use_smooth = True
        try: me.set_sharp_from_angle(angle=math.radians(50))
        except Exception: pass
    if bev > 0:
        md = o.modifiers.new('bevel', 'BEVEL'); md.width = bev; md.segments = seg; md.limit_method = 'ANGLE'
    return o

def box(name, x0, y0, x1, y1, s0, s1, m, bev=0.012, uv=None):
    """uv = (metres per texture across x, metres per texture across y/z, offset u, offset v): planar UVs from the box's corner"""
    bm = bmesh.new()
    v = [bm.verts.new(p) for p in [(X(x0), Y(y1), Z(s0)), (X(x1), Y(y1), Z(s0)), (X(x1), Y(y0), Z(s0)), (X(x0), Y(y0), Z(s0)),
                                    (X(x0), Y(y1), Z(s1)), (X(x1), Y(y1), Z(s1)), (X(x1), Y(y0), Z(s1)), (X(x0), Y(y0), Z(s1))]]
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
    bev = min(bev, abs(X(x1) - X(x0)) * 0.45, abs(Y(y0) - Y(y1)) * 0.45, abs(Z(s1) - Z(s0)) * 0.45)
    return finish(name, bm, m, bev)

def cyl(name, x, y, rx, ry, s0, s1, m, seg=32, top=1.0, bev=0.01):
    """an upright (elliptic) cylinder or cone; rx, ry in game units on the floor"""
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=seg, radius1=1, radius2=top, depth=1)
    bmesh.ops.scale(bm, vec=(X(rx), ry * 0.01 * SY, Z(s1) - Z(s0)), verts=bm.verts)
    bmesh.ops.translate(bm, vec=(X(x), Y(y), (Z(s0) + Z(s1)) / 2), verts=bm.verts)
    bev = min(bev, X(rx) * 0.3, (Z(s1) - Z(s0)) * 0.3)
    return finish(name, bm, m, bev, smooth=True)

def ball(name, x, y, rx, ry, s, rs, m, seg=24):
    """an ellipsoid centred at floor (x, y), height s, radii rx/ry (floor) and rs (screen)"""
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=seg // 2 + 2, radius=1)
    bmesh.ops.scale(bm, vec=(X(rx), ry * 0.01 * SY, Z(rs)), verts=bm.verts)
    bmesh.ops.translate(bm, vec=(X(x), Y(y), Z(s)), verts=bm.verts)
    return finish(name, bm, m, smooth=True)

def disc_y(name, x, y, r, s, depth, m, seg=32):
    """a disc standing up, facing the camera (its axis along y)"""
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=seg, radius1=1, radius2=1, depth=1)
    bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 2, 3, 'X'))
    bmesh.ops.scale(bm, vec=(X(r), depth * 0.01 * SY, Z(r)), verts=bm.verts)
    bmesh.ops.translate(bm, vec=(X(x), Y(y), Z(s)), verts=bm.verts)
    return finish(name, bm, m, smooth=True)

def bowl(name, x, y, s, r=13, h=8):
    cyl(name, x, y, r * 0.62, r * 0.62, s, s + h, WHITE, top=1 / 0.62, bev=0.004)
    cyl(name + 'rim', x, y, r * 1.02, r * 1.02, s + h - 1.6, s + h, RED, bev=0.002)

# ---------------------------------------------------------------- the room
FL, KX, BOT = 262, 356, 850

def build_room():
    global COL
    COL = coll('room')
    box('base', -60, 120, 660, 1200, -6, -1, DARKWOOD, 0)
    # dining planks: 30 wide rows, 190 long, joints staggered
    for r, y in enumerate(range(FL, BOT, 30)):
        x = -((r * 83) % 190)
        while x < KX:
            a, b = max(0, x) + 0.8, min(KX, x + 190) - 0.8
            if b - a > 4: box('plank', a, y + 0.8, b, y + 29.2, -1, 1.5, random.choice(WOOD), 0.006, uv=(1.9, 0.6 * SY, random.random(), random.random()))
            x += 190
    # kitchen tiles
    box('grout', KX, FL, 600, BOT, -1, 0, GROUT, 0)
    for r, y in enumerate(range(FL, BOT, 36)):
        for k, x in enumerate(range(KX, 600, 36)):
            box('tile', x + 1.5, y + 1.5, min(600, x + 34.5), min(BOT, y + 34.5), -1, 1.2, TILE[(r * 3 + k * 5) % 7 % 2], 0.008, uv=(0.33, 0.33 * SY, 0, 0))

    # back wall of the shop front: dark boards, a lit lattice window, the entrance with the noren
    for i, x in enumerate(range(0, KX, 24)):
        a, b = x + 0.5, min(KX, x + 23.5)
        if b <= 190 or a >= 290: box('board', a, 246, b, FL, 0, 262, WALLWOOD[i % 2], 0.01)
        else:
            if a < 190: box('board', a, 246, 190, FL, 0, 262, WALLWOOD[i % 2], 0.01)
            if b > 290: box('board', 290, 246, b, FL, 0, 262, WALLWOOD[i % 2], 0.01)
            box('board', max(a, 190), 246, min(b, 290), FL, 172, 262, WALLWOOD[i % 2], 0.01)
    # window
    box('winframe', 56, FL - 2, 184, FL + 5, 40, 156, DARKWOOD, 0.015)
    box('winglass', 64, FL, 176, FL + 6, 48, 148, WINDOW, 0)
    for x in range(92, 176, 28): box('lattice', x - 1.5, FL + 5, x + 1.5, FL + 8, 48, 148, MIDWOOD, 0.004)
    for s in range(73, 148, 25): box('lattice', 64, FL + 5, 176, FL + 8, s - 1.5, s + 1.5, MIDWOOD, 0.004)
    # entrance: the night street beyond, the frame, the noren
    box('street', 150, 120, 330, 140, -2, 300, NIGHT, 0)
    box('step', 190, 140, 290, FL, -2, 0.5, DECK, 0.01)
    for x, s in [(212, 50), (262, 36), (246, 62)]: ball('streetlamp', x, 142, 2.2, 1, s, 2.2, GLOW, 12)
    box('post', 180, FL - 6, 190, FL + 8, 0, 176, DARKWOOD, 0.015)
    box('post', 290, FL - 6, 300, FL + 8, 0, 176, DARKWOOD, 0.015)
    box('lintel', 176, FL - 6, 304, FL + 9, 160, 178, DARKWOOD, 0.015)
    box('norenrod', 178, FL + 6, 302, FL + 10, 150, 155, BLACK, 0.006)
    for i in range(3):
        x = 184 + i * 38
        box('noren', x, FL + 8, x + 36, FL + 11, 76, 152, RED, 0.01)
    disc_y('norenbowl', 240, FL + 12, 12, 112, 1.2, CREAM)
    box('norenbowlcut', 226, FL + 12.5, 254, FL + 14, 112, 128, RED, 0.002)
    for k in (-6, 0, 6): box('steam', 239 + k, FL + 12.5, 241 + k, FL + 14, 120, 134, CREAM, 0.004)

    # kitchen back wall: plaster, subway tiles behind the stove, the hood, a shelf of bowls, ladles
    box('plaster', KX, 246, 600, FL, 0, 262, PLASTER, 0.01)
    for r, s in enumerate(range(0, 122, 14)):
        x = 444 - (r % 2) * 14
        while x < 600:
            a, b = max(444, x + 0.8), min(600, x + 27.2)
            if b - a > 3: box('subway', a, FL, b, FL + 1.6, s + 0.8, s + 13.2, SUBWAY, 0.004)
            x += 28
    box('hood', 448, FL, 588, 292, 164, 212, STEEL, 0.03)
    box('hoodlip', 444, FL, 592, 298, 158, 166, STEELD, 0.01)
    box('shelf', 370, FL, 438, 280, 64, 70, MIDWOOD, 0.006)
    for x in (388, 420):
        for i in range(3): bowl('shelfbowl', x, 271, 70 + i * 7, 11, 6)
    box('rail', 370, FL, 438, 266, 186, 190, STEELD, 0.004)
    for x in (382, 404, 426):
        cyl('ladlehandle', x, 268, 1.2, 1.2, 140, 188, STEEL, 8, bev=0)
        ball('ladlecup', x, 270, 7, 5, 136, 6, STEEL)
    box('beam', -40, 236, 640, 272, 206, 262, mat('beam', '#2A1609', 0.8), 0.02)

    # the paper lantern by the left wall, and a plant by the door
    box('bracket', 0, 296, 40, 300, 124, 128, BLACK, 0.004)
    cyl('lanterncord', 36, 300, 1, 1, 114, 126, BLACK, 6, bev=0)
    cyl('lanterncap', 36, 300, 12, 12, 112, 117, BLACK, bev=0.004)
    ball('lantern', 36, 300, 22, 22, 90, 26, LANTERN)
    cyl('lanternfoot', 36, 300, 12, 12, 62, 67, BLACK, bev=0.004)
    disc_y('lanternmark', 36, 278, 7, 86, 1, RED)
    box('pot', 298, 268, 328, 292, 0, 24, MIDWOOD, 0.02)
    for x, y, s, rr, m in [(306, 280, 32, 9, GREEN[0]), (320, 278, 33, 9, GREEN[1]), (313, 282, 44, 8, GREEN[1]),
                           (304, 284, 48, 6, GREEN[0]), (322, 282, 50, 6, GREEN[0]), (313, 286, 56, 6, GREEN[1])]:
        ball('leaf', x, y, rr, rr * 0.8, s, rr * 0.75, m, 16)

    # side walls, the bench
    box('leftwall', -40, 240, 14, BOT, 0, 262, DARKWOOD, 0.01)
    box('rightwall', 590, 240, 640, BOT, 0, 262, PLASTER, 0.01)
    box('bench', 14, 500, 34, 600, 0, 16, LIGHTWOOD, 0.02)
    box('benchback', 10, 498, 20, 602, 16, 40, MIDWOOD, 0.015)

    # kitchen counters (LIFT tall, steel)
    def steel(x0, y0, x1, y1, s1=LIFT):
        box('counter', x0, y0, x1, y1, 0, s1 - 2, mat('steelfront', '#A9B2BA', 0.35, metal=0.5), 0.01)
        box('countertop', x0 - 1, y0 - 1, x1 + 1, y1 + 1, s1 - 3, s1, STEEL, 0.012)
    steel(390, FL, 444, 312)
    for i in range(4): bowl('bowl', 417, 288, LIFT + i * 7, 15, 7)
    # stove
    box('stove', 444, FL, 590, 316, 0, LIFT - 3, STEELD, 0.012)
    box('stovetop', 443, FL - 1, 591, 317, LIFT - 3, LIFT, BLACK, 0.01)
    for cx in (486, 556):
        cyl('burner', cx, 289, 21, 21, LIFT, LIFT + 1.5, STEELD, bev=0.004)
        cyl('burnerin', cx, 289, 13, 13, LIFT + 1.5, LIFT + 2.5, BLACK, bev=0.002)
    for x in (470, 502, 540, 572): disc_y('knob', x, 318, 3.6, 10, 3, BLACK, 16)
    # noodle crate
    steel(548, 380, 600, 446)
    box('crate', 556, 388, 598, 436, LIFT, LIFT + 18, MIDWOOD, 0.012)
    for x, y in [(566, 400), (586, 402), (566, 422), (587, 424)]: ball('nest', x, y, 9, 8, LIFT + 18, 4, NOODLE, 16)
    # bin
    box('bin', 556, 646, 596, 688, 0, 38, mat('bin', '#6E7A82', 0.5), 0.03)
    box('binlid', 553, 642, 599, 690, 38, 43, STEELD, 0.02)
    # sink
    steel(468, 790, 586, 836)
    box('basin', 482, 796, 572, 826, LIFT - 1, LIFT + 0.3, WATER, 0.01)
    cyl('faucet', 520, 794, 2.5, 2.5, LIFT, LIFT + 30, STEEL, 12, bev=0)
    box('spout', 517, 794, 523, 806, LIFT + 26, LIFT + 30, STEEL, 0.003)
    box('towel', 486, 836, 512, 839, 4, 22, TOWEL, 0.006)
    box('towelline', 486, 838.5, 512, 840, 6, 8, RED, 0.002)
    # prep island with the three topping trays
    steel(412, 500, 542, 580)
    trays = [('tamago', 412, 455), ('negi', 455, 498), ('naruto', 498, 542)]
    for k, x0, x1 in trays:
        box('tray', x0 + 3, 503, x1 - 3, 534, LIFT, LIFT + 3, mat('tray', '#AEB7BF', 0.4, metal=0.3), 0.006)
        cx = (x0 + x1) / 2
        if k == 'tamago':
            for dx in (-8, 8):
                ball('egg', cx + dx, 516, 8, 6, LIFT + 4, 3.2, WHITE, 16)
                ball('yolk', cx + dx, 516, 4.4, 3.3, LIFT + 6, 2, YOLK, 12)
        elif k == 'negi':
            for dx, dy in [(-9, 512), (0, 516), (9, 512), (-5, 522), (6, 523)]:
                cyl('negi', cx + dx, dy, 4, 4, LIFT + 3, LIFT + 5, NEGI, 12, bev=0.001)
        else:
            for dx in (-8, 8):
                cyl('naruto', cx + dx, 516, 8, 8, LIFT + 3, LIFT + 5.5, WHITE, 24, bev=0.002)
                cyl('swirl', cx + dx, 516, 3.5, 3.5, LIFT + 5.5, LIFT + 6, PINK, 16, bev=0)

    # the counter between the rooms with the pass
    box('divider', 330, FL, 356, 700, 0, 30, MIDWOOD, 0.02)
    box('dividertop', 328, FL - 2, 358, 702, 30, 33, LIGHTWOOD, 0.015)
    box('pass', 331, 430, 355, 526, 33, 34, mat('pass', '#EFC48E', 0.5), 0.004)
    box('passmark', 326, 423, 360, 430, 30, 36, RED, 0.006)
    box('passmark', 326, 526, 360, 533, 30, 36, RED, 0.006)
    cyl('bellbase', 343, 480, 8, 4, 34, 35.5, DARKWOOD, bev=0.002)
    ball('bell', 343, 480, 6.5, 6.5, 35.5, 6.5, GOLD)

    # the railing, the deck outside, a cherry tree and a stone lantern
    box('deck', -40, BOT, 640, 1200, -3, 0, DECK, 0)
    for y in range(BOT + 26, 1100, 26): box('deckline', -40, y, 640, y + 1.2, 0, 0.3, mat('deckline', '#2A1A10', 0.9), 0)
    for x in range(6, 600, 48): box('railpost', x, BOT - 4, x + 9, BOT + 5, 0, 34, MIDWOOD, 0.01)
    box('rail', -10, BOT - 6, 610, BOT + 6, 30, 38, LIGHTWOOD, 0.015)
    box('rail2', -10, BOT - 3, 610, BOT + 3, 10, 14, MIDWOOD, 0.008)
    cyl('trunk', 22, 1060, 9, 9, 0, 90, DARKWOOD, 12, top=0.6, bev=0)
    for i, (x, y, r) in enumerate([(30, 1000, 14), (58, 966, 12), (94, 944, 13), (130, 926, 12), (156, 914, 10), (72, 898, 11),
                                   (40, 940, 10), (112, 972, 9), (16, 962, 9), (178, 930, 8),
                                   (8, 900, 12), (120, 890, 10), (60, 1030, 12), (200, 905, 7)]):
        for j in range(5):
            a = j * math.tau / 5 + i
            ball('bloom', x + math.cos(a) * r * 0.9, y + 70 + math.sin(a) * r * 0.5, r * 0.95, r * 0.85, 70 + math.sin(a) * r * 0.7, r * 0.85, BLOOM[(i + j) % 2], 12)
    lx, ly = 548, 1044
    box('slbase', lx - 26, ly - 8, lx + 26, ly + 8, 0, 12, STONE, 0.02)
    box('slpillar', lx - 9, ly - 6, lx + 9, ly + 6, 12, 62, STONE, 0.02)
    box('slshelf', lx - 24, ly - 10, lx + 24, ly + 10, 62, 72, STONEDK, 0.02)
    box('slbox', lx - 18, ly - 9, lx + 18, ly + 9, 72, 106, STONE, 0.02)
    box('sllight', lx - 10, ly + 8, lx + 10, ly + 10, 78, 100, GLOW, 0.004)
    cyl('slroof', lx, ly, 36, 22, 104, 128, STONEDK, 4, top=0.15, bev=0.01)
    ball('sltop', lx, ly, 6, 6, 132, 6, STONE, 12)
    return COL

# ---------------------------------------------------------------- tables and stools (sprites)
TABLE_TOP = 32   # the top looks this many units above the floor
STOOL_TOP = 13
def build_table(r):
    global COL
    COL = coll('table%d' % r)
    cyl('foot', 0, 0, 18, 18, 0, 3, DARKWOOD, bev=0.01)
    cyl('leg', 0, 0, 5.5, 5.5, 3, TABLE_TOP - 6, DARKWOOD, 16, bev=0)
    cyl('apron', 0, 0, r * 0.82, r * 0.82, TABLE_TOP - 9, TABLE_TOP - 5, MIDWOOD, 48, bev=0.01)
    cyl('top', 0, 0, r, r, TABLE_TOP - 6, TABLE_TOP, grain(mat('tabletop', '#D99A5B', 0.55), 0.85, 3), 64, bev=0.025)
    return COL

def build_stool():
    global COL
    COL = coll('stool')
    for a in range(4):
        ang = a * math.pi / 2 + math.pi / 4
        cyl('stoolleg', math.cos(ang) * 7, math.sin(ang) * 7, 1.8, 1.8, 0, STOOL_TOP - 3, DARKWOOD, 8, bev=0)
    cyl('stoolring', 0, 0, 8, 8, 4, 5.5, DARKWOOD, 24, bev=0)
    cyl('seat', 0, 0, 12, 12, STOOL_TOP - 4, STOOL_TOP, mat('seat', '#7A4428', 0.7, sss=0.05), 32, bev=0.02)
    return COL

# ---------------------------------------------------------------- lights, world, camera, render
def lights():
    global COL
    COL = coll('lights')
    w = bpy.data.worlds.new('world'); sc.world = w; w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = (*lin('#2A2440'), 1)
    w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.7
    def add(name, kind, loc, rot, energy, col, size=None):
        d = bpy.data.lights.new(name, kind); d.energy = energy; d.color = lin(col)
        if size is not None:
            if kind == 'AREA': d.size = size
            elif kind == 'SUN': d.angle = size
            else: d.shadow_soft_size = size
        o = bpy.data.objects.new(name, d); o.location = loc; o.rotation_euler = rot; COL.objects.link(o); return o
    add('sun', 'SUN', (0, 0, 10), (math.radians(-38), math.radians(18), math.radians(-20)), 1.3, '#FFD9A8', math.radians(14))
    return add

def camera(u_c, v_c, w_units, h_units, name):
    cam = bpy.data.cameras.new(name); cam.type = 'ORTHO'; cam.ortho_scale = max(w_units, h_units) * 0.01; cam.clip_end = 200
    o = bpy.data.objects.new(name, cam); sc.collection.objects.link(o)
    up, d = (0, C, S), (0, S, -C)
    pc = (u_c, v_c * up[1], v_c * up[2])
    D = 60
    o.location = (pc[0] - D * d[0], pc[1] - D * d[1], pc[2] - D * d[2])
    o.rotation_euler = (TH, 0, 0)
    sc.camera = o
    sc.render.resolution_x = int(w_units * 2); sc.render.resolution_y = int(h_units * 2); sc.render.resolution_percentage = 100
    return o

def setup_render():
    sc.render.engine = 'CYCLES'
    try:
        prefs = bpy.context.preferences.addons['cycles'].preferences
        prefs.compute_device_type = 'METAL'; prefs.get_devices()
        for dv in prefs.devices: dv.use = True
        sc.cycles.device = 'GPU'
    except Exception as e:
        print('GPU off:', e); sc.cycles.device = 'CPU'
    sc.cycles.samples = SAMPLES; sc.cycles.use_denoising = True
    sc.cycles.max_bounces = 6
    sc.view_settings.view_transform = 'AgX'
    try: sc.view_settings.look = 'AgX - Medium High Contrast'
    except Exception: pass
    sc.view_settings.exposure = -0.35
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'

def only(*cols):
    for c in sc.collection.children:
        c.hide_render = not (c in cols or c.name == 'lights')

setup_render()
add_light = lights()
# warm ceiling light over the dining room, a cooler one over the kitchen, the lantern and the stone lantern
add_light('dining', 'AREA', (X(170), Y(560), 6), (0, 0, 0), 620, '#FFB070', 4)
add_light('kitchen', 'AREA', (X(480), Y(560), 6), (0, 0, 0), 300, '#FFEBD6', 3)
add_light('lanternlight', 'POINT', (X(40), Y(318), Z(90)), (0, 0, 0), 60, '#FFB060', 0.3)
add_light('stonelight', 'POINT', (X(548), Y(1060), Z(90)), (0, 0, 0), 25, '#FFB060', 0.2)
add_light('front', 'AREA', (X(300), Y(1400), 5), (math.radians(55), 0, 0), 150, '#FFC898', 6)

SY = 1 / C
room = build_room()
SY = 1.0
tables = {r: build_table(r) for r in (40, 50)}
stool = build_stool()
# sprites sit at the origin, out of the room's way: move their collections under the camera later
catcher = None
def make_catcher():
    global COL, catcher
    COL = coll('catcher')
    bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=3)
    catcher = finish('catcher', bm, DARKWOOD); catcher.is_shadow_catcher = True
    return COL
catch = None
sprite_light = add_light('spritelight', 'AREA', (0.2, -0.4, 5), (0, 0, 0), 520, '#FFC890', 3)

if BLEND:
    bpy.ops.wm.save_as_mainfile(filepath=BLEND)

# the room
cam = camera(3.0, -5.4, 600, 1080, 'roomcam')
only(room); sc.render.film_transparent = False
sprite_light.hide_render = True
sc.render.filepath = os.path.join(OUT, 'room.png'); bpy.ops.render.render(write_still=True)

# the sprites: anchor = the floor centre, drawn at (ax, ay) in the picture
sc.render.film_transparent = True
sc.view_settings.exposure += 0.9   # the sprites get less bounce light than the room; match the floor's brightness
sprite_light.hide_render = False
for o in [o for o in bpy.data.objects if o.type == 'LIGHT' and o.name not in ('sun', 'spritelight', 'front')]: o.hide_render = True
meta = {'scale': 2}
for key, col, rx, top, ry in [('table40', tables[40], 40, TABLE_TOP, 40 * C), ('table50', tables[50], 50, TABLE_TOP, 50 * C), ('stool', stool, 12, STOOL_TOP, 12 * C)]:
    W = int(2 * rx + 24); ay = int(top + ry + 8); H = ay + (24 if key != 'stool' else 12); ax = W / 2
    sc.objects.get('roomcam')
    cam = camera(0.0, (ay - H / 2) * 0.01, W, H, 'cam_' + key)
    only(col)
    sc.render.filepath = os.path.join(OUT, key + '.png'); bpy.ops.render.render(write_still=True)
    meta[key] = {'w': W, 'h': H, 'ax': ax, 'ay': ay}
json.dump(meta, open(os.path.join(OUT, 'sprites.json'), 'w'), indent=1)
print('DONE', OUT)
