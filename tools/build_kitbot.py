"""
Merge the 2026 KitBot CAD export (621 per-part glTF, 941 MB) into one small .glb.

Strategy
  · keep only world-positioned structural parts (hardware is local-space + invisible)
  · group parts into named sub-assemblies so the site can explode them
  · vertex-cluster decimate per group to hit a web triangle budget
  · add the 6 drive wheels procedurally (CAD wheels are 440k tris each, local-space)
  · write a single binary .glb, positions + normals + per-vertex colour
"""
import json, base64, glob, os, re, struct, sys
import numpy as np

SRC = r"C:\Users\noirh\Desktop\1635-technotics-site\assets\kitbot"
OUT = r"C:\Users\noirh\Desktop\1635-technotics-site\models\kitbot.glb"

CT = {5120: 'b', 5121: 'B', 5122: 'h', 5123: 'H', 5125: 'I', 5126: 'f'}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}

# ---------------------------------------------------------------- read glTF
def read_accessor(d, buffers, idx):
    a = d['accessors'][idx]
    bv = d['bufferViews'][a['bufferView']]
    buf = buffers[bv.get('buffer', 0)]
    off = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    n, comps = a['count'], NC[a['type']]
    dt = np.dtype(CT[a['componentType']])
    stride = bv.get('byteStride')
    if stride and stride != comps * dt.itemsize:
        out = np.empty((n, comps), dtype=dt)
        for i in range(n):
            out[i] = np.frombuffer(buf, dtype=dt, count=comps, offset=off + i * stride)
        return out
    return np.frombuffer(buf, dtype=dt, count=n * comps, offset=off).reshape(n, comps)


def load_part(path):
    try:
        d = json.load(open(path, encoding='utf-8'))
    except Exception:
        return None
    buffers = []
    for b in d.get('buffers', []):
        uri = b.get('uri', '')
        buffers.append(base64.b64decode(uri.split(',', 1)[1]) if uri.startswith('data:') else b'')
    V, F, C = [], [], []
    base = 0
    for mesh in d.get('meshes', []):
        for p in mesh['primitives']:
            if p.get('mode', 4) != 4:
                continue
            pos = read_accessor(d, buffers, p['attributes']['POSITION']).astype(np.float32)
            if 'indices' in p:
                idx = read_accessor(d, buffers, p['indices']).astype(np.uint32).ravel()
            else:
                idx = np.arange(len(pos), dtype=np.uint32)
            col = [0.55, 0.57, 0.58]
            mi = p.get('material')
            if mi is not None and mi < len(d.get('materials', [])):
                bc = d['materials'][mi].get('pbrMetallicRoughness', {}).get('baseColorFactor')
                if bc:
                    col = bc[:3]
            V.append(pos)
            F.append(idx.reshape(-1, 3) + base)
            C.append(np.tile(col, (len(pos), 1)))
            base += len(pos)
    if not V:
        return None
    return np.vstack(V), np.vstack(F).astype(np.uint32), np.vstack(C).astype(np.float32)


# ------------------------------------------------------- vertex clustering
def decimate(V, F, C, cell):
    """Weld vertices onto a grid, drop degenerate tris. Keeps mechanical silhouettes."""
    if cell <= 0 or len(F) == 0:
        return V, F, C
    q = np.floor(V / cell).astype(np.int64)
    _, first, inv = np.unique(q, axis=0, return_index=True, return_inverse=True)
    # representative position = mean of cluster (smoother than picking one)
    nV = np.zeros((inv.max() + 1, 3), np.float64)
    nC = np.zeros((inv.max() + 1, 3), np.float64)
    cnt = np.zeros(inv.max() + 1, np.int64)
    np.add.at(nV, inv, V)
    np.add.at(nC, inv, C)
    np.add.at(cnt, inv, 1)
    nV = (nV / cnt[:, None]).astype(np.float32)
    nC = (nC / cnt[:, None]).astype(np.float32)
    nF = inv[F]
    ok = (nF[:, 0] != nF[:, 1]) & (nF[:, 1] != nF[:, 2]) & (nF[:, 0] != nF[:, 2])
    return nV, nF[ok].astype(np.uint32), nC


