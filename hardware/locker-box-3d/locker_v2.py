# Key locker box v2: 3 compartments with bottom doors (SG90 each, pin hinge at the front),
# 4th SG90 in a side tower turns the top lid (barrel hinge at the back), servo bay 34 mm deep,
# rear panel slides up out of grooves for servo access.
# blender --background --python locker_v2.py -- <outdir> [render]
import bpy, math, sys, os, mathutils
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:]
OUT = os.path.abspath(argv[0])
RENDER = len(argv) > 1
os.makedirs(OUT, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)

W, C, D, N = 2.0, 40.0, 40.0, 3
PITCH = C + W
XC = N * C + (N + 1) * W                 # 128: compartment block
Y_BACK = W + D                           # 42
Y_BAY0, Y_BAY1 = Y_BACK + W, 78.0        # bay 34 deep
AXZ, DOOR_Z0, DOOR_Z1 = 12.0, 10.5, 13.5
ZT = DOOR_Z1 + 60.0                      # 73.5 top of compartments
LID_T, BR = 2.4, 5.0
ZR = ZT + 6.0                            # rear block / tower height
HY, HZ = 45.0, ZT + LID_T - BR           # lid hinge axis (70.9)
FLOOR = 1.0
XS = XC + 2.0                            # lid servo top face (wall 126..130)
TOW1 = XS + 22.7 + 17.5                  # tower inside end (room to slide the servo past the rear post, off the horn)
XT = TOW1 + W                            # 159.2
FR0, SL0, SL1 = Y_BAY1, Y_BAY1 + 1.5, Y_BAY1 + 3.9   # rear frame, panel slot
YT = SL1 + 1.5                           # 83.4
SH = 66.0
LS_Y = [HY + 5.45 - 13.9, HY + 5.45 + 13.9]          # lid servo screw holes (y)


def cl(i):
    return W + i * PITCH


def ax(i):
    return cl(i) + 8.0


