import { useEffect, useMemo, useRef, useState } from 'react';
import { GeoJSON, MapContainer, TileLayer, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Download, Expand, FileWarning, Plus, SlidersHorizontal, Upload, X } from 'lucide-react';
import FilterBar, { jumlahFilter } from '../components/FilterBar';
import { useApp } from '../state';
import { ABU, Feat, PERIODE, PICA_WARNA, fmt, isNum } from '../lib/data';
import { useDare } from '../components/Dare';
import { Skeleton } from '../components/ui';

const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

function Fit({ feats, tick, kunci }: { feats: Feat[]; tick: number; kunci: string }) {
  const map = useMap();
  useEffect(() => {
    try {
      if (!feats.length) return;
      const b = L.geoJSON({ type: 'FeatureCollection', features: feats } as any).getBounds();
      if (b.isValid()) map.fitBounds(b, { padding: [40, 40] });
    } catch { /* geometri rusak, abaikan */ }
  }, [kunci, tick, map]);
  return null;
}

export default function Peta() {
  const { loading, filter, cocok, feats, muatBatas, memuatBatas, tambahFeats, tambahPeringatan, periode, konfirmasi, rowsAll, setDareOpen } = useApp();
  const { joined } = useDare();
  const [pilihId, setPilihId] = useState<string | null>(null);
  const [fab, setFab] = useState(false);
  const [tick, setTick] = useState(0);
  const [ringkas, setRingkas] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const terlihat = useMemo(() => joined.filter((j) => cocok(j.kebun, j.afd, `${j.feat.properties?.blok ?? ''} ${j.row?.Blok ?? j.blok ?? ''}`, j.row?.Kategori ?? null)), [joined, cocok]);
  const [panel, setPanel] = useState(false);
  useEffect(() => { muatBatas(); }, [muatBatas]);
  const labelOn = terlihat.length <= 150; // label permanen berat bila ribuan poligon
  const kunciTampil = `${terlihat.length}:${terlihat[0]?.id ?? ''}:${terlihat[terlihat.length - 1]?.id ?? ''}`;
  const pilih = terlihat.find((j) => j.id === pilihId) ?? null;
  const idx = PERIODE.findIndex((p) => p.id === periode);
  const lain = (PERIODE[idx + 1] ?? PERIODE[idx - 1]).id; // pembanding: periode sebelumnya
  const rowLain = pilih?.blok ? rowsAll[lain].find((r) => r.Kebun === pilih.kebun && r.Afdeling === pilih.afd && r.Blok === pilih.row?.Blok) : null;
  const delta = (k: string) => (pilih?.row && rowLain && isNum(pilih.row[k]) && isNum(rowLain[k]) ? pilih.row[k] - rowLain[k] : null);

  async function impor(files: FileList | null) {
    if (!files?.length) return;
    let ok = 0, perlu = 0; const warn: string[] = [];
    for (const f of Array.from(files)) {
      try {
        const JSZip = (await import('jszip')).default;
        const zip = await JSZip.loadAsync(await f.arrayBuffer());
        const nama = Object.keys(zip.files).map((n) => n.toLowerCase());
        const kurang = ['.shp', '.shx', '.prj'].filter((e) => !nama.some((n) => n.endsWith(e)));
        if (kurang.length) { warn.push(`${f.name}: file wajib tidak ada (${kurang.join(', ')}).`); continue; }
        const shp = (await import('shpjs')).default;
        const res: any = await shp(await f.arrayBuffer());
        const fcs = Array.isArray(res) ? res : [res];
        const afdNama = f.name.match(/AFD\d+/i)?.[0]?.toUpperCase() ?? '';
        const kebunNama = f.name.match(/^[0-9][A-Z]{3}/i)?.[0]?.toUpperCase() ?? '';
        const baru: Feat[] = fcs.flatMap((fc: any) => fc.features).map((ft: any) => ({
          ...ft, properties: { kebun: ft.properties?.KEBUN ?? kebunNama, afdeling: ft.properties?.AFDELING ?? afdNama, blok: ft.properties?.BLOK ?? null, sumber: f.name, adaDbf: !!ft.properties?.BLOK }
        }));
        if (!baru.length) { warn.push(`${f.name}: tidak ada poligon yang terbaca.`); continue; }
        tambahFeats(baru);
        baru.some((b) => !b.properties.blok) ? perlu++ : ok++;
      } catch (e) { warn.push(`${f.name}: gagal dibaca. Pastikan zip berisi .shp, .shx, dan .prj yang utuh.`); }
    }
    if (warn.length) tambahPeringatan(warn);
    setRingkas(`${files.length} file: ${ok} terhubung, ${perlu} perlu konfirmasi, ${warn.length} gagal`);
    if (input.current) input.current.value = '';
  }

  function unduh() {
    const blob = new Blob([JSON.stringify({ type: 'FeatureCollection', features: terlihat.map((j) => ({ ...j.feat, properties: { ...j.feat.properties, ...(j.row ?? {}) } })) })], { type: 'application/geo+json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'batas_blok.geojson'; a.click(); URL.revokeObjectURL(a.href);
  }

  if (loading) return <div className="p-4"><Skeleton className="h-[70dvh]" /></div>;
  return (
    <div className="relative h-full min-h-[480px]">
      <MapContainer center={[1.68, 100.33]} zoom={13} preferCanvas className="h-full w-full" zoomControl={false}>
        <TileLayer url={ESRI} attribution="Esri World Imagery" maxZoom={19} />
        <Fit feats={terlihat.map((t) => t.feat)} kunci={kunciTampil} tick={tick} />
        {terlihat.map((j) => {
          const wr = j.row?.Kategori ? PICA_WARNA[j.row.Kategori] : ABU;
          return <GeoJSON key={`${j.id}-${periode}-${wr}-${pilihId === j.id}-${labelOn}`} data={j.feat as any}
            style={{ color: pilihId === j.id ? '#fff' : '#101a15', weight: pilihId === j.id ? 3 : 1.5, fillColor: wr, fillOpacity: j.row ? 0.55 : 0.35 }}
            eventHandlers={{ click: () => setPilihId(j.id) }}>
            {labelOn && <Tooltip permanent direction="center" className="blok-label">{j.feat.properties?.blok ?? j.row?.Blok ?? j.blok ?? j.afd}</Tooltip>}
          </GeoJSON>;
        })}
      </MapContainer>

      <div className="absolute left-3 top-3 z-[500] flex max-w-[calc(100%-1.5rem)] flex-col items-start gap-2">
        <button className="btn btn-ghost shadow-soft" onClick={() => setPanel((v) => !v)} aria-expanded={panel}><SlidersHorizontal size={16} />Filter{jumlahFilter(filter) > 0 && <span className="rounded-full bg-accent px-1.5 text-xs text-white">{jumlahFilter(filter)}</span>}<span className="font-normal text-mute">{terlihat.length} poligon</span></button>
        {panel && <div className="w-[min(46rem,calc(100vw-1.5rem))] rounded-xl border border-line bg-card/95 p-3 shadow-soft backdrop-blur"><FilterBar /></div>}
      <div className="flex flex-wrap gap-2">
        <label className="btn btn-ghost cursor-pointer shadow-soft"><Upload size={16} />Impor shapefile (.zip)<input ref={input} type="file" accept=".zip" multiple className="sr-only" onChange={(e) => impor(e.target.files)} /></label>
        {ringkas && <span className="btn btn-ghost shadow-soft">{ringkas}</span>}
      </div>
      </div>
      <div className="absolute bottom-24 left-3 z-[500] max-w-[16rem] md:bottom-6 rounded-lg border border-line bg-card/95 p-2.5 text-xs shadow-soft">
        {Object.entries(PICA_WARNA).map(([k, c]) => <span key={k} className="mr-3 inline-flex items-center gap-1 capitalize"><i className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />{k}</span>)}
        <span className="inline-flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full" style={{ background: ABU }} />Tanpa data</span>
      </div>

      {memuatBatas && <div className="absolute inset-x-0 top-16 z-[550] mx-auto w-fit rounded-full bg-card px-4 py-1.5 text-sm shadow-soft">Memuat batas blok</div>}
      {!terlihat.length && !memuatBatas && <div className="absolute inset-0 z-[400] flex items-center justify-center p-6"><p className="max-w-xs rounded-xl bg-card p-4 text-center text-sm shadow-soft">Tidak ada poligon yang cocok dengan filter. Ubah atau reset filter, atau impor shapefile zip.</p></div>}

      <div className="absolute bottom-24 right-3 z-[500] flex flex-col items-end gap-2 md:bottom-6">
        {fab && <>
          <button className="btn btn-ghost shadow-soft" onClick={() => { setTick((t) => t + 1); setFab(false); }}><Expand size={16} />Zoom ke kebun</button>
          <button className="btn btn-ghost shadow-soft" onClick={() => { unduh(); setFab(false); }}><Download size={16} />Unduh GeoJSON</button>
          <button className="btn btn-ghost shadow-soft" onClick={() => { setDareOpen(true); setFab(false); }}><FileWarning size={16} />Catatan data</button>
        </>}
        <button className="btn btn-primary !h-12 !w-12 !rounded-full !p-0 shadow-soft" onClick={() => setFab((v) => !v)} aria-label="Menu aksi cepat" aria-expanded={fab}><Plus size={22} className={`transition ${fab ? 'rotate-45' : ''}`} /></button>
      </div>

      {pilih && (
        <section className="absolute inset-x-0 bottom-0 z-[600] border-t border-line bg-card p-4 shadow-soft" aria-live="polite">
          <div className="mx-auto flex max-w-5xl items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold"><span className="font-mono">{pilih.afd} {pilih.row?.Blok ?? pilih.blok ?? '(blok belum terhubung)'}</span></h2>
              <p className="text-xs text-mute">{pilih.status === 'terhubung' ? 'Terhubung ke data Excel' : pilih.status === 'belum' ? 'Tanpa data' : 'Cocok ' + (pilih.status === 'parsial' ? 'parsial' : 'usulan') + (konfirmasi.has(pilih.id) ? ', sudah dikonfirmasi' : ', belum dikonfirmasi')} · {PERIODE.find((p) => p.id === periode)!.sub}{pilih.feat.properties?.tt ? `, TBM ${pilih.feat.properties.tt}` : ''}{pilih.feat.properties?.luas ? `, ${pilih.feat.properties.luas} ha (shapefile)` : ''}</p>
            </div>
            <button className="btn btn-ghost !p-1.5" onClick={() => setPilihId(null)} aria-label="Tutup detail"><X size={16} /></button>
          </div>
          {pilih.row ? (
            <dl className="mx-auto mt-3 grid max-w-5xl grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4 lg:grid-cols-7">
              {[['Tinggi (cm)', 'Tinggi Tanaman (cm)', 1], ['Lingkar (cm)', 'Lingkar Batang (cm)', 1], ['Pelepah', 'Jumlah Pelepah', 1], ['Pokok/Ha', 'Pokok/Ha Saat Ini', 1], ['Selisih pohon', 'Selisih Pohon', 0], ['Nilai PICA', 'Nilai PICA', 2], ['Kategori', 'Kategori', 0]].map(([l, k, d]: any) => (
                <div key={l}><dt className="text-xs text-mute">{l}</dt><dd className="font-mono font-medium capitalize">{k === 'Kategori' ? pilih.row![k] ?? '–' : fmt(pilih.row![k], d)}
                  {delta(k) != null && <span className="ml-1 text-xs font-normal text-mute">{delta(k)! >= 0 ? '+' : ''}{fmt(delta(k), 1)} vs {PERIODE.find((q) => q.id === lain)!.sub}</span>}</dd></div>
              ))}
            </dl>
          ) : <p className="mx-auto mt-2 max-w-5xl text-sm text-mute">Tidak ada data Excel untuk poligon ini di periode terpilih.</p>}
        </section>
      )}
    </div>
  );
}
