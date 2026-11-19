export type Row = Record<string, any>;
export type Kol = { key: string; alias?: string[]; label: string; num?: boolean; dec?: number; skor?: boolean };

// Periode pengukuran. SHP batas mengikuti tahun periode. Bulan 2025-1 diperkirakan (pola 4 bulanan), tidak tertulis di file Excel.
export const PERIODE = [
  { id: '2026-2', label: 'Periode 2', sub: 'Agu 2026', tahun: 2026, shp: '2026' },
  { id: '2026-1', label: 'Periode 1', sub: 'Apr 2026', tahun: 2026, shp: '2026' },
  { id: '2025-3', label: 'Periode 3', sub: 'Des 2025', tahun: 2025, shp: '2025' },
  { id: '2025-2', label: 'Periode 2', sub: 'Agu 2025', tahun: 2025, shp: '2025' },
  { id: '2025-1', label: 'Periode 1', sub: 'Apr 2025', tahun: 2025, shp: '2025' }
] as const;
export type PeriodeId = (typeof PERIODE)[number]['id'];

export const PICA_WARNA: Record<string, string> = { gold: '#D9A21B', green: '#3F9A63', red: '#D2453F', black: '#343A40' };
export const ABU = '#8E9A93';

// Urutan kolom 1-28 sesuai Baris 8, lalu kolom merah (tanpa nomor) setelahnya
export const KOLOM: Kol[] = [
  { key: 'Regional', label: 'Regional' }, { key: 'Kebun', label: 'Kebun' }, { key: 'Afdeling', label: 'Afdeling' },
  { key: 'Blok', label: 'Blok' }, { key: 'Varietas', label: 'Varietas' }, { key: 'Fase TBM', label: 'Fase TBM' },
  { key: 'Bulan Tanam', label: 'Bulan Tanam' }, { key: 'Tahun Tanam', label: 'Tahun Tanam' },
  { key: 'Periode Pengukuran', alias: ['Bulan Pengukuran'], label: 'Bulan Ukur', num: true, dec: 0 },
  { key: 'Tahun Pengukuran', label: 'Tahun Ukur' }, { key: 'Umur Tanam (bulan)', label: 'Umur (bln)', num: true, dec: 0 },
  { key: 'Luas (Ha)', label: 'Luas (Ha)', num: true, dec: 2 },
  { key: 'Jumlah Pokok Awal', label: 'Pokok Awal', num: true, dec: 0 }, { key: 'Pokok/Ha Awal Tanam', label: 'Pokok/Ha Awal', num: true, dec: 1 },
  { key: 'Jumlah Pokok Sekarang', label: 'Pokok Kini', num: true, dec: 0 }, { key: 'Pokok/Ha Saat Ini', label: 'Pokok/Ha Kini', num: true, dec: 1 },
  { key: 'Selisih Pohon', label: 'Selisih Pohon', num: true, dec: 0 }, { key: 'Selisih Phn/Ha', label: 'Selisih/Ha', num: true, dec: 2 },
  { key: 'Tinggi Tanaman (cm)', label: 'Tinggi (cm)', num: true, dec: 1 }, { key: 'Jumlah Pelepah', label: 'Pelepah', num: true, dec: 1 },
  { key: 'Lingkar Batang (cm)', label: 'Lingkar (cm)', num: true, dec: 1 }, { key: 'Lebar Petiola (cm)', label: 'Lebar Petiola', num: true, dec: 2 },
  { key: 'Tebal Petiola (cm)', label: 'Tebal Petiola', num: true, dec: 2 }, { key: 'Panjang Rachis (cm)', label: 'Rachis (cm)', num: true, dec: 1 },
  { key: 'Jumlah Anak Daun', label: 'Anak Daun', num: true, dec: 0 }, { key: 'Rata Panjang Anak Daun', label: 'Panjang AD', num: true, dec: 1 },
  { key: 'Rata Lebar Anak Daun', label: 'Lebar AD', num: true, dec: 2 },
  { key: 'Nilai PICA', label: 'Nilai PICA', num: true, dec: 2, skor: true }, { key: 'Kategori', label: 'Kategori', skor: true },
  ...['Tinggi Tanaman', 'Pelepah', 'Lingkar Batang', 'Kerapatan Pokok', 'Panjang Rachis', 'Lebar Petiola', 'Tebal Petiola', 'Jumlah Anak Daun', 'Panjang Anak Daun', 'Lebar Anak Daun']
    .map((n) => ({ key: 'Skor ' + n, label: 'Skor ' + n, num: true, dec: 1, skor: true }))
];

export const isNum = (v: any): v is number => typeof v === 'number' && Number.isFinite(v);
export const fmt = (v: any, d = 1) => (isNum(v) ? v.toLocaleString('id-ID', { maximumFractionDigits: d, minimumFractionDigits: 0 }) : '–');
export const avg = (xs: any[]) => { const n = xs.filter(isNum); return n.length ? n.reduce((a, b) => a + b, 0) / n.length : null; };
export const sum = (xs: any[]) => xs.filter(isNum).reduce((a, b) => a + b, 0);

