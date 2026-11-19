import { useEffect, useMemo, useState } from 'react';
import { RotateCcw, Search } from 'lucide-react';
import { useApp } from '../state';
import { PICA_WARNA } from '../lib/data';
import { useDebounce } from './ui';

export function jumlahFilter(f: { distrik: string; kebun: string; afd: string; kategori: string; q: string }) {
  return [f.distrik, f.kebun, f.afd, f.kategori, f.q].filter(Boolean).length;
}

export default function FilterBar() {
  const { filter, setFilter, resetFilter, info } = useApp();
  const [q, setQ] = useState(filter.q);
  const dq = useDebounce(q, 250);
  useEffect(() => { if (dq !== filter.q) setFilter({ q: dq }); }, [dq]);
  useEffect(() => { setQ(filter.q); }, [filter.q]);

  const semua = useMemo(() => [...info.values()], [info]);
  const distrik = useMemo(() => [...new Map(semua.map((k) => [k.distrikKode, k.distrikNama])).entries()], [semua]);
  const kebun = useMemo(() => semua.filter((k) => !filter.distrik || k.distrikKode === filter.distrik), [semua, filter.distrik]);
  const afdeling = info.get(filter.kebun)?.afdeling ?? [];
  const n = jumlahFilter(filter);

  const Sel = ({ label, value, onChange, children, disabled }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode; disabled?: boolean }) => (
    <label className="block"><span className="mb-1 block text-xs text-mute">{label}</span>
      <select className="field disabled:opacity-50" value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}>{children}</select></label>
  );
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
      <label className="relative col-span-2 block sm:col-span-3 lg:col-span-2"><span className="mb-1 block text-xs text-mute">Cari distrik, kebun, atau blok</span>
        <Search size={16} className="absolute bottom-2.5 left-3 text-mute" />
        <input className="field !pl-9" placeholder="Contoh: 1GLS, Sei Daun, AA38" value={q} onChange={(e) => setQ(e.target.value)} /></label>
      <Sel label="Distrik" value={filter.distrik} onChange={(v) => setFilter({ distrik: v })}><option value="">Semua distrik</option>{distrik.map(([k, nm]) => <option key={k} value={k}>{k === '_' || nm === k ? nm : `${k} ${nm}`}</option>)}</Sel>
      <Sel label="Kebun" value={filter.kebun} onChange={(v) => (v ? setFilter({ distrik: info.get(v)?.distrikKode ?? '', kebun: v }) : setFilter({ kebun: '' }))}><option value="">Semua kebun</option>{kebun.map((k) => <option key={k.kode} value={k.kode}>{k.nama === k.kode ? k.kode : `${k.nama} (${k.kode})`}</option>)}</Sel>
      <Sel label="Afdeling" value={filter.afd} disabled={!filter.kebun} onChange={(v) => setFilter({ afd: v })}><option value="">{filter.kebun ? 'Semua afdeling' : 'Pilih kebun dulu'}</option>{afdeling.map((a) => <option key={a} value={a}>{a}</option>)}</Sel>
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1"><Sel label="Kategori" value={filter.kategori} onChange={(v) => setFilter({ kategori: v })}><option value="">Semua</option>{Object.keys(PICA_WARNA).map((k) => <option key={k} value={k}>{k}</option>)}</Sel></div>
        <button className="btn btn-ghost !px-2.5" onClick={resetFilter} disabled={!n} aria-label="Reset filter" title="Reset filter"><RotateCcw size={16} /></button>
      </div>
    </div>
  );
}
