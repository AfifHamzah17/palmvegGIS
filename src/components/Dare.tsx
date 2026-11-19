import { useEffect, useMemo } from 'react';
import { Modal } from './ui';
import { useApp } from '../state';
import { joinGeo, isNum } from '../lib/data';

// DARE: Data Anomaly & Rule Engine. Semua yang tidak pasti ditampilkan di sini, tidak diam-diam.
export function useDare() {
  const { feats, rowsAll, periode, semuaRows, konfirmasi } = useApp();
  return useMemo(() => {
    const joined = joinGeo(feats, rowsAll[periode], semuaRows);
    const perluKonfirmasi = joined.filter((j) => (j.status === 'parsial' || j.status === 'usulan') && !konfirmasi.has(j.id));
    const belum = joined.filter((j) => j.status === 'belum' && semuaRows.some((r) => r.Kebun === j.kebun)); // kebun tanpa data Excel dianggap wajar, bukan anomali
    const anomali = rowsAll[periode].filter((r) => isNum(r['Selisih Pohon']) && r['Selisih Pohon'] > 0);
    return { joined, perluKonfirmasi, belum, anomali };
  }, [feats, rowsAll, periode, semuaRows, konfirmasi]);
}

export function DareModal() {
  const { dareOpen, setDareOpen, peringatan, setKonfirmasi, muatBatas } = useApp();
  useEffect(() => { if (dareOpen) muatBatas(); }, [dareOpen, muatBatas]);
  const { perluKonfirmasi, belum, anomali } = useDare();
  const kosong = !peringatan.length && !perluKonfirmasi.length && !belum.length && !anomali.length;
  return (
    <Modal open={dareOpen} onClose={() => setDareOpen(false)} title="Catatan data (DARE)">
      {kosong && <p className="text-sm text-mute">Tidak ada anomali. Semua batas terhubung ke data.</p>}
      {peringatan.length > 0 && <section className="mb-4"><h3 className="mb-1 text-sm font-semibold">Peringatan impor</h3><ul className="list-disc space-y-1 pl-5 text-sm text-mute">{peringatan.map((p, i) => <li key={i}>{p}</li>)}</ul></section>}
      {perluKonfirmasi.length > 0 && (
        <section className="mb-4"><div className="mb-2 flex items-center justify-between gap-3"><h3 className="text-sm font-semibold">Perlu konfirmasi ({perluKonfirmasi.length})</h3>{perluKonfirmasi.length > 1 && <button className="btn btn-ghost !py-1" onClick={() => perluKonfirmasi.forEach((j) => setKonfirmasi(j.id))}>Konfirmasi semua</button>}</div>
          <ul className="space-y-2">{perluKonfirmasi.slice(0, 30).map((j) => (
            <li key={j.id} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-white p-3 text-sm">
              <span><span className="font-mono">{j.afd}</span>: {j.status === 'parsial' ? <>blok peta <b className="font-mono">{j.feat.properties.blok}</b> cocok parsial dengan <b className="font-mono">{j.blok === j.feat.properties.blok ? j.row?.Blok : j.row?.Blok}</b> di Excel</> : <>peta tanpa atribut, diusulkan sebagai blok <b className="font-mono">{j.blok}</b> dari Excel</>}</span>
              <button className="btn btn-primary !py-1" onClick={() => setKonfirmasi(j.id)}>Konfirmasi</button>
            </li>))}</ul>{perluKonfirmasi.length > 30 && <p className="mt-2 text-xs text-mute">Menampilkan 30 pertama dari {perluKonfirmasi.length}.</p>}</section>
      )}
      {belum.length > 0 && <section className="mb-4"><h3 className="mb-1 text-sm font-semibold">Belum terhubung ({belum.length})</h3><p className="text-sm text-mute">Poligon ini tampil abu-abu dengan label &quot;Tanpa data&quot;: {[...new Set(belum.map((j) => `${j.kebun} ${j.afd} ${j.feat.properties?.blok ?? ''}`.trim()))].slice(0, 20).join(', ')}{belum.length > 20 ? ` dan ${belum.length - 20} lainnya` : ''}.</p></section>}
      {anomali.length > 0 && <section><h3 className="mb-1 text-sm font-semibold">Pokok bertambah tanpa catatan sisipan ({anomali.length})</h3><p className="text-sm text-mute">Jumlah pokok sekarang lebih besar dari pokok awal di blok: {anomali.slice(0, 15).map((r) => `${r.Kebun} ${r.Afdeling} ${r.Blok}`).join(', ')}{anomali.length > 15 ? ` dan ${anomali.length - 15} lainnya` : ''}.</p></section>}
    </Modal>
  );
}