def normals(V, F):
    N = np.zeros_like(V)
    tri = V[F]
    fn = np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0])
    for i in range(3):
        np.add.at(N, F[:, i], fn)
    ln = np.linalg.norm(N, axis=1, keepdims=True)
    ln[ln == 0] = 1
    return (N / ln).astype(np.float32)


# --------------------------------------------------------------- grouping
GROUPS = {
    'frame':    re.compile(r'$^'),   # catch-all bucket, filled by position not name
    'deck':     re.compile(r'Battery Floor|Battery C Plate|Battery Access|Battery Strap', re.I),
    'bumpers':  re.compile(r'Bumper', re.I),
    'intake':   re.compile(r'KB-26001|KB-26002|KB-26003|KB-26013|Flap|Intake', re.I),
    'hopper':   re.compile(r'Hopper|KB-26017|Panel Lock|KB-26009', re.I),
    'launcher': re.compile(r'Hood|KB-26010|KB-26012|KB-26016|KB-26019|Launcher', re.I),
    'power':    re.compile(r'battery|Robot Battery|PDH|Radio|RSL|Signal Light|Electronics Panel', re.I),
    'drive':    re.compile(r'ToughBox|Output Shaft|Hex Hub|CIM|Spur Gear|Pulley half|HTD Belt|Timing Belt|Stealth Wheel|20DP|Hex Spacer|Core|WCP-1439', re.I),
}
MIRROR = re.compile(r'KB-26001|KB-26005|KB-26013|KB-26010', re.I)
SKIP = re.compile(r'nut|screw|bolt|washer|bearing|spacer|dowel|klipring|insert|shcs|hhcs|'
                  r'fhts|collar|clip|breaker|SB50|Nylock|flange|button head|cap screw|'
                  r'Cluster Shaft|Shaft Clip', re.I)

# per-group decimation cell size in metres (robot is ~0.8 m across)
# Cell size in metres. Smaller = more detail. These were tuned by eye against
# file size: the whole robot is ~0.84 m across, so 0.8 mm cells keep visible
# fillets and bolt bosses while still welding away CAD's interior tessellation.
CELL = {
    'frame': 0.0012, 'deck': 0.0012, 'bumpers': 0.0010, 'intake': 0.00070,
    'hopper': 0.0011, 'launcher': 0.00065, 'power': 0.0013, 'drive': 0.0011,
}
# override the CAD's own colours where the part reads better in the site palette
TINT = {
    'bumpers': (0.85, 0.03, 0.13),
}


def classify(fname):
    for g, rx in GROUPS.items():
        if rx.search(fname):
            return g
    return None