def box(name, x0, x1, y0, y1, z0, z1):
    bpy.ops.mesh.primitive_cube_add(size=1, location=((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2))
    o = bpy.context.object
    o.name = name
    o.scale = (x1 - x0, y1 - y0, z1 - z0)
    bpy.ops.object.transform_apply(scale=True)
    return o


def cyl(name, r, axis, c, length, seg=48):
    rot = {'x': (0, math.pi / 2, 0), 'y': (math.pi / 2, 0, 0), 'z': (0, 0, 0)}[axis]
    bpy.ops.mesh.primitive_cylinder_add(vertices=seg, radius=r, depth=length, location=c, rotation=rot)
    o = bpy.context.object
    o.name = name
    bpy.ops.object.transform_apply(rotation=True)
    return o


def boolean(target, others, op, solver='MANIFOLD'):
    for c in others:
        m = target.modifiers.new('b', 'BOOLEAN')
        m.operation = op
        m.object = c
        try:
            m.solver = solver
        except TypeError:
            m.solver = 'EXACT'
        bpy.context.view_layer.objects.active = target
        bpy.ops.object.modifier_apply(modifier=m.name)
        bpy.data.objects.remove(c)
    return target


def text(body, size, x, y, z, depth):
    cu = bpy.data.curves.new('t', 'FONT')
    cu.body = body
    cu.size = size
    cu.extrude = depth
    cu.align_x, cu.align_y = 'CENTER', 'CENTER'
    o = bpy.data.objects.new('t', cu)
    bpy.context.collection.objects.link(o)
    o.rotation_euler = (math.pi / 2, 0, 0)
    o.location = (x, y, z)
    bpy.context.view_layer.objects.active = o
    o.select_set(True)
    bpy.ops.object.convert(target='MESH')
    o.select_set(False)
    return o


def set_pivot(o, piv):
    o.data.transform(mathutils.Matrix.Translation(-piv))
    o.location = piv


# ---------------- box ----------------
def make_box():
    b = box('Box', 0, XT, 0, YT, 0, ZR)
    cut = [box('top', -1, XC - W, -1, Y_BAY0, ZT, ZR + 1)]               # compartments only ZT high
    for i in range(N):
        cut.append(box('c', cl(i), cl(i) + C, W, Y_BACK, -1, ZR + 1))
        cut.append(cyl('h', 6.1, 'y', (ax(i), Y_BACK + W / 2, AXZ), W + 2))   # door servo gear boss
        cut.append(cyl('pin', 1.75, 'y', (ax(i), 1.6, AXZ), 1.4, 24))          # door pin hole (blind)
    cut += [box('bay', W, XC - W, Y_BAY0, Y_BAY1, FLOOR, ZR - 2),
            box('tower', XS, TOW1, W, Y_BAY1, FLOOR, ZR - 2),
            cyl('seat', BR + 0.5, 'x', ((W + XC - W) / 2, HY, HZ), XC - 2 * W),  # lid barrel seat
            box('seat2', W, XC - W, HY - BR - 0.5, HY + BR + 0.5, HZ, ZR + 1),
            cyl('boss', 6.1, 'x', (XC, HY, HZ), 6),                              # lid servo gear boss
            cyl('cable', 5, 'x', (XC, 70, 40), 6),                               # bay <-> tower
            box('frame', 3.5, XT - 3.5, FR0 - 1, YT + 1, FLOOR + 1.5, ZR + 1),   # rear opening
            box('roof', -1, XT + 1, -1, YT + 1, ZR - 2, ZR + 1),                 # roof is a separate cover
            box('slot', W, XT - W, SL0, SL1, FLOOR, ZR + 1)]                     # panel groove
    for y in LS_Y:                                                               # screwdriver holes
        cut.append(cyl('sd', 3, 'x', (XT - 1, y, HZ), 4))
    boolean(b, cut, 'DIFFERENCE')
    add = [cyl('ear', BR, 'x', (1, HY, HZ), 2), cyl('lpin', 1.8, 'x', (3.65, HY, HZ), 4.3, 32)]
    for i in range(N):                     # M2 screw bosses for the door servo tabs
        for hz in (AXZ + 5.25 - 13.9, AXZ + 5.25 + 13.9):
            add.append(cyl('boss', 2.6, 'y', (ax(i), Y_BAY0 + 3.4, hz), 6.8, 32))
    for y in LS_Y:                         # posts for the lid servo tabs
        add.append(cyl('post', 2.6, 'x', (XS + 3.4, y, HZ), 6.8, 32))
    boolean(b, add, 'UNION')
    holes = []
    for i in range(N):
        for hz in (AXZ + 5.25 - 13.9, AXZ + 5.25 + 13.9):
            holes.append(cyl('sh', 0.85, 'y', (ax(i), Y_BAY0 + 4.4, hz), 7, 16))
    for y in LS_Y:
        holes.append(cyl('sh', 0.85, 'x', (XS + 4.4, y, HZ), 7, 16))
    boolean(b, holes, 'DIFFERENCE')
    nums = [text(str(i + 1), 16, cl(i) + C / 2, 0.8, ZT / 2 + 10, 1.0) for i in range(N)]
    boolean(b, nums, 'DIFFERENCE', 'EXACT')
    return b


def make_door(i):
    x0, a = cl(i), ax(i)
    d = box('Door%d' % (i + 1), x0 + 0.6, x0 + C - 0.6, W + 0.6, Y_BACK - 0.5, DOOR_Z0, DOOR_Z1)
    boolean(d, [box('rib', x0 + 3, x0 + 30, 31, Y_BACK - 0.5, DOOR_Z1 - 0.5, DOOR_Z1 + 4.5),
                cyl('pin', 1.4, 'y', (a, 2.15, AXZ), 1.9, 24)], 'UNION')          # front hinge pin
    cut = [cyl('dome', 6.6, 'y', (a, Y_BACK, AXZ), 6),
           cyl('hub', 4.2, 'y', (a, 37, AXZ), 6),
           box('arm', a, a + 19, 35.0, 37.2, AXZ - 3.2, AXZ + 3.2)]
    for hx in (a + 9, a + 13, a + 16):
        cut.append(cyl('s', 0.6, 'y', (hx, 33, AXZ), 8, 12))
    boolean(d, cut, 'DIFFERENCE')
    set_pivot(d, Vector((a, 0, AXZ)))
    return d


def make_lid():
    x0, x1 = W + 0.3, XC - W - 0.5
    l = box('Lid', x0, x1, 0, HY, ZT, ZT + LID_T)
    boolean(l, [cyl('barrel', BR, 'x', ((x0 + x1) / 2, HY, HZ), x1 - x0, 64),
                box('rib', x1 - 13.5, x1, 22, HY, ZT - 6.4, ZT + 0.5)], 'UNION')
    cut = [cyl('pinhole', 2.1, 'x', (x0 + 1.75, HY, HZ), 5.5, 32),
           cyl('dome', 6.6, 'x', (XS - 2.25, HY, HZ), 4.5),
           cyl('hub', 4.2, 'x', (XS - 7, HY, HZ), 6),
           box('arm', XS - 9.2, XS - 7.0, HY - 19, HY, HZ - 3.2, HZ + 3.2)]
    for hy in (9, 13, 16):
        cut.append(cyl('s', 0.6, 'x', (XS - 13, HY - hy, HZ), 8, 12))
    boolean(l, cut, 'DIFFERENCE')
    set_pivot(l, Vector((0, HY, HZ)))
    return l


def make_panel():
    top = ZR - 2.1
    p = box('Panel', W + 0.3, XT - W - 0.3, SL0 + 0.2, SL1 - 0.2, FLOOR + 0.1, top)
    boolean(p, [box('notch', XC / 2 - 8, XC / 2 + 8, SL0 - 1, SL1 + 1, 0, FLOOR + 11),     # cables
                cyl('grip', 8, 'y', (XT / 2, SL0 + 1.2, top), 4)], 'DIFFERENCE')
    return p


def make_cover():
    # roof over the servo bay and the tower: lies on the walls, rims inside the openings keep it in place,
    # and it holds the rear panel down
    z0, y0 = ZR - 2, HY + BR + 0.5
    c = box('Cover', 0, XT, y0, YT, z0, ZR)
    rims = [box('t', XC - W, XT, 0, y0 + 1, z0, ZR)]
    g, d = 0.3, 3.0                                       # gap to the walls, rim depth
    bx0, bx1, by0, by1 = W + g, XC - W - g, y0 + g, Y_BAY1 - g          # bay opening
    for r in [(bx0, bx0 + 1.2, by0, by1), (bx1 - 1.2, bx1, by0, by1), (bx0, bx1, by0, by0 + 1.2), (bx0, bx1, by1 - 1.2, by1)]:
        rims.append(box('r', r[0], r[1], r[2], r[3], z0 - d, z0 + 0.1))
    tx1, ty0, ty1 = TOW1 - g, W + g, Y_BAY1 - g                        # tower opening (servo side left free)
    for r in [(tx1 - 1.2, tx1, ty0, ty1), (XS + 25, tx1, ty0, ty0 + 1.2), (XS + 25, tx1, ty1 - 1.2, ty1)]:
        rims.append(box('r', r[0], r[1], r[2], r[3], z0 - d, z0 + 0.1))
    boolean(c, rims, 'UNION')
    boolean(c, [box('grip', XT - 30, XT - 10, YT - 6, YT + 1, ZR - 1.2, ZR + 1)], 'DIFFERENCE')   # finger notch
    return c


def make_stand():
    SX, SY, o = XT + 8, YT + 8, 4.0
    s = box('Stand', 0, SX, 0, SY, 0, SH + 3)
    cut = [box('in', 2, SX - 2, -1, SY - 2, 2, SH - 4),
           box('hole', 6, SX - 6, 6, SY - 6, 1.9, SH + 4),
           box('seat', o - 0.4, o + XT + 0.4, o - 0.4, o + YT + 0.4, SH, SH + 4),
           box('win', -1, SX + 1, 14, SY - 14, 12, SH - 14)]
    boolean(s, cut, 'DIFFERENCE')
    return s


def make_tray(x0, x1, y1, z0):
    t = box('Tray', x0, x1, 0, y1, z0, z0 + 25)
    boolean(t, [box('in', x0 + 1.6, x1 - 1.6, 1.6, y1 - 1.6, z0 + 1.6, z0 + 30)], 'DIFFERENCE')
    boolean(t, [cyl('grip', 9, 'y', ((x0 + x1) / 2, 0.8, z0 + 25), 6)], 'DIFFERENCE')
    return t


def export(o, name):
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.ops.wm.stl_export(filepath=os.path.join(OUT, name), export_selected_objects=True)


bx = make_box()
doors = [make_door(i) for i in range(N)]
lid = make_lid()
panel = make_panel()
cover = make_cover()
stand = make_stand()
tray = make_tray(2.5, XT + 8 - 2.5, YT + 8 - 3, 2)
off = Vector((4, 4, SH))
for o in [bx, lid, panel, cover] + doors:
    o.location += off
allp = [bx, lid, panel, cover, stand, tray] + doors
for o in allp:
    d = o.dimensions
    print('PART %-8s %6.1f x %6.1f x %6.1f  faces %d' % (o.name, d.x, d.y, d.z, len(o.data.polygons)))


def print_copy(objs, rot, gap=8.0):
    copies = []
    for o in objs:
        c = o.copy(); c.data = o.data.copy()
        bpy.context.collection.objects.link(c)
        c.data.transform(c.matrix_world); c.matrix_world = mathutils.Matrix.Identity(4)
        c.data.transform(mathutils.Euler(rot).to_matrix().to_4x4())
        vs = [v.co for v in c.data.vertices]
        lo = mathutils.Vector([min(v[i] for v in vs) for i in range(3)])
        c.data.transform(mathutils.Matrix.Translation(-lo))
        copies.append(c)
    x = 0.0
    for c in copies:
        c.location.x = x
        x += c.dimensions.x + gap
    bpy.ops.object.select_all(action='DESELECT')
    for c in copies:
        c.select_set(True)
    bpy.context.view_layer.objects.active = copies[0]
    if len(copies) > 1:
        bpy.ops.object.join()
    j = bpy.context.object
    bpy.ops.object.transform_apply(location=True)
    vs = [v.co for v in j.data.vertices]
    ctr = mathutils.Vector([(min(v[i] for v in vs) + max(v[i] for v in vs)) / 2 for i in range(2)] + [0])
    j.data.transform(mathutils.Matrix.Translation(-ctr))
    return j


if not RENDER:
    P = math.pi
    jobs = {'box_white': ([bx], (0, 0, 0)),                 # upright; supports added in FlashPrint
            'lid_white': ([lid], (P, 0, 0)),                # top face on the bed
            'panel_white': ([panel], (P / 2, 0, 0)),        # flat
            'cover_white': ([cover], (P, 0, 0)),            # top face on the bed, rims up
            'stand_black': ([stand], (-P / 2, 0, 0)),       # on its back
            'tray_black': ([tray], (0, 0, 0)),
            'doors_red': (doors, (0, 0, 0))}
    for name, (objs, rot) in jobs.items():
        j = print_copy(objs, rot)
        d = j.dimensions
        print('PRINT %-12s %6.1f x %6.1f x %6.1f' % (name, d.x, d.y, d.z))
        export(j, 'locker_%s.stl' % name)
        bpy.data.objects.remove(j)
    sys.exit(0)

# ---------------- render ----------------
def mat(name, rgb, rough=0.45):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes['Principled BSDF']
    p.inputs['Base Color'].default_value = (*rgb, 1)
    p.inputs['Roughness'].default_value = rough
    return m


def paint(o, m):
    o.data.materials.clear()
    o.data.materials.append(m)
    for p in o.data.polygons:
        p.material_index = 0


white, red = mat('white', (0.85, 0.85, 0.83)), mat('red', (0.75, 0.06, 0.05))
dark, blue = mat('dark', (0.06, 0.06, 0.07)), mat('blue', (0.05, 0.2, 0.8), 0.3)
gold = mat('gold', (0.85, 0.6, 0.2), 0.25)
gold.node_tree.nodes['Principled BSDF'].inputs['Metallic'].default_value = 1.0
for o in [bx, lid, panel, cover]:
    paint(o, white)
for o in doors:
    paint(o, red)
paint(tray, dark)
paint(stand, dark)

servos = []
for i in range(N):                                   # door SG90s, upright in the bay
    a = ax(i) + 4
    s = box('servo', a - 5.9, a + 5.9, Y_BAY0 + 4, Y_BAY0 + 22.7 + 4, AXZ - 6 + SH, AXZ + 16.5 + SH)
    t = box('tabs', a - 5.9, a + 5.9, Y_BAY0 + 6.8 + 4, Y_BAY0 + 9.3 + 4, AXZ - 11 + SH, AXZ + 21.5 + SH)
    servos += [s, t]
s = box('servo', XS + 4, XS + 22.5 + 4, HY - 5.9 + 4, HY + 16.8 + 4, HZ - 6.1 + SH, HZ + 6.1 + SH)   # lid SG90
t = box('tabs', XS + 6.8 + 4, XS + 9.3 + 4, HY + 5.45 - 16.15 + 4, HY + 5.45 + 16.15 + 4, HZ - 6.1 + SH, HZ + 6.1 + SH)
servos += [s, t]
for o in servos:
    paint(o, blue)


def key(x, y, z, rz):
    k = cyl('bow', 7, 'y', (0, 0, 0), 2.2)
    boolean(k, [cyl('ring', 3, 'y', (0, 0, 0), 4)], 'DIFFERENCE')
    bl = box('blade', -2.5, 2.5, -1.1, 1.1, -30, -6)
    boolean(k, [bl, box('bit', 2.5, 6, -1.1, 1.1, -26, -12)], 'UNION')
    k.location = (x, y, z)
    k.rotation_euler = (0, rz, 0)
    paint(k, gold)
    return k


sc = bpy.context.scene
sc.render.engine = 'CYCLES'
sc.cycles.device = 'CPU'
sc.cycles.samples = 48
sc.cycles.use_denoising = True
sc.render.resolution_x, sc.render.resolution_y = 1400, 1000
sc.view_settings.view_transform = 'AgX'
world = bpy.data.worlds.new('w')
sc.world = world
world.use_nodes = True
world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.9, 0.92, 0.95, 1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.6
bpy.ops.mesh.primitive_plane_add(size=2000, location=(XT / 2, 40, -0.01))
paint(bpy.context.object, mat('floor', (0.75, 0.75, 0.76), 0.8))
sun = bpy.data.lights.new('sun', 'SUN')
sun.energy = 3.5
sun.angle = math.radians(8)
so = bpy.data.objects.new('sun', sun)
so.rotation_euler = (math.radians(40), math.radians(-15), math.radians(-35))
sc.collection.objects.link(so)
area = bpy.data.lights.new('fill', 'AREA')
area.energy = 9e5
area.size = 300
ao = bpy.data.objects.new('fill', area)
ao.location = (-150, -300, 250)
sc.collection.objects.link(ao)
ao.rotation_euler = (Vector((XT / 2, 40, 60)) - ao.location).to_track_quat('-Z', 'Y').to_euler()

cam = bpy.data.cameras.new('cam')
cam.lens = 50
co = bpy.data.objects.new('cam', cam)
sc.collection.objects.link(co)
sc.camera = co


def shot(name, pos, tgt):
    co.location = pos
    co.rotation_euler = (Vector(tgt) - co.location).to_track_quat('-Z', 'Y').to_euler()
    sc.render.filepath = os.path.join(OUT, 'v2_%s.png' % name)
    bpy.ops.render.render(write_still=True)


shot('closed', Vector((-170, -420, 260)), (XT / 2 + 4, 40, 75))

lid.rotation_euler.x = math.radians(-90)              # lid open
doors[1].rotation_euler.y = math.radians(90)          # door 2 open
cover.location.z += 40                                # cover lifted off
cover.location.y += 15
panel.location.z += 45                                # rear panel pulled up
tray.location.y -= 25
key(cl(1) + C / 2 + 6, 26, SH - 24, 0.5)
key(cl(2) + 20 + 4, 10, 5, 1.57)
shot('open', Vector((-150, -400, 330)), (XT / 2 + 4, 40, 80))
shot('back', Vector((440, 460, 380)), (XT / 2 + 4, 45, 85))
panel.hide_render = True
cover.hide_render = True                              # rear panel removed: look into the tower
sc.render.resolution_x, sc.render.resolution_y = 1200, 1000
shot('tower', Vector((XT + 170, YT + 260, SH + 150)), (XS + 14, 50, SH + 62))
