import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { ChevronRight, Download, Images, LayoutDashboard, Map as MapIcon, Menu, X, PanelLeftClose } from 'lucide-react';
import { useApp } from '../state';
import { PERIODE, PeriodeId, statusAfd } from '../lib/data';
import { DareModal } from './Dare';

const NAV = [
  { to: '/', label: 'Monitoring', icon: LayoutDashboard, end: true },
  { to: '/peta', label: 'Peta', icon: MapIcon },
  { to: '/galeri', label: 'Galeri', icon: Images }
];

function PwaBanner() {
  const [evt, setEvt] = useState<any>(null);
  const [tutup, setTutup] = useState(false);
  useEffect(() => {
    const h = (e: Event) => { e.preventDefault(); setEvt(e); };
    window.addEventListener('beforeinstallprompt', h);
    return () => window.removeEventListener('beforeinstallprompt', h);
  }, []);
  if (!evt || tutup) return null;
  return (
    <div className="flex items-center justify-between gap-3 bg-accent px-4 py-2 text-sm text-white">
      <span>Pasang dashboard ini agar bisa dibuka tanpa sinyal saat inspeksi di kebun.</span>
      <span className="flex shrink-0 gap-2">
        <button className="btn !bg-white !py-1 !text-accent" onClick={async () => { evt.prompt(); await evt.userChoice; setEvt(null); }}><Download size={14} />Pasang</button>
        <button className="btn !py-1 text-white" onClick={() => setTutup(true)} aria-label="Tutup"><X size={14} /></button>
      </span>
    </div>
  );
}