def main():
    # glob() treats backslashes as escapes on this platform — scandir instead
    files = sorted(os.path.join(SRC, e.name) for e in os.scandir(SRC)
                   if e.is_file() and e.name.lower().endswith('.gltf'))
    print(f"scanned {len(files)} glTF files")
    buckets = {g: {'V': [], 'F': [], 'C': [], 'n': 0} for g in GROUPS}
    base = {g: 0 for g in GROUPS}
    used = 0

    # The export contains TWO coordinate frames:
    #   A · the assembled robot  (bumpers, intake, hopper, launcher, electronics)
    #   B · part-studio layout   (AM14U6 chassis plates lying flat, x out to 0.74)
    # Frame B parts are unrotated and unplaced, so they corrupt the merge.
    # Accept only geometry that sits inside the real assembly envelope.
    ENV_LO = np.array([-0.50, -0.50, -0.13])
    ENV_HI = np.array([ 0.50,  0.50,  0.60])
    rejected = []
    seen = set()          # (base name, rounded bbox) — duplicate instances are byte-copies

    for path in files:
        f = os.path.basename(path)
        if SKIP.search(f):
            continue
        g = classify(f)
        r = load_part(path)
        if r is None:
            continue
        V, F, C = r
        lo_p, hi_p = V.min(0), V.max(0)
        ctr = (lo_p + hi_p) / 2
        if max(abs(ctr)) < 0.02:                    # local-space library part
            continue
        if np.any(lo_p < ENV_LO) or np.any(hi_p > ENV_HI):
            rejected.append(f)
            continue
        # part-studio layout slab: thin sheet hugging the ground plane at +x
        if lo_p[1] > -0.03 and hi_p[1] < 0.06 and lo_p[2] > -0.10 and hi_p[2] < 0.02 and hi_p[0] > 0.25:
            rejected.append(f)
            continue
        stem = re.sub(r' \(\d+\)\.gltf$', '', f).replace('.gltf', '')
        key = (stem, tuple(np.round(lo_p, 4)), tuple(np.round(hi_p, 4)))
        if key in seen:            # stacked duplicate — placement was lost on export
            continue
        seen.add(key)
        # the churro instances all sit unplaced at the origin, buried in the
        # frame — drop them here; reconstruct() puts real standoffs back
        if 'Churro' in f and max(abs(ctr)) < 0.06:
            continue
        if not g:
            g = 'frame'          # world-placed, unnamed by any regex — keep it
        b = buckets[g]
        b['V'].append(V); b['F'].append(F + base[g]); b['C'].append(C)
        base[g] += len(V); b['n'] += 1
        used += 1
        # symmetric parts arrive with only ONE placement — emit the x-mirror
        # twin (flip x, reverse winding) for panels/plates/guides/pulleys
        if MIRROR.search(f) and abs(ctr[0]) > 0.05:
            Vm = V.copy(); Vm[:, 0] = -Vm[:, 0]
            Fm = F[:, ::-1].copy()
            b['V'].append(Vm); b['F'].append(Fm + base[g]); b['C'].append(C.copy())
            base[g] += len(Vm); b['n'] += 1

    print(f"merged {used} parts  ({len(rejected)} outside assembly envelope, dropped)")
    for f in rejected[:6]:
        print(f"    dropped: {f[14:70]}")

    # ---- assemble, decimate, collect
    parts, allV = [], []
    for g in GROUPS:
        b = buckets[g]
        if not b['V']:
            print(f"  {g:9} — empty"); continue
        V = np.vstack(b['V']); F = np.vstack(b['F']); C = np.vstack(b['C'])
        before = len(F)
        V, F, C = decimate(V, F, C, CELL[g])
        if g in TINT:
            C[:] = TINT[g]
        print(f"  {g:9} {b['n']:3} parts  {before:8,} → {len(F):7,} tris")
        parts.append((g, V, F, C))
        allV.append(V)

    # ---- procedural wheels (CAD wheels are 440k tris each and local-space)
    W = np.vstack(allV)
    lo, hi = W.min(0), W.max(0)
    print(f"\nbbox lo={np.round(lo,3)} hi={np.round(hi,3)} size={np.round(hi-lo,3)}")
    return parts, lo, hi


def _box(c, half, col):
    """Axis-aligned box as (V, F, C)."""
    sx, sy, sz = half
    V = np.array([[-sx, -sy, -sz], [sx, -sy, -sz], [sx, sy, -sz], [-sx, sy, -sz],
                  [-sx, -sy,  sz], [sx, -sy,  sz], [sx, sy,  sz], [-sx, sy,  sz]],
                 np.float32) + np.asarray(c, np.float32)
    F = np.array([[0,2,1],[0,3,2],[4,5,6],[4,6,7],[0,1,5],[0,5,4],
                  [1,2,6],[1,6,5],[2,3,7],[2,7,6],[3,0,4],[3,4,7]], np.uint32)
    return V, F, np.tile(col, (8, 1)).astype(np.float32)


def _wheel(c, radius, halfw, axis, col, seg=20):
    """Cylinder with its rotation axis along `axis` (0=x,1=y,2=z)."""
    a1, a2 = [i for i in range(3) if i != axis]
    ang = np.linspace(0, 2 * np.pi, seg, endpoint=False)
    V = np.zeros((seg * 2 + 2, 3), np.float32)
    for i, a in enumerate(ang):
        for j, off in enumerate((-halfw, halfw)):
            p = np.array(c, np.float32)
            p[a1] += radius * np.cos(a)
            p[a2] += radius * np.sin(a)
            p[axis] += off
            V[i * 2 + j] = p
    c0 = np.array(c, np.float32); c0[axis] -= halfw
    c1 = np.array(c, np.float32); c1[axis] += halfw
    V[-2], V[-1] = c0, c1
    n0, n1 = seg * 2, seg * 2 + 1
    F = []
    for i in range(seg):
        a0, ab = i * 2, i * 2 + 1
        b0, bb = ((i + 1) % seg) * 2, ((i + 1) % seg) * 2 + 1
        F += [[a0, b0, ab], [ab, b0, bb], [n0, b0, a0], [n1, ab, bb]]
    return V, np.array(F, np.uint32), np.tile(col, (len(V), 1)).astype(np.float32)


