"""Concept renders: Midnight Restaurant's two screens (the cook's kitchen, the counter) as a chunky 3D toy set.

Run:  Blender -b --factory-startup -P blender/concept_yatai.py -- <out dir> [samples]
Writes kitchen.png and counter.png (1600 x 728, the game's landscape shape). Metres, z up, the camera in front and a
little above, looking at the stall like the game does today.
"""
import bpy, bmesh, math, os, sys, random
from mathutils import Vector, Matrix

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else '/tmp/yatai'
SAMPLES = int(argv[1]) if len(argv) > 1 else 64
os.makedirs(OUT, exist_ok=True)
random.seed(3)

def lin(h):
    h = h.lstrip('#'); return tuple((int(h[i:i + 2], 16) / 255) ** 2.2 for i in (0, 2, 4))
MATS = {}
def mat(name, col, rough=0.55, emit=None, es=0.0, metal=0.0, sss=0.0, coat=0.0, alpha=1.0, trans=0.0):
    key = name
    if key in MATS: return MATS[key]
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*lin(col), 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    if sss: b.inputs['Subsurface Weight'].default_value = sss; b.inputs['Subsurface Radius'].default_value = (0.05, 0.03, 0.02)
    if coat: b.inputs['Coat Weight'].default_value = coat
    if trans: b.inputs['Transmission Weight'].default_value = trans
    if alpha < 1: b.inputs['Alpha'].default_value = alpha
    if emit: b.inputs['Emission Color'].default_value = (*lin(emit), 1); b.inputs['Emission Strength'].default_value = es
    MATS[key] = m; return m

COL = None
def finish(name, bm, m, bev=0.0, smooth=True, seg=4):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); COL.objects.link(o); me.materials.append(m)
    if smooth:
        for p in me.polygons: p.use_smooth = True
        try: me.set_sharp_from_angle(angle=math.radians(35))
        except Exception: pass
    if bev:
        md = o.modifiers.new('bev', 'BEVEL'); md.width = bev; md.segments = seg; md.limit_method = 'ANGLE'; md.harden_normals = True
    return o

def box(name, c, size, m, bev=0.02, rot=0.0):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1)
    bmesh.ops.scale(bm, vec=size, verts=bm.verts)
    if rot: bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(rot, 3, 'Z'))
    bmesh.ops.translate(bm, vec=c, verts=bm.verts)
    return finish(name, bm, m, min(bev, *[s * 0.45 for s in size]), smooth=False)

def cyl(name, c, r, h, m, seg=40, top=1.0, bev=0.012, ry=None, axis='Z'):
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=seg, radius1=1, radius2=top, depth=1)
    bmesh.ops.scale(bm, vec=(r, ry or r, h), verts=bm.verts)
    if axis == 'X': bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 2, 3, 'Y'))
    if axis == 'Y': bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 2, 3, 'X'))
    bmesh.ops.translate(bm, vec=c, verts=bm.verts)
    return finish(name, bm, m, min(bev, r * 0.3, h * 0.3))

def ball(name, c, r, m, seg=32):
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=seg // 2 + 2, radius=1)
    bmesh.ops.scale(bm, vec=r if isinstance(r, tuple) else (r, r, r), verts=bm.verts)
    bmesh.ops.translate(bm, vec=c, verts=bm.verts)
    return finish(name, bm, m)

def torus(name, c, R, r, m, axis=None):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, major_segments=40, minor_segments=12, location=c)
    o = bpy.context.active_object
    if axis: o.rotation_euler = axis
    for cl in o.users_collection: cl.objects.unlink(o)
    COL.objects.link(o); o.data.materials.append(m)
    for p in o.data.polygons: p.use_smooth = True
    return o

