import { memo, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Bar, BarChart, XAxis, YAxis, Legend, Line, LineChart, CartesianGrid } from 'recharts';
import { Search } from 'lucide-react';
import { useApp } from '../state';
import { ABU, KOLOM, PERIODE, PICA_WARNA, Row, avg, fmt, isNum, sum } from '../lib/data';
import FilterBar from '../components/FilterBar';
import FotoCarousel from '../components/FotoCarousel';
import { Breadcrumbs, Kosong, Marquee, Scramble, Skeleton, useDebounce } from '../components/ui';

function Hero({ children }: { children: React.ReactNode }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const scroller = ref.current?.closest('main');
    let raf = 0;
    const h = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { if (ref.current && scroller) ref.current.style.transform = `translateY(${scroller.scrollTop * 0.25}px)`; }); };
    scroller?.addEventListener('scroll', h, { passive: true });
    return () => { scroller?.removeEventListener('scroll', h); cancelAnimationFrame(raf); };
  }, []);
  return (
    <section className="relative overflow-hidden border-b border-line bg-[#E4ECE4]">
      <svg ref={ref} className="pointer-events-none absolute -top-10 left-0 h-[130%] w-full will-change-transform" viewBox="0 0 800 300" preserveAspectRatio="xMidYMid slice" aria-hidden>
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <ellipse key={i} cx={560 - i * 8} cy={150 + i * 4} rx={90 + i * 48} ry={40 + i * 22} fill="none" stroke="#0E6B66" strokeOpacity={0.1 + (i % 2) * 0.05} transform={`rotate(${-14 + i * 2} 560 150)`} />)}
      </svg>
      <div className="relative px-4 py-8 sm:px-8 sm:py-12">{children}</div>
    </section>
  );
}

const Kpi = ({ label, value, unit, loading }: { label: string; value: string; unit?: string; loading: boolean }) => (
  <div className="rounded-xl border border-line bg-card/90 p-4 shadow-soft backdrop-blur">
    <p className="text-sm text-mute">{label}</p>
    {loading ? <Skeleton className="mt-2 h-8 w-24" /> : <p className="mt-1 font-mono text-2xl font-semibold tracking-tight"><Scramble text={value} />{unit && value !== '–' && <span className="ml-1 text-sm font-normal text-mute">{unit}</span>}</p>}
  </div>
);

const Badge = ({ k }: { k: string | null }) => k ? <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-2 py-0.5 text-xs capitalize"><i className="h-2 w-2 rounded-full" style={{ background: PICA_WARNA[k] ?? ABU }} />{k}</span> : <span>–</span>;

const Baris = memo(function Baris({ r }: { r: Row }) {
  return (
    <tr className="border-t border-line hover:bg-white">
      {KOLOM.map((k, i) => (
        <td key={k.key} className={`whitespace-nowrap px-3 py-2 ${k.num ? 'text-right font-mono' : ''} ${i === 3 ? 'sticky left-0 z-10 bg-card font-mono font-medium' : ''} ${k.skor ? 'bg-[#F4EEEE]/50' : ''}`}>
          {k.key === 'Kategori' ? <Badge k={r.Kategori} /> : k.num ? fmt(r[k.key], k.dec ?? 1) : r[k.key] ?? '–'}
        </td>
      ))}
    </tr>
  );
});

const Kartu = ({ judul, ket, kelas, children, ada, loading }: { judul: string; ket: string; kelas: string; children: React.ReactNode; ada: boolean; loading: boolean }) => (
  <section className={`flex flex-col rounded-2xl border border-line bg-card p-4 shadow-soft sm:p-5 ${kelas}`}>
    <h3 className="font-semibold tracking-tight">{judul}</h3><p className="mb-3 text-xs text-mute">{ket}</p>
    <div className="min-h-[13rem] flex-1">{loading ? <Skeleton className="h-full min-h-[13rem]" /> : ada ? children : <Kosong judul="Belum ada data" isi="Pilih periode atau afdeling lain." />}</div>
  </section>
);