def add_chassis_and_wheels(parts, lo, hi):
    """
    The AM14U6 plates in the export are unassembled, so rebuild the chassis from
    the bumper ring — which IS correctly placed. Frame A is Z-up.
    """
    X0, X1 = lo[0], hi[0]          # left / right  (bumper ring: ±0.419)
    Y0, Y1 = lo[1], hi[1]          # back / front
    ZB = 0.047                     # bumper underside = top of the frame rail
    RAIL = 0.025                   # 2" tube, half-height
    R = 0.0508                     # 4" wheel radius
    alum = np.array([0.62, 0.65, 0.67], np.float32)
    dark = np.array([0.08, 0.09, 0.10], np.float32)

    Vs, Fs, Cs = [], [], []
    base = 0

    def add(v, f, c):
        nonlocal base
        Vs.append(v); Fs.append(f + base); Cs.append(c); base += len(v)

    inset = 0.012
    zc = ZB - RAIL
    # long rails (left / right)
    for sx in (X0 + inset + RAIL, X1 - inset - RAIL):
        add(*_box((sx, (Y0 + Y1) / 2, zc),
                  (RAIL, (Y1 - Y0) / 2 - inset, RAIL), alum))
    # cross rails (front / back)
    for sy in (Y0 + inset + RAIL, Y1 - inset - RAIL):
        add(*_box(((X0 + X1) / 2, sy, zc),
                  ((X1 - X0) / 2 - inset - RAIL * 2, RAIL, RAIL), alum))
    # belly pan
    add(*_box(((X0 + X1) / 2, (Y0 + Y1) / 2, zc - RAIL),
              ((X1 - X0) / 2 - inset - RAIL, (Y1 - Y0) / 2 - inset - RAIL, 0.004),
              np.array([0.30, 0.32, 0.33], np.float32)))

    # six 4" stealth wheels, three a side, riding the long rails
    ymid = (Y0 + Y1) / 2
    span = (Y1 - Y0) * 0.33
    for sy in (ymid - span, ymid, ymid + span):
        for sx in (X0 + inset + RAIL, X1 - inset - RAIL):
            add(*_wheel((sx, sy, zc - RAIL + R * 0.15), R, 0.020, axis=0, col=dark))

    V, F, C = np.vstack(Vs), np.vstack(Fs), np.vstack(Cs)
    parts.append(('chassis', V, F, C))
    print(f"  chassis    rebuilt from bumper ring  {len(F):7,} tris  (6 wheels + rails)")
    return parts