# ---------------------------------------------------------------- materials
WOOD = mat('wood', '#9C6844', 0.55, coat=0.2)
WOODD = mat('wooddark', '#4E3020', 0.6)
WOODL = mat('woodlight', '#C99A6C', 0.5, coat=0.25)
PLANK = [mat('plank0', '#6E4A36', 0.6), mat('plank1', '#634130', 0.6)]
RED = mat('red', '#D7432F', 0.6, sss=0.05)
REDDK = mat('reddark', '#A52E22', 0.6)
CREAM = mat('cream', '#FFF1DA', 0.5)
WHITE = mat('white', '#F8F6F1', 0.25, coat=0.4)
STEEL = mat('steel', '#C9D2D9', 0.22, metal=0.85)
STEELD = mat('steeldark', '#59636B', 0.35, metal=0.6)
BLACK = mat('black', '#202428', 0.45)
WATER = mat('water', '#9FD3EA', 0.05, emit='#A8E3FF', es=0.4, coat=1)
BROTH = mat('broth', '#C9822E', 0.15, coat=1, sss=0.2)
NOODLE = mat('noodle', '#F4D98A', 0.5, sss=0.3)
YOLK = mat('yolk', '#F5A623', 0.35, sss=0.4)
NEGI = mat('negi', '#6FC24A', 0.4, sss=0.3)
PINK = mat('pink', '#EE7FA0', 0.5)
LANTERN = mat('lantern', '#FFD9A0', 0.5, emit='#FF9D45', es=14)
GLOW = mat('glow', '#FFE2A8', 0.5, emit='#FFB45E', es=10)
NIGHT = mat('night', '#000000', 1, emit='#1A2C5C', es=1.6)
HOUSE = mat('house', '#2A2F45', 0.8)
ROOF = mat('roof', '#1E2438', 0.6)
STREET = mat('street', '#1B2238', 0.08, coat=1, metal=0.2)
HYD = [mat('hyd0', '#5B7BEA', 0.6, sss=0.3), mat('hyd1', '#8E6AD8', 0.6, sss=0.3), mat('hyd2', '#4C9BE0', 0.6, sss=0.3)]
LEAF = mat('leaf', '#3F7F3A', 0.5, sss=0.2)
JARS = [mat('jar%d' % i, c, 0.3, coat=0.5) for i, c in enumerate(['#E9C79B', '#A7BF8A', '#D96F45', '#F0C27A', '#B48AB3'])]
SKIN = mat('skin', '#FFC9A0', 0.55, sss=0.35)
HAIR = mat('hair', '#5A2E1C', 0.5, coat=0.3)
KIMONO = mat('kimono', '#D8473A', 0.65, sss=0.05)
CHEEK = mat('cheek', '#FF8C8C', 0.6, sss=0.3)
EYE = mat('eye', '#1A1110', 0.15, coat=1)
BLUE = mat('blue', '#2E5BB8', 0.4)
RAIN = mat('rain', '#B9D6FF', 0.1, emit='#9CC3FF', es=0.6, alpha=0.35)

# ---------------------------------------------------------------- shared pieces
def noren(y, x0=-2.6, x1=2.6, z=2.35):
    n = 5; w = (x1 - x0) / n
    box('norenbar', (0, y, z + 0.18), (x1 - x0 + 0.3, 0.12, 0.12), WOODD, 0.03)
    for i in range(n):
        box('noren', (x0 + w * (i + 0.5), y - 0.02, z + 0.02), (w - 0.05, 0.03, 0.26), RED, 0.012)

def lantern(c, r=0.22):
    cyl('lcap', (c[0], c[1], c[2] + r * 1.15), r * 0.65, 0.07, BLACK)
    ball('lantern', c, (r, r, r * 1.2), LANTERN)
    cyl('lfoot', (c[0], c[1], c[2] - r * 1.15), r * 0.65, 0.07, BLACK)
    for k in (-0.6, -0.2, 0.2, 0.6): torus('rib', (c[0], c[1], c[2] + k * r), r * math.sqrt(1 - k * k * 0.7) * 1.01, 0.006, REDDK)
    L = bpy.data.lights.new('lanternlight', 'POINT'); L.energy = 70; L.color = lin('#FFA14A'); L.shadow_soft_size = 0.2
    o = bpy.data.objects.new('lanternlight', L); o.location = (c[0], c[1] - 0.15, c[2]); COL.objects.link(o)