export default function Home() {
  const { rows, loading, periode, filter, info, cocok, rowsAll } = useApp();
  const [ukuran, setUkuran] = useState(25);
  const [hal, setHal] = useState(1);
  const p = PERIODE.find((x) => x.id === periode)!;

  const tampil = rows;
  const dTampil = useDeferredValue(tampil);
  useEffect(() => setHal(1), [ukuran, rows]);
  const halaman = dTampil.slice((hal - 1) * ukuran, hal * ukuran);
  const nHal = Math.max(1, Math.ceil(dTampil.length / ukuran));

  const kpi = useMemo(() => ({
    blok: rows.length ? String(rows.length) : '–', luas: rows.length ? fmt(sum(rows.map((r) => r['Luas (Ha)'])), 2) : '–',
    tinggi: fmt(avg(rows.map((r) => r['Tinggi Tanaman (cm)'])), 1), pokok: fmt(avg(rows.map((r) => r['Pokok/Ha Saat Ini'])), 1), pica: fmt(avg(rows.map((r) => r['Nilai PICA'])), 2)
  }), [rows]);

  const donat = useMemo(() => Object.keys(PICA_WARNA).map((k) => ({ name: k, value: rows.filter((r) => r.Kategori === k).length })).filter((d) => d.value > 0), [rows]);
  // Ringkas sesuai cakupan filter agar grafik tetap terbaca: blok (satu afdeling), afdeling (satu kebun), atau kebun
  const levelBar = filter.afd ? 'blok' : filter.kebun ? 'afdeling' : 'kebun';
  const bar = useMemo(() => {
    const g = new Map<string, { v: number[]; k: string | null }>();
    rows.forEach((r) => {
      if (!isNum(r['Tinggi Tanaman (cm)'])) return;
      const nama = levelBar === 'blok' ? `${r.Afdeling} ${r.Blok}` : levelBar === 'afdeling' ? String(r.Afdeling) : info.get(r.Kebun)?.nama ?? r.Kebun;
      const e = g.get(nama) ?? { v: [], k: levelBar === 'blok' ? r.Kategori : null };
      e.v.push(r['Tinggi Tanaman (cm)']); g.set(nama, e);
    });
    return [...g.entries()].map(([blok, e]) => ({ blok, tinggi: Math.round((avg(e.v) ?? 0) * 10) / 10, k: e.k }));
  }, [rows, levelBar, info]);
  const adaDiLain = PERIODE.find((x) => x.id !== periode && rowsAll[x.id].some((r) => cocok(r.Kebun, r.Afdeling ?? '', r.Blok, r.Kategori)));

  const skor = useMemo(() => KOLOM.filter((k) => k.key.startsWith('Skor ')).map((k) => ({ nama: k.key.replace('Skor ', ''), nilai: avg(rows.map((r) => r[k.key])) })).filter((d) => d.nilai != null), [rows]);
  const tren = useMemo(() => [...PERIODE].reverse().map((pp) => {
    const v = avg(rowsAll[pp.id].filter((r) => cocok(r.Kebun, r.Afdeling ?? '', r.Blok, r.Kategori)).map((r) => r['Nilai PICA']));
    return { periode: pp.sub, pica: v == null ? null : Math.round(v * 100) / 100 };
  }), [rowsAll, cocok]);
  const kritis = useMemo(() => rows.filter((r) => r.Kategori === 'black' || r.Kategori === 'red').sort((a, b) => (a['Nilai PICA'] ?? 999) - (b['Nilai PICA'] ?? 999)).slice(0, 14), [rows]);
  const ticker = kritis.length
    ? kritis.map((r, i) => <span key={i}><b className="font-mono text-ink">{info.get(r.Kebun)?.nama ?? r.Kebun} {r.Afdeling} {r.Blok}</b> berkategori <span className="capitalize">{r.Kategori}</span>, nilai PICA {fmt(r['Nilai PICA'], 2)}</span>)
    : rows.length ? [<span key="a">Tidak ada blok berkategori merah atau hitam pada pilihan ini</span>] : [];

  return (
    <div>
      <Hero>
        <Breadcrumbs items={['Regional RPC1', filter.distrik ? info.get(filter.kebun)?.distrikKode ?? filter.distrik : 'Semua distrik', filter.kebun ? info.get(filter.kebun)?.nama ?? filter.kebun : 'Semua kebun', filter.afd || 'Semua afdeling']} />
        <h1 className="mt-3 max-w-2xl text-3xl font-semibold leading-[1.05] tracking-tighter sm:text-5xl">Vegetatif TBM {filter.kebun ? info.get(filter.kebun)?.nama ?? filter.kebun : 'semua kebun'}, {p.label.toLowerCase()} {p.sub}</h1>
        <p className="mt-3 max-w-[60ch] text-mute">Ukuran tanaman, kerapatan pokok, dan nilai PICA per blok, dibaca dari data pengukuran dan dipetakan ke batas blok.</p>
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi loading={loading} label="Blok TBM" value={kpi.blok} /><Kpi loading={loading} label="Luas" value={kpi.luas} unit="Ha" />
          <Kpi loading={loading} label="Tinggi rata-rata" value={kpi.tinggi} unit="cm" /><Kpi loading={loading} label="Nilai PICA rata-rata" value={kpi.pica} />
        </div>
      </Hero>
      <Marquee items={ticker} />
      <div className="mx-auto max-w-6xl space-y-8 p-4 sm:p-8">
        <section aria-label="Filter data" className="rounded-2xl border border-line bg-card p-4 shadow-soft"><FilterBar /></section>
        <div className="grid gap-4 lg:grid-cols-6">
          <Kartu loading={loading} ada={donat.length > 0} kelas="lg:col-span-2 lg:row-span-2" judul="Komposisi kategori PICA" ket={`Jumlah blok per kategori, ${p.label.toLowerCase()} ${p.sub}.`}>
            <div className="h-full min-h-[16rem]"><ResponsiveContainer><PieChart><Pie data={donat} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="88%" paddingAngle={3}>{donat.map((d) => <Cell key={d.name} fill={PICA_WARNA[d.name]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div>
          </Kartu>
          <Kartu loading={loading} ada={bar.length > 0} kelas="lg:col-span-4" judul={`Tinggi tanaman per ${levelBar}`} ket={levelBar === 'blok' ? 'Dalam sentimeter, warna mengikuti kategori PICA.' : 'Rata-rata dalam sentimeter. Pilih kebun atau afdeling untuk melihat per blok.'}>
            <div className="h-56"><ResponsiveContainer><BarChart data={bar}><XAxis dataKey="blok" tick={{ fontSize: 11 }} interval={0} angle={bar.length > 6 ? -35 : 0} textAnchor={bar.length > 6 ? 'end' : 'middle'} height={bar.length > 6 ? 64 : 30} /><YAxis tick={{ fontSize: 12 }} width={36} /><Tooltip /><Bar dataKey="tinggi" radius={[6, 6, 0, 0]}>{bar.map((b, i) => <Cell key={i} fill={b.k ? PICA_WARNA[b.k] ?? ABU : '#0E6B66'} />)}</Bar></BarChart></ResponsiveContainer></div>
          </Kartu>
          <Kartu loading={loading} ada={skor.length > 0} kelas="lg:col-span-2" judul="Skor rata-rata per parameter" ket="Skala 0 sampai 100.">
            <div className="h-56"><ResponsiveContainer><BarChart data={skor} layout="vertical" margin={{ left: 12 }}><XAxis type="number" domain={[0, 100]} hide /><YAxis type="category" dataKey="nama" width={96} tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="nilai" fill="#0E6B66" radius={[0, 6, 6, 0]} /></BarChart></ResponsiveContainer></div>
          </Kartu>
          <Kartu loading={loading} ada={tren.some((t) => t.pica != null)} kelas="lg:col-span-2" judul="Tren nilai PICA" ket="Rata-rata nilai PICA pada lima periode.">
            <div className="h-56"><ResponsiveContainer><LineChart data={tren} margin={{ left: 0, right: 12 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="periode" tick={{ fontSize: 11 }} /><YAxis domain={['auto', 'auto']} tick={{ fontSize: 12 }} width={34} /><Tooltip /><Line type="monotone" dataKey="pica" name="Nilai PICA" stroke="#0E6B66" strokeWidth={2.5} dot={{ r: 4 }} connectNulls /></LineChart></ResponsiveContainer></div>
          </Kartu>
        </div>
        <section>
          <h2 className="mb-3 text-xl font-semibold tracking-tight">Foto lapangan</h2>
          <FotoCarousel />
        </section>
        {!rows.length && !loading && <Kosong judul="Tidak ada blok untuk ditampilkan" isi={adaDiLain ? `Coba ${adaDiLain.label} ${adaDiLain.sub}, atau ubah filter.` : 'Tidak ada data yang cocok dengan filter, atau data Excel belum termuat.'} />}
        <section>
          <div className="mb-3 flex flex-wrap items-end gap-3">
            <h2 className="mr-auto text-xl font-semibold tracking-tight">Data blok</h2>
          </div>
          <div className="overflow-x-auto rounded-xl border border-line bg-card shadow-soft" tabIndex={0} aria-label="Tabel data, geser ke kanan untuk kolom lainnya">
            <table className="w-full text-sm">
              <thead><tr>{KOLOM.map((k, i) => <th key={k.key} className={`whitespace-nowrap px-3 py-2.5 text-left font-medium text-white ${k.skor ? 'bg-[#C0453F]' : 'bg-accent'} ${i === 3 ? 'sticky left-0 z-20' : ''}`}>{k.label}</th>)}</tr></thead>
              <tbody>
                {loading ? Array.from({ length: 3 }).map((_, i) => <tr key={i}><td colSpan={KOLOM.length} className="p-3"><Skeleton className="h-6" /></td></tr>)
                  : halaman.length ? halaman.map((r) => <Baris key={`${r.Kebun}${r.Afdeling}${r.Blok}`} r={r} />)
                  : <tr><td colSpan={KOLOM.length} className="px-3 py-10 text-center text-mute">Tidak ada baris yang cocok dengan filter.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-mute">
            <span>{dTampil.length} baris. Kolom merah adalah skor dan klasifikasi PICA.</span>
            <span className="flex items-center gap-2">
              <select className="field !w-auto" value={ukuran} onChange={(e) => setUkuran(Number(e.target.value))} aria-label="Baris per halaman">{[25, 50, 100].map((n) => <option key={n} value={n}>{n} per halaman</option>)}</select>
              <button className="btn btn-ghost" disabled={hal <= 1} onClick={() => setHal(hal - 1)}>Sebelumnya</button>
              <span className="font-mono">{hal}/{nHal}</span>
              <button className="btn btn-ghost" disabled={hal >= nHal} onClick={() => setHal(hal + 1)}>Berikutnya</button>
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}