export type Master = { regional: { kode: string; nama: string; distrik: { kode: string; nama: string; kebun: { kode: string; nama: string; alias: string[]; afdeling: string[] }[] }[] }[] };

export function kebunKode(raw: any, master: Master | null): string {
  const s = String(raw ?? '').trim().toLowerCase();
  for (const r of master?.regional ?? []) for (const d of r.distrik) for (const k of d.kebun)
    if (k.alias.some((a) => a.toLowerCase() === s)) return k.kode;
  return String(raw ?? '').trim();
}

// Samakan nama kolom antar file dan hitung kolom turunan bila kosong (aman terhadap null)
export function normalisasi(rows: Row[], master: Master | null): Row[] {
  return (rows ?? []).map((raw) => {
    const r: Row = {};
    for (const k of KOLOM) {
      let v: any = null;
      for (const n of [k.key, ...(k.alias ?? [])]) if (raw?.[n] != null && raw[n] !== '') { v = raw[n]; break; }
      r[k.key] = v;
    }
    r.KebunAsli = raw?.Kebun ?? null;
    r.Kebun = kebunKode(raw?.Kebun, master);
    r.Afdeling = r.Afdeling == null ? null : String(r.Afdeling).trim();
    r.Blok = r.Blok == null ? null : String(r.Blok).trim();
    r.Kategori = r.Kategori == null ? null : String(r.Kategori).trim().toLowerCase();
    if (r['Selisih Pohon'] == null && isNum(r['Jumlah Pokok Sekarang']) && isNum(r['Jumlah Pokok Awal']))
      r['Selisih Pohon'] = r['Jumlah Pokok Sekarang'] - r['Jumlah Pokok Awal'];
    if (r['Selisih Phn/Ha'] == null && isNum(r['Selisih Pohon']) && isNum(r['Luas (Ha)']) && r['Luas (Ha)'] !== 0)
      r['Selisih Phn/Ha'] = r['Selisih Pohon'] / r['Luas (Ha)'];
    return r;
  });
}

export type StatusJoin = 'terhubung' | 'parsial' | 'usulan' | 'belum';
export type Feat = { type: 'Feature'; properties: Record<string, any>; geometry: any };
export type Joined = { feat: Feat; id: string; kebun: string; afd: string; blok: string | null; status: StatusJoin; row: Row | null };

const stripSufiks = (b: string) => b.replace(/[A-Za-z]+$/, '');

// Join bertahap: persis, lalu tanpa huruf sufiks (harus unik), lalu usulan dari Excel bila .dbf tidak ada
export function joinGeo(feats: Feat[], rows: Row[], semuaRows: Row[]): Joined[] {
  return (feats ?? []).map((feat, i) => {
    const p = feat.properties ?? {};
    const kebun = String(p.kebun ?? ''), afd = String(p.afdeling ?? '');
    const id = p.uid ?? `${p.sumber ?? 'impor'}#${i}`;
    const base = { feat, id, kebun, afd };
    const cand = rows.filter((r) => r.Kebun === kebun && r.Afdeling === afd);
    const blokGeo: string | null = p.blok ? String(p.blok).trim() : null;
    if (blokGeo) {
      const exact = cand.find((r) => r.Blok === blokGeo);
      if (exact) return { ...base, blok: blokGeo, status: 'terhubung', row: exact } as Joined;
      const hit = cand.filter((r) => r.Blok && stripSufiks(r.Blok) === stripSufiks(blokGeo));
      if (hit.length === 1) return { ...base, blok: blokGeo, status: 'parsial', row: hit[0] } as Joined;
      // tidak ada data di periode ini, cek apakah blok ada di periode lain
      const lain = semuaRows.some((r) => r.Kebun === kebun && r.Afdeling === afd && r.Blok && stripSufiks(r.Blok) === stripSufiks(blokGeo));
      return { ...base, blok: blokGeo, status: lain ? 'terhubung' : 'belum', row: null } as Joined;
    }
    const uniq = [...new Set(semuaRows.filter((r) => r.Kebun === kebun && r.Afdeling === afd && r.Blok).map((r) => r.Blok as string))];
    if (uniq.length === 1) return { ...base, blok: uniq[0], status: 'usulan', row: cand.find((r) => r.Blok === uniq[0]) ?? null } as Joined;
    return { ...base, blok: null, status: 'belum', row: null } as Joined;
  });
}

export type StatusAfd = 'normal' | 'tanpaBatas' | 'tanpaDataPeriode' | 'tanpaTbm';
export function statusAfd(kebun: string, afd: string, rowsPeriode: Row[], semuaRows: Row[], feats: Feat[]) {
  const nIni = rowsPeriode.filter((r) => r.Kebun === kebun && r.Afdeling === afd).length;
  const nSemua = semuaRows.filter((r) => r.Kebun === kebun && r.Afdeling === afd).length;
  const adaBatas = feats.some((f) => f.properties?.kebun === kebun && f.properties?.afdeling === afd);
  let status: StatusAfd = 'normal';
  if (nSemua === 0 && !adaBatas) status = 'tanpaTbm';
  else if (nIni === 0) status = 'tanpaDataPeriode';
  else if (!adaBatas) status = 'tanpaBatas';
  return { status, nIni, adaBatas };
}
