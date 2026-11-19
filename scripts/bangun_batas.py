import shapefile, glob, os, re, json, collections
from pyproj import Transformer
from shapely.geometry import shape, mapping
from shapely.ops import transform as stransform

T = Transformer.from_crs(32647, 4326, always_xy=True)
OUT = '/home/claude/palmveg/public/data/batas'
PRIO = {'BLOK': 0, 'BATAS_BLOK': 0, 'BLOK_TAMBAHAN': 1, 'BATAS_AREAL': 2, 'BATAS': 3, 'BATAS_TAMBAHAN': 4}
NAME = re.compile(r'^(\w{4})_(AFD\d+)_TBM(\d{4})(.*)$', re.I)

def baca(base):
    dbf = base + '.dbf' if os.path.exists(base + '.dbf') else base + '.DBF'
    try:
        r = shapefile.Reader(base); shapes = r.shapes(); recs = r.records(); fields = [f[0] for f in r.fields[1:]]
    except Exception:  # .shx tidak sinkron dengan .shp: baca berurutan tanpa .shx
        r = shapefile.Reader(shp=open(base + '.shp', 'rb')); shapes = list(r.iterShapes())
        d = shapefile.Reader(dbf=open(dbf, 'rb')); recs = d.records(); fields = [f[0] for f in d.fields[1:]]
    if len(shapes) != len(recs):  # buang geometri kosong (null shape) lalu cocokkan ulang
        shapes = [x for x in shapes if x.points]
    return shapes, [dict(zip(fields, rec)) for rec in recs], fields

def num(v):
    try: return round(float(v), 2)
    except Exception: return None

kandidat = {}  # kunci -> (prioritas, feature)
laporan = collections.Counter(); galat = []; lewati_outline = collections.Counter()
for tahun in ('2025', '2026'):
    for shp in sorted(glob.glob(f'{tahun}/**/*.shp', recursive=True)):
        base = shp[:-4]; nama = os.path.basename(base).strip()
        m = NAME.match(nama)
        if not m: galat.append((shp, 'nama file tidak dikenali')); continue
        kebun, afd, tt, sisa = m.group(1).upper(), m.group(2).upper(), m.group(3), m.group(4).strip(' _').upper().replace(' ', '_')
        sisa = sisa or 'BATAS'
        distrik = shp.split('/')[2]
        try: shapes, recs, fields = baca(base)
        except Exception as e: galat.append((shp, str(e)[:80])); continue
        if len(shapes) != len(recs): galat.append((shp, f'jumlah geometri {len(shapes)} != atribut {len(recs)}')); continue
        if 'BLOK' not in fields: lewati_outline[(tahun, sisa)] += len(shapes); continue
        for s, rec in zip(shapes, recs):
            if not s.points: continue
            try:
                g = stransform(lambda x, y, z=None: T.transform(x, y), shape(s.__geo_interface__))
                if not g.is_valid: g = g.buffer(0)
                g = g.simplify(0.00002, preserve_topology=True)
                if g.is_empty: continue
            except Exception as e: galat.append((shp, 'geometri: ' + str(e)[:60])); continue
            blok = (str(rec.get('BLOK') or '').strip().upper()) or None
            luas = num(rec.get('LUAS (HA)') or rec.get('LUAS_HA') or rec.get('LUAS'))
            geo = json.loads(json.dumps(mapping(g)))
            def bulat(c):
                return [bulat(i) for i in c] if isinstance(c[0], (list, tuple)) else [round(c[0], 5), round(c[1], 5)]
            geo['coordinates'] = bulat(geo['coordinates'])
            props = {'kebun': kebun, 'afdeling': afd, 'blok': blok, 'tt': int(tt), 'luas': luas, 'sumber': os.path.basename(shp), 'distrik': distrik, 'adaDbf': True}
            kunci = (tahun, kebun, afd, tt, blok) if blok else (tahun, shp, id(s))
            p = PRIO.get(sisa, 5)
            if kunci not in kandidat or p < kandidat[kunci][0]:
                kandidat[kunci] = (p, {'type': 'Feature', 'properties': props, 'geometry': geo})

os.makedirs(OUT, exist_ok=True)
per = collections.defaultdict(lambda: collections.defaultdict(list)); indeks = collections.defaultdict(lambda: collections.defaultdict(lambda: collections.defaultdict(set)))
for (tahun, *_), (_, f) in kandidat.items():
    p = f['properties']; per[tahun][p['distrik']].append(f); indeks[tahun][p['distrik']][p['kebun']].add(p['afdeling'])
for tahun, dd in per.items():
    os.makedirs(f'{OUT}/{tahun}', exist_ok=True)
    for dist, fs in dd.items():
        for i, f in enumerate(fs): f['properties']['uid'] = f'{tahun}-{dist}-{i}'
        json.dump({'type': 'FeatureCollection', 'features': fs}, open(f'{OUT}/{tahun}/{dist}.geojson', 'w'), separators=(',', ':'))
        laporan[(tahun, dist)] = len(fs)
json.dump({t: {d: {k: sorted(a) for k, a in kk.items()} for d, kk in dd.items()} for t, dd in indeks.items()}, open(f'{OUT}/index.json', 'w'), separators=(',', ':'), sort_keys=True)

# master wilayah: afdeling 01..maks yang ada di data (celah = afdeling tanpa TBM)
gabung = collections.defaultdict(lambda: collections.defaultdict(set))
for t, dd in indeks.items():
    for d, kk in dd.items():
        for k, a in kk.items(): gabung[d][k] |= a
NAMA_DISTRIK = {'1GLS': 'Grup Labuhan Batu Selatan'}
NAMA_KEBUN = {'1KSD': 'Sei Daun'}
ALIAS = {'1KSD': ['1KSD', 'Sei Daun', '1E02']}
distrik = []
for d in sorted(gabung):
    kb = []
    for k in sorted(gabung[d]):
        mx = max(int(a[3:]) for a in gabung[d][k])
        kb.append({'kode': k, 'nama': NAMA_KEBUN.get(k, k), 'alias': ALIAS.get(k, [k]), 'afdeling': [f'AFD{n:02d}' for n in range(1, max(mx, 5 if k == '1KSD' else mx) + 1)]})
    distrik.append({'kode': d, 'nama': NAMA_DISTRIK.get(d, d), 'kebun': kb})
json.dump({'regional': [{'kode': 'RPC1', 'nama': 'Regional 1', 'distrik': distrik}]}, open('/home/claude/palmveg/public/data/master_wilayah.json', 'w'), indent=1)

print('FEATURE per tahun/distrik:', dict(laporan)); print('TOTAL', sum(laporan.values()))
print('KEBUN', sum(len(x['kebun']) for x in distrik), 'DISTRIK', len(distrik))
print('OUTLINE dilewati (tanpa field BLOK):', dict(lewati_outline))
print('GALAT', len(galat)); [print(' ', g) for g in galat[:12]]