# ------------------------------------------------------------------- glb
def write_glb(parts, path, lo, hi):
    ctr = (lo + hi) / 2
    scale = 1.0 / max(hi - lo)          # normalise longest side to 1 unit

    bins, accessors, meshes, nodes, prims_meta = [], [], [], [], []
    blob = bytearray()
    views = []

    def add_view(data, target=None):
        while len(blob) % 4:
            blob.append(0)
        off = len(blob)
        blob.extend(data)
        v = {'buffer': 0, 'byteOffset': off, 'byteLength': len(data)}
        if target:
            v['target'] = target
        views.append(v)
        return len(views) - 1

    for name, V, F, C in parts:
        Vc = ((V - ctr) * scale).astype(np.float32)
        # CAD is Z-up-ish; find up axis as the one with smallest extent → make Y up
        N = normals(Vc, F)
        vi = add_view(Vc.tobytes(), 34962)
        accessors.append({'bufferView': vi, 'componentType': 5126, 'count': len(Vc),
                          'type': 'VEC3', 'min': Vc.min(0).tolist(), 'max': Vc.max(0).tolist()})
        ai_pos = len(accessors) - 1
        ni = add_view(N.tobytes(), 34962)
        accessors.append({'bufferView': ni, 'componentType': 5126, 'count': len(N), 'type': 'VEC3'})
        ai_nrm = len(accessors) - 1
        Cc = np.clip(C, 0, 1).astype(np.float32)
        ci = add_view(Cc.tobytes(), 34962)
        accessors.append({'bufferView': ci, 'componentType': 5126, 'count': len(Cc), 'type': 'VEC3'})
        ai_col = len(accessors) - 1
        Fi = F.astype(np.uint32)
        fi = add_view(Fi.tobytes(), 34963)
        accessors.append({'bufferView': fi, 'componentType': 5125, 'count': Fi.size, 'type': 'SCALAR'})
        ai_idx = len(accessors) - 1

        meshes.append({'name': name, 'primitives': [{
            'attributes': {'POSITION': ai_pos, 'NORMAL': ai_nrm, 'COLOR_0': ai_col},
            'indices': ai_idx, 'material': 0}]})
        nodes.append({'name': name, 'mesh': len(meshes) - 1})

    gltf = {
        'asset': {'version': '2.0', 'generator': 'kitbot-merge'},
        'scene': 0,
        'scenes': [{'nodes': list(range(len(nodes)))}],
        'nodes': nodes,
        'meshes': meshes,
        'materials': [{'name': 'kit', 'pbrMetallicRoughness': {
            'baseColorFactor': [1, 1, 1, 1], 'metallicFactor': 0.55, 'roughnessFactor': 0.5},
            'doubleSided': True}],
        'accessors': accessors,
        'bufferViews': views,
        'buffers': [{'byteLength': len(blob)}],
    }

    js = json.dumps(gltf, separators=(',', ':')).encode()
    while len(js) % 4:
        js += b' '
    while len(blob) % 4:
        blob.append(0)
    out = (struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(blob))
           + struct.pack('<II', len(js), 0x4E4F534A) + js
           + struct.pack('<II', len(blob), 0x004E4942) + bytes(blob))
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, 'wb').write(out)
    return len(out)



# ---------------------------------------------------------------- templates
def load_template(name):
    """Load an unplaced library part, centred at the origin, as (V, F, C)."""
    r = load_part(os.path.join(SRC, name))
    if r is None:
        return None
    V, F, C = r
    V, F, C = decimate(V, F, C, 0.0009)
    V = V - (V.min(0) + V.max(0)) / 2
    return V, F, C


def stamp(bucket, tpl, pos, rot_x=0.0, tint=None):
    """Place a template at pos (optionally rotated about world X)."""
    V, F, C = tpl
    V = V.copy()
    if rot_x:
        c, s_ = np.cos(rot_x), np.sin(rot_x)
        y, z = V[:, 1].copy(), V[:, 2].copy()
        V[:, 1] = y * c - z * s_
        V[:, 2] = y * s_ + z * c
    V = V + np.asarray(pos, np.float32)
    C = np.tile(tint, (len(V), 1)).astype(np.float32) if tint is not None else C
    bucket['V'].append(V.astype(np.float32))
    bucket['F'].append(F + bucket.get('_base', 0))
    bucket['C'].append(C)
    bucket['_base'] = bucket.get('_base', 0) + len(V)


def cylinder(c, radius, half_len, axis, seg=24):
    """(V, F) cylinder centred at c, axis 0=x 1=y 2=z."""
    a1, a2 = [i for i in range(3) if i != axis]
    ang = np.linspace(0, 2 * np.pi, seg, endpoint=False)
    V = np.zeros((seg * 2 + 2, 3), np.float32)
    for i, a in enumerate(ang):
        for j, off in enumerate((-half_len, half_len)):
            pnt = np.array(c, np.float32)
            pnt[a1] += radius * np.cos(a)
            pnt[a2] += radius * np.sin(a)
            pnt[axis] += off
            V[i * 2 + j] = pnt
    e0 = np.array(c, np.float32); e0[axis] -= half_len
    e1 = np.array(c, np.float32); e1[axis] += half_len
    V[-2], V[-1] = e0, e1
    n0, n1 = seg * 2, seg * 2 + 1
    F = []
    for i in range(seg):
        A, Ab = i * 2, i * 2 + 1
        B, Bb = ((i + 1) % seg) * 2, ((i + 1) % seg) * 2 + 1
        F += [[A, B, Ab], [Ab, B, Bb], [n0, B, A], [n1, Ab, Bb]]
    return V, np.array(F, np.uint32)