def bowl(c, r=0.2, full=False):
    cyl('bowl', (c[0], c[1], c[2] + 0.07), r * 0.62, 0.14, WHITE, top=1 / 0.62, bev=0.01)
    for i in range(10):  # red stripes
        a = i / 10 * math.tau
        box('stripe', (c[0] + math.cos(a) * r * 0.82, c[1] + math.sin(a) * r * 0.82, c[2] + 0.075), (0.025, 0.012, 0.12), RED, 0.004, rot=a + math.pi / 2)
    torus('rim', (c[0], c[1], c[2] + 0.14), r, 0.012, WHITE)
    if full:
        cyl('soup', (c[0], c[1], c[2] + 0.125), r * 0.95, 0.01, BROTH)
        for k in range(5): torus('nd', (c[0] + random.uniform(-.06, .06), c[1] + random.uniform(-.06, .06), c[2] + 0.135), 0.05, 0.012, NOODLE)

def egg(c):
    ball('eggw', c, (0.07, 0.055, 0.035), WHITE); ball('yolk', (c[0], c[1], c[2] + 0.02), (0.04, 0.032, 0.02), YOLK)

def tray(c, kind):
    box('tray', (c[0], c[1], c[2] + 0.025), (0.42, 0.26, 0.05), STEEL, 0.015)
    if kind == 'tamago':
        for dx, dy in [(-0.11, -0.04), (0.0, 0.03), (0.11, -0.03)]: egg((c[0] + dx, c[1] + dy, c[2] + 0.065))
    elif kind == 'negi':
        for k in range(14): cyl('negi', (c[0] + random.uniform(-.15, .15), c[1] + random.uniform(-.08, .08), c[2] + 0.06), 0.022, 0.015, NEGI, 16, bev=0.003)
    elif kind == 'naruto':
        for dx in (-0.1, 0.0, 0.1):
            cyl('naruto', (c[0] + dx, c[1], c[2] + 0.07), 0.06, 0.03, WHITE, 24, bev=0.006); cyl('swirl', (c[0] + dx, c[1], c[2] + 0.086), 0.028, 0.004, PINK, 16, bev=0)

def street(y0=3.0):
    """the rainy street behind the stall: wet road, little houses with lit windows, hydrangeas, a far sky"""
    box('road', (0, y0 + 3, -0.02), (16, 8, 0.04), STREET, 0)
    box('sky', (0, y0 + 9, 3), (24, 0.1, 8), NIGHT, 0)
    for side in (-1, 1):
        for i in range(4):
            x = side * (2.0 + i * 1.6 + random.uniform(-0.2, 0.2)); y = y0 + 0.8 + i * 1.6; h = 1.6 + random.uniform(0, 0.6)
            box('house', (x, y, h / 2), (1.4, 1.2, h), HOUSE, 0.04)
            cyl('roof', (x, y, h + 0.28), 1.05, 0.56, ROOF, 4, top=0.05, bev=0.02)
            for wx in (-0.35, 0.35): box('win', (x + wx, y - 0.61, h * 0.55), (0.32, 0.03, 0.42), GLOW, 0.01)
            lantern((x - side * 0.75, y - 0.65, 1.4), 0.12)
            for k in range(5): ball('hyd', (x - side * 0.2 + random.uniform(-.5, .5), y - 0.8, 0.22 + random.uniform(0, .15)), random.uniform(.16, .24), HYD[k % 3], 16)
    for k in range(140):  # rain
        box('rain', (random.uniform(-6, 6), random.uniform(y0, y0 + 6), random.uniform(0.2, 4)), (0.006, 0.006, random.uniform(0.25, 0.5)), RAIN, 0)

def setup(name):
    global COL
    for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
    for c in list(bpy.data.collections): bpy.data.collections.remove(c)
    COL = bpy.data.collections.new(name); bpy.context.scene.collection.children.link(COL)

def camera(loc, look, lens=32):
    cam = bpy.data.cameras.new('cam'); cam.lens = lens
    o = bpy.data.objects.new('cam', cam); COL.objects.link(o); o.location = loc
    d = Vector(look) - Vector(loc); o.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    bpy.context.scene.camera = o

