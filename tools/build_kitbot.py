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
    'deck':     re.compile(r'Battery Floor|Battery C Plate|Battery Access|Battery Strap', re.I),
    'bumpers':  re.compile(r'Bumper', re.I),
    'intake':   re.compile(r'KB-26001|KB-26002|KB-26003|KB-26013|Flap|Intake', re.I),
    'hopper':   re.compile(r'Hopper|KB-26017|Panel Lock|KB-26009', re.I),
    'launcher': re.compile(r'Hood|KB-26010|KB-26012|KB-26016|KB-26019|Launcher', re.I),
    'power':    re.compile(r'battery|Robot Battery|PDH|Radio|RSL|Signal Light|Electronics Panel', re.I),
    'drive':    re.compile(r'ToughBox|Output Shaft|Hex Hub|CIM|Spur Gear|Pulley half|HTD Belt|Timing Belt|Stealth Wheel|20DP|Hex Spacer|Core|WCP-1439', re.I),
}
SKIP = re.compile(r'nut|screw|bolt|washer|bearing|spacer|dowel|klipring|insert|shcs|hhcs|'
                  r'fhts|collar|clip|breaker|SB50|Nylock|flange|button head|cap screw|'
                  r'Cluster Shaft|Shaft Clip', re.I)

# per-group decimation cell size in metres (robot is ~0.8 m across)
# Cell size in metres. Smaller = more detail. These were tuned by eye against
# file size: the whole robot is ~0.84 m across, so 0.8 mm cells keep visible
# fillets and bolt bosses while still welding away CAD's interior tessellation.
CELL = {
    'deck': 0.0012, 'bumpers': 0.0010, 'intake': 0.00070,
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
    ENV_LO = np.array([-0.50, -0.50, -0.10])
    ENV_HI = np.array([ 0.50,  0.50,  0.60])
    rejected = []

    for path in files:
        f = os.path.basename(path)
        if SKIP.search(f):
            continue
        g = classify(f)
        if not g:
            continue
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
        b = buckets[g]
        b['V'].append(V); b['F'].append(F + base[g]); b['C'].append(C)
        base[g] += len(V); b['n'] += 1
        used += 1

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


if __name__ == '__main__':
    parts, lo, hi = main()
    parts = add_chassis_and_wheels(parts, lo, hi)
    allV = np.vstack([p[1] for p in parts])
    lo, hi = allV.min(0), allV.max(0)
    n = write_glb(parts, OUT, lo, hi)
    tris = sum(len(p[2]) for p in parts)
    print(f"\nwrote {OUT}")
    print(f"  {n/1024/1024:.2f} MB · {tris:,} triangles · {len(parts)} sub-assemblies")
