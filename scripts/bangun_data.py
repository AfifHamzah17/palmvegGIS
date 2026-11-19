# Menyusun 5 periode Excel (2025-1..3, 2026-1..2) ke satu skema kolom (skema 2026), khusus Regional RPC1
import json, collections, os, re
from muat import *
OUT = '/home/claude/palmveg/public/data'
os.makedirs(OUT + '/vegetatif', exist_ok=True)
KOLOM = ['Regional','Kebun','Afdeling','Blok','Varietas','Fase TBM','Bulan Tanam','Tahun Tanam','Periode Pengukuran','Tahun Pengukuran','Umur Tanam (bulan)','Luas (Ha)',
 'Jumlah Pokok Awal','Pokok/Ha Awal Tanam','Jumlah Pokok Sekarang','Pokok/Ha Saat Ini','Selisih Pohon','Selisih Phn/Ha','Tinggi Tanaman (cm)','Jumlah Pelepah','Lingkar Batang (cm)',
 'Lebar Petiola (cm)','Tebal Petiola (cm)','Panjang Rachis (cm)','Jumlah Anak Daun','Rata Panjang Anak Daun','Rata Lebar Anak Daun','Nilai PICA','Kategori'] + \
 ['Skor ' + n for n in ['Tinggi Tanaman','Pelepah','Lingkar Batang','Kerapatan Pokok','Panjang Rachis','Lebar Petiola','Tebal Petiola','Jumlah Anak Daun','Panjang Anak Daun','Lebar Anak Daun']]
TEKS = {'Regional','Kebun','Afdeling','Blok','Varietas','Fase TBM','Kategori'}
META = {'2025-1': (2025, 4, True), '2025-2': (2025, 8, False), '2025-3': (2025, 12, False), '2026-1': (2026, 4, False), '2026-2': (2026, 8, False)}  # (tahun, bulan, bulan_diperkirakan)
# Pemetaan nama kolom 2025-1 (Detail Seleksi) ke skema 2026
M25 = {'Jenis TBM':'Fase TBM','Luasan':'Luas (Ha)','Umur':'Umur Tanam (bulan)','Jumlah Pokok Awal Tanam':'Jumlah Pokok Awal','Lingkar Batang':'Lingkar Batang (cm)','Tinggi Batang':'Tinggi Tanaman (cm)',
 'Score Lingkar Batang':'Skor Lingkar Batang','Score Jumlah Pelepah':'Skor Pelepah','Score Tinggi Batang':'Skor Tinggi Tanaman','Score Kerapatan Pokok':'Skor Kerapatan Pokok','Total Seleksian':'Nilai PICA','Kategori Warna':'Kategori'}

def baca_sumber(k):
    f, sh = SRC[k]
    rows = list(openpyxl.load_workbook(U + f, data_only=True, read_only=True)[sh].iter_rows(values_only=True))
    hi = next(i for i, r in enumerate(rows[:30]) if 'Afdeling' in [S(x) for x in r] and 'Blok' in [S(x) for x in r])
    hdr = [S(x) for x in rows[hi]]
    if k == '2025-1' and not hdr[0]: hdr[0] = 'Jenis TBM'
    out = []
    for r in rows[hi + 1:]:
        d = {h: r[i] for i, h in enumerate(hdr) if h}
        if S(d.get('Blok')) and S(d.get('Regional')) == 'RPC1': out.append(d)
    return out

SUM = {k: baca_sumber(k) for k in SRC}
# --- pemetaan label kebun -> kode 1Kxx lewat kecocokan himpunan (afdeling, blok) dengan 2025-1 (yang sudah memakai kode 1Kxx)
def fp(rows):
    d = collections.defaultdict(set)
    for r in rows: d[S(r['Kebun'])].add((afd(r['Afdeling']), S(r['Blok']).upper()))
    return d
A = fp(SUM['2025-1']); PETA = {}; NAMA = {}
for k in ('2025-2', '2025-3', '2026-1', '2026-2'):
    F = fp(SUM[k]); pairs = sorted(((len(s & a) / len(s | a), lab, c) for lab, s in F.items() for c, a in A.items()), reverse=True)
    pakai_l, pakai_c, hasil = set(), set(), {}
    for sc, lab, c in pairs:
        if lab in pakai_l or c in pakai_c or sc == 0: continue
        hasil[lab] = c; pakai_l.add(lab); pakai_c.add(c)
    assert len(hasil) == len(F), (k, set(F) - set(hasil))
    PETA[k] = hasil
for lab, c in PETA['2026-1'].items(): NAMA[c] = lab
# konsistensi dua file 2026 (nama berbeda ejaan, kode harus sama)
sama = {PETA['2026-1'][a] for a in PETA['2026-1']} == {PETA['2026-2'][a] for a in PETA['2026-2']}
print('kode 2026-1 == 2026-2:', sama)

def bulat(v, d=2):
    return None if v is None else round(v, d)