def light(name, kind, loc, energy, col, size=1.0, look=None):
    L = bpy.data.lights.new(name, kind); L.energy = energy; L.color = lin(col)
    if kind == 'AREA': L.size = size
    else: L.shadow_soft_size = size
    o = bpy.data.objects.new(name, L); COL.objects.link(o); o.location = loc
    if look: o.rotation_euler = (Vector(look) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()

def render(path):
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    try:
        prefs = bpy.context.preferences.addons['cycles'].preferences; prefs.compute_device_type = 'METAL'; prefs.get_devices()
        for dv in prefs.devices: dv.use = True
        sc.cycles.device = 'GPU'
    except Exception: pass
    sc.cycles.samples = SAMPLES; sc.cycles.use_denoising = True
    sc.render.resolution_x, sc.render.resolution_y = 1600, 728
    sc.view_settings.view_transform = 'AgX'
    try: sc.view_settings.look = 'AgX - Medium High Contrast'
    except Exception: pass
    sc.view_settings.exposure = -0.25
    w = bpy.data.worlds.get('w') or bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = (*lin('#1A2448'), 1); w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.5
    sc.use_nodes = True; nt = sc.node_tree
    for n in list(nt.nodes): nt.nodes.remove(n)
    rl = nt.nodes.new('CompositorNodeRLayers'); out = nt.nodes.new('CompositorNodeComposite')
    try:
        gl = nt.nodes.new('CompositorNodeGlare'); gl.glare_type = 'FOG_GLOW'; gl.threshold = 1.0; gl.size = 7; gl.mix = -0.5
        nt.links.new(rl.outputs['Image'], gl.inputs['Image']); nt.links.new(gl.outputs['Image'], out.inputs['Image'])
    except Exception:
        nt.links.new(rl.outputs['Image'], out.inputs['Image'])
    sc.render.filepath = path; bpy.ops.render.render(write_still=True)

# ================================================================ the cook's kitchen
setup('kitchen')
# back wall of planks, a shelf of jars, a window onto the rainy street, the pass on the right
for i in range(26): box('plank', (-3.25 + i * 0.25, 1.3, 1.6), (0.24, 0.1, 3.2), PLANK[i % 2], 0.01)
box('shelf', (-0.6, 1.17, 1.75), (1.9, 0.26, 0.06), WOODL, 0.02)
for i in range(5):
    x = -1.3 + i * 0.36
    box('jar', (x, 1.15, 1.92), (0.26, 0.22, 0.3), JARS[i], 0.06); box('jarlid', (x, 1.15, 2.1), (0.27, 0.23, 0.06), WOODD, 0.02)
box('winframe', (2.05, 1.2, 1.55), (1.5, 0.12, 1.1), WOODD, 0.03)
box('winview', (2.05, 1.24, 1.55), (1.3, 0.05, 0.92), NIGHT, 0)
box('winbar', (2.05, 1.16, 1.55), (0.05, 0.05, 0.92), WOODD, 0.01); box('winbar', (2.05, 1.16, 1.55), (1.3, 0.05, 0.05), WOODD, 0.01)
for k in range(4): ball('winhyd', (1.6 + k * 0.28, 1.15, 1.08 + (k % 2) * 0.04), 0.1, HYD[k % 3], 16)
box('winglow', (2.3, 1.16, 1.75), (0.1, 0.02, 0.14), GLOW, 0.01)
lantern((-2.5, 0.9, 2.0), 0.26)
box('hook', (-2.0, 1.2, 1.3), (0.7, 0.06, 0.05), WOODD, 0.01)
# the worktop and the cabinet under it
box('counter', (0, 0.25, 0.42), (6.2, 1.5, 0.84), WOOD, 0.04)
for i in range(6): box('door', (-2.6 + i * 1.04, -0.51, 0.42), (0.96, 0.03, 0.7), WOODD, 0.03)
box('worktop', (0, 0.25, 0.87), (6.3, 1.6, 0.07), STEEL, 0.03)
# the big noodle pot and its burner, the broth pot with a ladle
cyl('burner', (-0.6, 0.45, 0.93), 0.5, 0.06, BLACK)
cyl('pot', (-0.6, 0.45, 1.1), 0.46, 0.3, STEEL, 48, bev=0.02)
cyl('water', (-0.6, 0.45, 1.235), 0.43, 0.02, WATER, 48, bev=0)
for k in range(12): ball('bubble', (-0.6 + random.uniform(-.3, .3), 0.45 + random.uniform(-.3, .3), 1.25), 0.025 + random.random() * 0.02, WHITE, 12)
cyl('basket', (-1.15, 0.2, 1.2), 0.13, 0.16, STEELD, 24, top=1.1, bev=0.004)
box('baskethandle', (-1.42, 0.2, 1.35), (0.45, 0.04, 0.04), WOODD, 0.01, rot=0.2)
cyl('burner2', (0.75, 0.6, 0.93), 0.34, 0.06, BLACK)
cyl('brothpot', (0.75, 0.6, 1.08), 0.3, 0.26, STEEL, 40, bev=0.02)
cyl('broth', (0.75, 0.6, 1.2), 0.28, 0.02, BROTH, 40, bev=0)
box('ladle', (0.92, 0.5, 1.42), (0.03, 0.03, 0.55), STEEL, 0.008, rot=0); ball('ladlecup', (0.85, 0.55, 1.2), (0.08, 0.08, 0.04), STEEL)
for k in range(6): ball('steam', (0.75 + random.uniform(-.15, .15), 0.6, 1.4 + k * 0.12), 0.08 + k * 0.02, mat('steamm', '#FFFFFF', 1, alpha=0.18), 16)
# bowls ready to fill, the toppings, the noodle box
bowl((0.25, -0.1, 0.9)); bowl((0.85, -0.12, 0.9), full=True)
box('nbox', (-2.15, -0.05, 0.95), (0.8, 0.5, 0.12), WOODL, 0.02)
for k in range(3): torus('nest', (-2.4 + k * 0.25, -0.05, 1.02), 0.08, 0.035, NOODLE)
tray((1.65, -0.15, 0.9), 'tamago'); tray((2.15, 0.25, 0.9), 'negi'); tray((1.65, 0.35, 0.9), 'naruto')
# the pass hatch on the right
box('pass', (2.75, 0.9, 1.45), (0.9, 0.5, 1.1), WOODD, 0.04)
box('passin', (2.75, 0.7, 1.4), (0.7, 0.2, 0.8), mat('dark', '#120A06', 0.9), 0.02)
box('passsign', (2.75, 0.62, 2.0), (0.84, 0.05, 0.22), RED, 0.02)
noren(-0.2)
light('key', 'AREA', (-1.5, -3.2, 3.6), 300, '#FFE2C2', 4, look=(0, 0.4, 0.9))
light('fill', 'AREA', (2.5, -2.5, 2.2), 120, '#FFB27A', 3, look=(0, 0.4, 1))
light('rim', 'AREA', (0, 2.8, 3.5), 140, '#7FA8FF', 3, look=(0, 0, 1))
camera((0, -3.7, 3.5), (0.1, 0.55, 0.85), 28)
render(os.path.join(OUT, 'kitchen.png'))

# ================================================================ the counter
setup('counter')
street(1.4)
# the stall's frame: posts, roof edge with the noren, lanterns, the ラーメン banner
for x in (-2.9, 2.9): box('post', (x, 0.3, 1.2), (0.2, 0.2, 2.6), WOOD, 0.04)
box('roofbeam', (0, 0.3, 2.45), (6.2, 0.4, 0.2), WOODD, 0.04)
noren(0.05, z=2.35)
lantern((-2.45, 0.1, 1.85), 0.26); lantern((2.45, 0.1, 1.85), 0.26)
box('banner', (-1.5, 1.6, 1.4), (0.3, 0.04, 1.1), RED, 0.02); box('bannerpole', (-1.7, 1.6, 1.3), (0.04, 0.04, 2.4), WOODD, 0.01)
# the counter in front, the pass box on the left
box('counterfront', (0, -0.55, 0.45), (6.2, 0.2, 0.9), WOOD, 0.04)
for i in range(6): box('panel', (-2.6 + i * 1.04, -0.67, 0.42), (0.96, 0.03, 0.7), WOODD, 0.03)
box('countertop', (0, -0.3, 0.93), (6.3, 0.75, 0.08), WOODL, 0.03)
box('passbox', (-2.15, -0.15, 1.3), (1.0, 0.5, 0.7), WOODD, 0.04)
box('passin', (-2.15, -0.38, 1.28), (0.82, 0.05, 0.5), mat('dark2', '#1A0E08', 0.9), 0.02)
box('passsign', (-2.15, -0.42, 1.55), (0.9, 0.05, 0.18), RED, 0.02)
box('passtray', (-2.15, -0.55, 0.99), (0.8, 0.35, 0.04), WOODL, 0.02)
# the teapot and a cup
ball('teapot', (2.1, -0.4, 1.12), (0.2, 0.2, 0.17), WHITE)
cyl('teapotlid', (2.1, -0.4, 1.3), 0.08, 0.04, WHITE); ball('knob', (2.1, -0.4, 1.34), 0.03, BLUE, 12)
box('spout', (2.32, -0.4, 1.17), (0.18, 0.05, 0.05), WHITE, 0.02, rot=0); torus('handle', (2.1, -0.4, 1.36), 0.14, 0.015, BLACK, axis=(0, math.pi / 2, 0))
for k in range(3): torus('wave', (2.1, -0.4, 1.06 + k * 0.05), 0.195 - k * 0.01, 0.006, BLUE)
cyl('cup', (0.55, -0.45, 1.03), 0.07, 0.12, WHITE, 24, top=1.15); torus('cupline', (0.55, -0.45, 1.0), 0.072, 0.006, BLUE)
# a guest on a stool behind the counter: a chunky toy figure (the game keeps drawing the face)
gx, gy = 0.15, 0.25
cyl('stool', (gx, gy + 0.05, 0.35), 0.22, 0.7, WOODD)
cyl('body', (gx, gy, 1.12), 0.32, 0.55, KIMONO, 32, top=0.82, bev=0.1)
box('collar', (gx, gy - 0.27, 1.32), (0.18, 0.06, 0.2), CREAM, 0.03)
for s in (-1, 1): ball('arm', (gx + s * 0.27, gy - 0.22, 1.05), (0.1, 0.13, 0.1), KIMONO, 20); ball('hand', (gx + s * 0.22, gy - 0.36, 1.0), 0.07, SKIN, 16)
ball('head', (gx, gy - 0.02, 1.72), (0.33, 0.3, 0.3), SKIN)
ball('hair', (gx, gy + 0.03, 1.82), (0.36, 0.33, 0.26), HAIR)
box('bangs', (gx, gy - 0.25, 1.86), (0.5, 0.1, 0.12), HAIR, 0.05)
ball('bun', (gx + 0.05, gy + 0.18, 2.06), 0.13, HAIR); ball('bow', (gx - 0.12, gy + 0.1, 2.05), (0.07, 0.05, 0.05), RED, 16)
for s in (-1, 1):
    ball('eye', (gx + s * 0.11, gy - 0.3, 1.7), (0.035, 0.02, 0.045), EYE, 16)
    ball('cheek', (gx + s * 0.18, gy - 0.27, 1.62), (0.05, 0.02, 0.03), CHEEK, 16)
torus('mouth', (gx, gy - 0.31, 1.6), 0.02, 0.006, EYE, axis=(math.pi / 2, 0, 0))
cyl('stool2', (gx + 1.4, gy + 0.05, 0.35), 0.22, 0.7, WOODD)
light('key', 'AREA', (-1.2, -3.4, 3.4), 260, '#FFE0BC', 4, look=(0, 0, 1.2))
light('fill', 'AREA', (2.6, -2.2, 2.0), 120, '#FFB27A', 3, look=(0, 0, 1.2))
light('rim', 'AREA', (1.5, 2.2, 3.0), 260, '#7FA8FF', 3, look=(gx, gy, 1.6))
camera((0, -4.6, 2.75), (0.1, 0.9, 1.25), 28)
render(os.path.join(OUT, 'counter.png'))
print('DONE')
