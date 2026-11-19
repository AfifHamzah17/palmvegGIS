import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Feat, Master, PERIODE, PeriodeId, Row, normalisasi } from './lib/data';

export type Filter = { distrik: string; kebun: string; afd: string; kategori: string; q: string };
export const FILTER0: Filter = { distrik: '', kebun: '', afd: '', kategori: '', q: '' };
type IndeksBatas = Record<string, Record<string, Record<string, string[]>>>; // tahun > distrik > kebun > afdeling
export type KebunInfo = { kode: string; nama: string; distrikKode: string; distrikNama: string; afdeling: string[] };

type Ctx = {
  master: Master | null; loading: boolean; peringatan: string[]; tambahPeringatan: (m: string[]) => void;
  periode: PeriodeId; setPeriode: (p: PeriodeId) => void;
  filter: Filter; setFilter: (p: Partial<Filter>) => void; resetFilter: () => void;
  info: Map<string, KebunInfo>; cocok: (kebun: string, afd: string, blok: string | null, kategori: string | null) => boolean;
  rowsAll: Record<PeriodeId, Row[]>; semuaRows: Row[]; rows: Row[];
  feats: Feat[]; tambahFeats: (f: Feat[]) => void; featsIndeksPeriode: Feat[]; memuatBatas: boolean; muatBatas: () => Promise<void>;
  konfirmasi: Set<string>; setKonfirmasi: (id: string) => void;
  sidebarOpen: boolean; setSidebarOpen: (b: boolean) => void;
  dareOpen: boolean; setDareOpen: (b: boolean) => void;
};
const C = createContext<Ctx>(null as any);
export const useApp = () => useContext(C);