def susun(k, d):
    c = {}
    for kk, vv in d.items(): c[M25.get(kk, kk) if k == '2025-1' else kk] = vv
    if k != '2025-1' and 'Bulan Pengukuran' in c: c['Periode Pengukuran'] = c.pop('Bulan Pengukuran')
    if k == '2025-1':
        c['Fase TBM'] = re.sub(r'^TBM\s*(\d)$', r'TBM \1', S(c.get('Fase TBM')))
        c['Tahun Pengukuran'] = 2025
        c['Jumlah Pelepah'] = d.get('Jumlah Pelepah')
    out = {}
    for col in KOLOM:
        v = c.get(col)
        if col in TEKS: out[col] = S(v) or None
        else:
            out[col] = None if S(v) == '' else num(v)
    out['Regional'] = 'RPC1'
    lab = S(d['Kebun']); out['Kebun'] = lab if k == '2025-1' else PETA[k][lab]
    out['Afdeling'] = afd(d['Afdeling']); out['Blok'] = S(d['Blok']).upper()
    out['Kategori'] = (out['Kategori'] or '').lower() or None
    for col in ('Bulan Tanam', 'Tahun Tanam', 'Periode Pengukuran', 'Tahun Pengukuran'):
        if out[col] is not None: out[col] = int(out[col])
    luas = out['Luas (Ha)']
    if luas and luas > 0:
        if out['Pokok/Ha Awal Tanam'] is None and out['Jumlah Pokok Awal'] is not None: out['Pokok/Ha Awal Tanam'] = out['Jumlah Pokok Awal'] / luas
        if out['Pokok/Ha Saat Ini'] is None and out['Jumlah Pokok Sekarang'] is not None: out['Pokok/Ha Saat Ini'] = out['Jumlah Pokok Sekarang'] / luas
        if out['Selisih Pohon'] is None and out['Jumlah Pokok Sekarang'] is not None and out['Jumlah Pokok Awal'] is not None: out['Selisih Pohon'] = out['Jumlah Pokok Sekarang'] - out['Jumlah Pokok Awal']
        if out['Selisih Phn/Ha'] is None and out['Selisih Pohon'] is not None: out['Selisih Phn/Ha'] = out['Selisih Pohon'] / luas
    for col in KOLOM:
        if col not in TEKS and isinstance(out[col], float): out[col] = bulat(out[col])
    return out

# cek rumus Pokok/Ha pada 2026-1 (yang sudah punya nilainya)
salah = 0
for d in SUM['2026-1'][:400]:
    luas, kini, ph = num(d['Luas (Ha)']), num(d['Jumlah Pokok Sekarang']), num(d['Pokok/Ha Saat Ini'])
    if luas and kini is not None and ph is not None and abs(kini / luas - ph) > 0.05: salah += 1
print('rumus Pokok/Ha Saat Ini beda dari file (dari 400 baris 2026-1):', salah)

kebun_ada, afd_ada, ringkas = collections.defaultdict(set), collections.defaultdict(set), []
for k, (tahun, bulan, kira) in META.items():
    rows = [susun(k, d) for d in SUM[k]]
    dup = [x for x, n in collections.Counter((r['Kebun'], r['Afdeling'], r['Blok']) for r in rows).items() if n > 1]
    kosong = {c: sum(r[c] is None for r in rows) for c in KOLOM if sum(r[c] is None for r in rows) == len(rows)}
    for r in rows: kebun_ada[r['Kebun']].add(k); afd_ada[r['Kebun']].add(r['Afdeling'])
    json.dump({'id': k, 'tahun': tahun, 'bulan': bulan, 'cols': KOLOM, 'rows': [[r[c] for c in KOLOM] for r in rows]}, open(f'{OUT}/vegetatif/{k}.json', 'w'), separators=(',', ':'), ensure_ascii=False)
    kat = collections.Counter(r['Kategori'] for r in rows)
    print(f'{k}: {len(rows)} baris, {len({r["Kebun"] for r in rows})} kebun, kategori {dict(kat)}, blok ganda {len(dup)}, kolom kosong total: {list(kosong)}')

# --- patch master wilayah: nama kebun, alias (kode lama 1Exx & nama Excel), afdeling gabungan Excel + shapefile
mp = OUT + '/master_wilayah.json'; M = json.load(open(mp))
alias = collections.defaultdict(set)
for k in ('2025-2', '2025-3'):
    for lab, c in PETA[k].items(): alias[c].add(lab)
for k in ('2026-1', '2026-2'):
    for lab, c in PETA[k].items(): alias[c].add(lab)
ada = {kb['kode'] for d in M['regional'][0]['distrik'] for kb in d['kebun']}
print('kebun Excel tidak ada di shapefile/master:', sorted(set(kebun_ada) - ada), '| di master tapi tidak di Excel:', sorted(ada - set(kebun_ada)))
for d in M['regional'][0]['distrik']:
    for kb in d['kebun']:
        c = kb['kode']
        if c in NAMA: kb['nama'] = re.sub(r'\s+', ' ', NAMA[c]).strip()
        kb['alias'] = sorted({c, kb['nama'], *alias.get(c, set())} - {''})
        semua = set(kb['afdeling']) | afd_ada.get(c, set())
        mx = max(int(a[3:]) for a in semua) if semua else 5
        kb['afdeling'] = [f'AFD{n:02d}' for n in range(1, mx + 1)]
json.dump(M, open(mp, 'w'), indent=1, ensure_ascii=False)
print('NAMA kebun:', {c: NAMA.get(c, '?') for c in sorted(ada)})
json.dump({'catatan': 'periode 2025-1 bulan diperkirakan Apr (pola 4 bulanan), tidak tertulis di file'}, open('/tmp/meta.json', 'w'))