def reconstruct(parts):
    """
    The export kept ONE placement per part name, so most of the ball path is
    missing. Rebuild it from the reference CAD, reusing REAL part geometry
    translated to each lost station:

      4 roller stations climbing the front tower (real KB-26002 shaft copies,
        dark compliant wheels; the top station is the flywheel roller and
        carries the red sleeve + a disc stack)
      4 centre guides across the width (real KB-26013 geometry, x-shifted)
      3 cross tubes tying the side plates (real KB-26007 brace shaft copies)
      4 churro standoffs under the bottom hopper panel corners
      agitator flaps + 42T pulleys as before
    """
    RED  = np.array([0.72, 0.10, 0.16], np.float32)
    GREY = np.array([0.55, 0.57, 0.58], np.float32)
    DARK = np.array([0.13, 0.14, 0.15], np.float32)
    DISC = np.array([0.58, 0.28, 0.14], np.float32)   # flywheel discs

    extra = {'launcher2': {'V': [], 'F': [], 'C': []},
             'intake2':   {'V': [], 'F': [], 'C': []},
             'hopper2':   {'V': [], 'F': [], 'C': []},
             'frame2':    {'V': [], 'F': [], 'C': []}}

    def copy_at(bucket, geo, d, tint=None):
        V, F, C = geo
        V = V + np.asarray(d, np.float32)
        C = np.tile(tint, (len(V), 1)).astype(np.float32) if tint is not None else C.copy()
        stamp_raw(bucket, V.astype(np.float32), F.copy(), None, C)

    # real geometry, kept at its true position — we translate copies of it
    shaft = load_part(os.path.join(SRC, 'Kitbot 2026 - KB-26002- Roller Shaft.gltf'))
    guide = load_part(os.path.join(SRC, 'Kitbot 2026 - KB-26013- Intake Guide.gltf'))
    brace = load_part(os.path.join(SRC, 'Kitbot 2026 - KB-26007- Brace Shaft.gltf'))
    if shaft: shaft = decimate(*shaft, 0.0009)
    if guide: guide = decimate(*guide, 0.0009)
    if brace: brace = decimate(*brace, 0.0009)

    # ---- roller stations: interpolate launcher (real) -> intake mouth
    TOP = np.array([0.0, -0.134, 0.428])          # placed shaft position
    BOT = np.array([0.0, -0.190, 0.055])          # intake mouth
    for i, grp in ((0, 'launcher2'), (1, 'hopper2'), (2, 'hopper2'), (3, 'intake2')):
        t = i / 3.0
        st = TOP + (BOT - TOP) * t
        d = st - TOP
        b = extra[grp]
        GOLD = np.array([0.70, 0.58, 0.33], np.float32)
        if i > 0 and shaft:                        # station 0 shaft already exists
            copy_at(b, shaft, d)
        V, F = cylinder((0.0, st[1], st[2]), 0.011, 0.24, axis=0, seg=14)
        stamp_raw(b, V, F, GOLD)                   # thin gold shaft, every station
        for x in (-0.18, -0.06, 0.06, 0.18):       # compliant wheels
            V, F = cylinder((x, st[1], st[2]), 0.047, 0.008, axis=0, seg=20)
            stamp_raw(b, V, F, DARK)
    # top station: flywheel disc stack on the thin shaft (no fat sleeve —
    #  the discs and wheels must read as separate parts riding the shaft)
    b = extra['launcher2']
    for x in (-0.032, -0.016, 0.0, 0.016, 0.032):
        V, F = cylinder((x, -0.134, 0.428), 0.054, 0.006, axis=0, seg=24)
        stamp_raw(b, V, F, DISC)

    # ---- 42T pulleys at the placed belt-loop ends
    tpl = load_template('Kitbot 2026 - 42 tooth HTD Pulley half 2020.gltf')
    if tpl:
        for bx, cy, cz, sy, sz in ((-0.241, -0.273, 0.197, 0.086, 0.103),
                                   ( 0.246, -0.185, 0.293, 0.184, 0.183)):
            dd = np.hypot(sy, sz) / 2
            uy, uz = sy / np.hypot(sy, sz), sz / np.hypot(sy, sz)
            for sgn in (-1, 1):
                stamp(b, tpl, (bx, cy + sgn * uy * (dd - 0.037),
                               cz + sgn * uz * (dd - 0.037)), tint=GREY)

    # ---- centre guides: real guide sits at x -0.136 (mirror gives +0.136);
    #      add the two inner stations the export lost
    if guide:
        for dx in (0.091, 0.181):                  # -> x -0.045, +0.045
            copy_at(extra['intake2'], guide, (dx, 0, 0))

    # ---- agitator flaps on the brace shaft
    tplf = load_template('Kitbot 2026 - Flap.gltf')
    if tplf:
        b = extra['hopper2']
        GOLD = np.array([0.70, 0.58, 0.33], np.float32)
        # find the mounting RING in the flap mesh: it is the widest x-region
        # along the flap's long axis — the shaft must pass THROUGH it
        Vt = tplf[0]
        zmin, zmax = Vt[:, 2].min(), Vt[:, 2].max()
        bins = np.linspace(zmin, zmax, 30)
        widths = []
        for k in range(len(bins) - 1):
            m = (Vt[:, 2] >= bins[k]) & (Vt[:, 2] < bins[k + 1])
            widths.append(Vt[m, 0].max() - Vt[m, 0].min() if m.any() else 0)
        ring_z = (bins[int(np.argmax(widths))] + bins[int(np.argmax(widths)) + 1]) / 2
        # place each flap so its ring is centred ON the shaft axis
        for x in (-0.17, -0.06, 0.05, 0.16):
            stamp(b, tplf, (x, -0.295, 0.342 - ring_z), rot_x=0.0, tint=RED)
        # and make that shaft readable: gold sleeve like every other shaft
        V, F = cylinder((0.0, -0.295, 0.342), 0.0095, 0.225, axis=0, seg=14)
        stamp_raw(b, V, F, GOLD)

    # ---- flywheel carriage: two support plates from the top rails down to
    #      the disc-stack shaft
    b = extra['launcher2']
    for px in (-0.048, 0.048):
        V, F, C = _box((px, -0.20, 0.458), (0.0035, 0.10, 0.032), GREY)
        stamp_raw(b, V, F, None, C)

    # ---- upper cross rails: the reference ties the side-plate tops with
    #      full-width rails; the plate top edge is z 0.492, top wheels reach
    #      z 0.475, so the rails sit at z 0.487 and never cross the wheels
    if brace:
        for dy, dz in ((-0.02, 0.145), (0.21, 0.145)):
            copy_at(extra['frame2'], brace, (0, dy, dz))

    # ---- churro standoffs under the bottom hopper panel corners
    b = extra['hopper2']
    for cx in (-0.19, 0.19):
        for cy in (-0.09, 0.12):
            V, F = cylinder((cx, cy, 0.097), 0.008, 0.043, axis=2, seg=10)
            stamp_raw(b, V, F, GREY)

    out = []
    for g, bkt in extra.items():
        if not bkt['V']:
            continue
        V = np.vstack(bkt['V']); F = np.vstack(bkt['F']); C = np.vstack(bkt['C'])
        out.append((g, V, F, C))
        print(f"  {g:9} reconstructed          {len(F):7,} tris")
    return out


def V_colors_grey(V):
    return np.tile([0.55, 0.57, 0.58], (len(V), 1)).astype(np.float32)


def stamp_raw(bucket, V, F, tint, C=None):
    bucket['V'].append(V)
    bucket['F'].append(F + bucket.get('_base', 0))
    bucket['C'].append(C if C is not None
                       else np.tile(tint, (len(V), 1)).astype(np.float32))
    bucket['_base'] = bucket.get('_base', 0) + len(V)

if __name__ == '__main__':
    parts, lo, hi = main()
    parts = add_chassis_and_wheels(parts, lo, hi)
    parts += reconstruct(parts)
    allV = np.vstack([p[1] for p in parts])
    lo, hi = allV.min(0), allV.max(0)
    n = write_glb(parts, OUT, lo, hi)
    tris = sum(len(p[2]) for p in parts)
    print(f"\nwrote {OUT}")
    print(f"  {n/1024/1024:.2f} MB · {tris:,} triangles · {len(parts)} sub-assemblies")