function Sidebar() {
  const { master, periode, filter, setFilter, resetFilter, rowsAll, semuaRows, featsIndeksPeriode, setSidebarOpen } = useApp();
  const tutup = () => setSidebarOpen(false);
  const label = { tanpaBatas: 'Batas belum diunggah', tanpaDataPeriode: 'Tidak ada data periode ini' } as Record<string, string>;
  const aktif = (b: boolean) => (b ? 'bg-accent-soft text-accent' : 'hover:bg-white');
  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      <button onClick={() => { resetFilter(); tutup(); }} className={`rounded-lg px-2 py-1.5 text-left text-sm font-medium ${aktif(!filter.distrik && !filter.kebun && !filter.afd)}`}>Semua wilayah</button>
      {!master && <p className="text-sm text-mute">Master wilayah belum termuat.</p>}
      {master?.regional.map((r) => (
        <div key={r.kode}>
          <p className="text-sm font-semibold">{r.nama}</p>
          {r.distrik.map((d) => (
            <div key={d.kode} className="ml-2 mt-2 border-l border-line pl-3">
              <button onClick={() => { setFilter({ distrik: d.kode, kebun: '', afd: '' }); tutup(); }} className={`w-full rounded-lg px-2 py-1 text-left text-sm ${aktif(filter.distrik === d.kode && !filter.kebun)}`}><span className="font-mono text-xs text-mute">{d.kode}</span>{d.nama !== d.kode && <> {d.nama}</>}</button>
              {filter.distrik === d.kode && d.kebun.map((k) => (
                <div key={k.kode} className="mt-2">
                  <button onClick={() => { setFilter({ distrik: d.kode, kebun: k.kode, afd: '' }); tutup(); }} className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm font-medium ${aktif(filter.kebun === k.kode && !filter.afd)}`}>
                    <span>{k.nama !== k.kode && <>{k.nama} </>}<span className="font-mono text-xs text-mute">{k.kode}</span></span><ChevronRight size={14} />
                  </button>
                  {filter.kebun === k.kode && <ul className="mt-1 space-y-0.5">
                    {k.afdeling.map((a) => {
                      const s = statusAfd(k.kode, a, rowsAll[periode], semuaRows, featsIndeksPeriode);
                      const mati = s.status === 'tanpaTbm';
                      return (
                        <li key={a}>
                          <button disabled={mati} onClick={() => { setFilter({ distrik: d.kode, kebun: k.kode, afd: a }); tutup(); }} aria-current={filter.kebun === k.kode && filter.afd === a}
                            className={`w-full rounded-lg px-3 py-1.5 text-left transition ${mati ? 'cursor-not-allowed text-mute/60' : aktif(filter.kebun === k.kode && filter.afd === a)}`}>
                            <span className="flex items-center justify-between text-sm"><span className="font-mono">{a}</span>
                              {s.status === 'normal' && <span className="text-xs text-mute">{s.nIni} blok</span>}</span>
                            {mati && <span className="block text-xs">Afdeling ini tidak memiliki TBM</span>}
                            {!mati && s.status !== 'normal' && <span className="mt-0.5 inline-block rounded bg-[#F4E7C5] px-1.5 py-0.5 text-[11px] text-[#6B4E0A]">{label[s.status]}</span>}
                          </button>
                        </li>
                      );
                    })}
                  </ul>}
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function Layout() {
  const { periode, setPeriode, sidebarOpen, setSidebarOpen, peringatan, setDareOpen, loading } = useApp();
  const [tersembunyi, setTersembunyi] = useState(false);
  return (
    <div className="flex h-[100dvh] flex-col">
      <PwaBanner />
      <header className="z-30 border-b border-line bg-card">
        <div className="flex items-center gap-3 px-3 py-2.5 sm:px-5">
          <button className="btn btn-ghost !p-2 lg:hidden" onClick={() => setSidebarOpen(true)} aria-label="Buka menu wilayah"><Menu size={18} /></button>
          <button className="btn btn-ghost hidden !p-2 lg:inline-flex" onClick={() => setTersembunyi((v) => !v)} aria-label="Ciutkan sidebar"><PanelLeftClose size={18} /></button>
          <img src="/icon.png" alt="PTPN IV Regional 1" width={32} height={32} className="h-8 w-7 shrink-0 rounded-md" />
          <span className="min-w-0 truncate text-sm font-semibold leading-tight tracking-tight sm:text-base" title="Dashboard Vegetatif TBM Kelapa Sawit PTPN Reg 1"><span className="hidden xl:inline">Dashboard Vegetatif TBM Kelapa Sawit PTPN Reg 1</span><span className="xl:hidden">Dashboard Vegetatif TBM</span></span>
          <nav className="ml-6 hidden gap-1 md:flex">
            {NAV.map((n) => <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm ${isActive ? 'bg-accent-soft font-medium text-accent' : 'text-mute hover:text-ink'}`}><n.icon size={16} />{n.label}</NavLink>)}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {peringatan.length > 0 && !loading && <button onClick={() => setDareOpen(true)} className="btn btn-ghost !py-1.5 text-[#8A5A00]">{peringatan.length} catatan data</button>}
            <label className="block"><span className="sr-only">Periode</span>
              <select className="field !w-auto !py-1.5" value={periode} onChange={(e) => setPeriode(e.target.value as PeriodeId)}>
                {[2026, 2025].map((t) => <optgroup key={t} label={`Tahun ${t}`}>{PERIODE.filter((p) => p.tahun === t).map((p) => <option key={p.id} value={p.id}>{p.label} {p.sub}</option>)}</optgroup>)}
              </select></label>
          </div>
        </div>
      </header>
      <div className="relative flex min-h-0 flex-1">
        <aside className={`hidden shrink-0 border-r border-line bg-card transition-[width] duration-200 lg:block ${tersembunyi ? 'w-0 overflow-hidden border-0' : 'w-72'}`}><Sidebar /></aside>
        {sidebarOpen && (
          <div className="fixed inset-0 z-[1100] lg:hidden" onClick={() => setSidebarOpen(false)}>
            <div className="absolute inset-0 bg-ink/50" />
            <aside className="absolute inset-y-0 left-0 w-[85%] max-w-xs bg-card shadow-soft" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-line px-4 py-3"><span className="font-semibold">Wilayah</span><button className="btn btn-ghost !p-1.5" onClick={() => setSidebarOpen(false)} aria-label="Tutup"><X size={16} /></button></div>
              <Sidebar />
            </aside>
          </div>
        )}
        <main className="min-w-0 flex-1 overflow-y-auto pb-[calc(4rem+var(--safe-b))] md:pb-0"><Outlet /></main>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-line bg-card pb-[var(--safe-b)] md:hidden">
        {NAV.map((n) => <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `flex flex-col items-center gap-0.5 py-2 text-xs ${isActive ? 'font-medium text-accent' : 'text-mute'}`}><n.icon size={20} />{n.label}</NavLink>)}
      </nav>
      <DareModal />
    </div>
  );
}