async function ambil<T>(url: string, pesan: string, warn: string[]): Promise<T | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error(String(r.status));
    return (await r.json()) as T;
  } catch {
    warn.push(pesan);
    return null;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [master, setMaster] = useState<Master | null>(null);
  const [raw, setRaw] = useState<Record<PeriodeId, Row[]>>(() => Object.fromEntries(PERIODE.map((p) => [p.id, []])) as any);
  const [indeks, setIndeks] = useState<IndeksBatas | null>(null);
  const [batas, setBatas] = useState<Record<string, Feat[]>>({});
  const [impor, setImpor] = useState<Feat[]>([]);
  const [memuatBatas, setMemuat] = useState(false);
  const sedangMuat = useRef<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [peringatan, setPeringatan] = useState<string[]>([]);
  const [periode, setPeriode] = useState<PeriodeId>(PERIODE[0].id);
  const [filter, setF] = useState<Filter>(FILTER0);
  const [konfirmasi, setK] = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dareOpen, setDareOpen] = useState(false);

  useEffect(() => {
    let batal = false;
    (async () => {
      const warn: string[] = [];
      const [m, ix, ...dat] = await Promise.all([
        ambil<Master>('/data/master_wilayah.json', 'Master wilayah tidak terbaca. Hierarki wilayah kosong.', warn),
        ambil<IndeksBatas>('/data/batas/index.json', 'Indeks batas blok tidak terbaca. Peta tidak punya poligon.', warn),
        ...PERIODE.map((p) => ambil<{ cols: string[]; rows: any[][] }>(`/data/vegetatif/${p.id}.json`, `Data ${p.label} ${p.sub} tidak terbaca.`, warn))
      ]);
      if (batal) return;
      setMaster(m);
      setRaw(Object.fromEntries(PERIODE.map((p, i) => { const d = dat[i]; return [p.id, (d?.rows ?? []).map((a) => Object.fromEntries((d?.cols ?? []).map((c, j) => [c, a[j]])))]; })) as any);
      setIndeks(ix);
      setPeringatan(warn);
      setLoading(false);
    })();
    return () => { batal = true; };
  }, []);

  const tahunShp = PERIODE.find((x) => x.id === periode)!.shp;
  const pseudo = useCallback((th: string): Feat[] => Object.values(indeks?.[th] ?? {}).flatMap((kk) => Object.entries(kk).flatMap(([kebun, afs]) => afs.map((afdeling) => ({ type: 'Feature' as const, properties: { kebun, afdeling }, geometry: null })))), [indeks]);
  const featsIndeksPeriode = useMemo(() => [...pseudo(tahunShp), ...impor], [pseudo, tahunShp, impor]);
  const featsIndeksSemua = useMemo(() => [...Object.keys(indeks ?? {}).flatMap(pseudo), ...impor], [indeks, pseudo, impor]);
  const feats = useMemo(() => [...(batas[tahunShp] ?? []), ...impor], [batas, tahunShp, impor]);

  // Geometri dimuat per tahun SHP (mengikuti periode) dan per distrik, hanya saat dibutuhkan
  const muatBatas = useCallback(async () => {
    const th = tahunShp;
    if (!indeks || batas[th] || sedangMuat.current.has(th)) return;
    sedangMuat.current.add(th); setMemuat(true);
    const warn: string[] = []; const hasil: Feat[] = [];
    try {
      await Promise.all(Object.keys(indeks[th] ?? {}).map(async (d) => {
        const g = await ambil<{ features: Feat[] }>(`/data/batas/${th}/${d}.geojson`, `Batas blok ${th} distrik ${d} tidak terbaca.`, warn);
        hasil.push(...(g?.features ?? []));
      }));
    } finally {
      setBatas((b) => ({ ...b, [th]: hasil }));
      if (warn.length) setPeringatan((p) => [...p, ...warn]);
      setMemuat(false);
    }
  }, [indeks, batas, tahunShp]);

  const rowsAll = useMemo(() => Object.fromEntries(PERIODE.map((p) => [p.id, normalisasi(raw[p.id], master)])) as Record<PeriodeId, Row[]>, [raw, master]);
  const semuaRows = useMemo(() => PERIODE.flatMap((p) => rowsAll[p.id]), [rowsAll]);

  // Info kebun dari master wilayah; kebun yang muncul di data/peta tapi belum ada di master ikut didaftarkan
  const info = useMemo(() => {
    const m = new Map<string, KebunInfo>();
    master?.regional.forEach((r) => r.distrik.forEach((d) => d.kebun.forEach((k) => m.set(k.kode, { kode: k.kode, nama: k.nama, distrikKode: d.kode, distrikNama: d.nama, afdeling: k.afdeling }))));
    const lain = new Set<string>();
    featsIndeksSemua.forEach((f) => f.properties?.kebun && lain.add(String(f.properties.kebun)));
    semuaRows.forEach((r) => r.Kebun && lain.add(String(r.Kebun)));
    lain.forEach((k) => { if (!m.has(k)) m.set(k, { kode: k, nama: k, distrikKode: '_', distrikNama: 'Belum terdaftar', afdeling: [] }); });
    return m;
  }, [master, featsIndeksSemua, semuaRows]);

  const setFilter = useCallback((p: Partial<Filter>) => setF((prev) => {
    const n = { ...prev, ...p };
    if (p.distrik !== undefined && p.distrik !== prev.distrik && p.kebun === undefined) n.kebun = '';
    if ((p.distrik !== undefined || p.kebun !== undefined) && p.afd === undefined) n.afd = '';
    return n;
  }), []);
  const resetFilter = useCallback(() => setF(FILTER0), []);

  const cocok = useCallback((kebun: string, afd: string, blok: string | null, kategori: string | null) => {
    const i = info.get(kebun);
    if (filter.distrik && i?.distrikKode !== filter.distrik) return false;
    if (filter.kebun && kebun !== filter.kebun) return false;
    if (filter.afd && afd !== filter.afd) return false;
    if (filter.kategori && kategori !== filter.kategori) return false;
    if (filter.q) {
      const h = `${i?.distrikKode ?? ''} ${i?.distrikNama ?? ''} ${kebun} ${i?.nama ?? ''} ${afd} ${blok ?? ''}`.toLowerCase();
      if (!filter.q.toLowerCase().split(/\s+/).filter(Boolean).every((t) => h.includes(t))) return false;
    }
    return true;
  }, [filter, info]);

  const rows = useMemo(() => rowsAll[periode].filter((r) => cocok(r.Kebun, r.Afdeling ?? '', r.Blok, r.Kategori)), [rowsAll, periode, cocok]);
  const tambahPeringatan = useCallback((m: string[]) => setPeringatan((p) => [...p, ...m]), []);
  const tambahFeats = useCallback((f: Feat[]) => setImpor((p) => [...p, ...f]), []);
  const setKonfirmasi = useCallback((id: string) => setK((s) => new Set(s).add(id)), []);

  const v = useMemo(() => ({
    master, loading, peringatan, tambahPeringatan, periode, setPeriode, filter, setFilter, resetFilter, info, cocok, rowsAll, semuaRows, rows,
    feats, tambahFeats, featsIndeksPeriode, memuatBatas, muatBatas, konfirmasi, setKonfirmasi, sidebarOpen, setSidebarOpen, dareOpen, setDareOpen
  }), [master, loading, peringatan, tambahPeringatan, periode, filter, setFilter, resetFilter, info, cocok, rowsAll, semuaRows, rows, feats, tambahFeats, featsIndeksPeriode, memuatBatas, muatBatas, konfirmasi, setKonfirmasi, sidebarOpen, dareOpen]);
  return <C.Provider value={v}>{children}</C.Provider>;
}
export { PERIODE };
