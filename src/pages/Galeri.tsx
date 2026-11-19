import { useMemo, useState } from 'react';
import { FOTO, Foto } from '../lib/foto';
import { Modal } from '../components/ui';

// Tata letak bento yang membaca orientasi foto. Grid 4 kolom (2 kolom di layar kecil), disusun per blok
// sehingga tidak ada kotak kosong: foto potret masuk ubin tinggi, foto lanskap masuk ubin lebar atau kecil.
// Foto selalu utuh (contain); latar blur hanya hiasan.
type Ubin = { f: Foto; kelas: string };
const BESAR = 'col-span-2 row-span-2 md:col-span-2 md:row-span-2'; // 2x2, untuk lanskap
const TINGGI = 'row-span-2 md:col-span-1 md:row-span-2'; // 1x2, untuk potret
const potret = (f: Foto) => f.w / f.h < 0.9;

function susun(daftar: Foto[]): Ubin[] {
  const P = daftar.filter(potret), L = daftar.filter((f) => !potret(f)), out: Ubin[] = [];
  const ambil = (a: Foto[]) => a.shift() as Foto;
  while (P.length || L.length) {
    if (P.length >= 2 && L.length >= 1) {            // blok 4x2: lanskap besar + dua potret tinggi
      out.push({ f: ambil(L), kelas: BESAR }, { f: ambil(P), kelas: TINGGI }, { f: ambil(P), kelas: TINGGI });
    } else if (P.length >= 1 && L.length >= 3) {     // blok 4x2: besar, kecil, tinggi, kecil
      out.push({ f: ambil(L), kelas: BESAR }, { f: ambil(L), kelas: '' }, { f: ambil(P), kelas: TINGGI }, { f: ambil(L), kelas: '' });
    } else if (P.length >= 4) {                      // empat potret tinggi
      for (let i = 0; i < 4; i++) out.push({ f: ambil(P), kelas: TINGGI });
    } else {                                         // sisa: satu baris penuh (maks. 4 foto), lanskap diutamakan lebar
      const sisa = [...L, ...P].slice(0, 4); sisa.forEach((f) => (potret(f) ? P : L).splice((potret(f) ? P : L).indexOf(f), 1));
      const k = sisa.length;
      sisa.forEach((f, i) => out.push({ f, kelas: k === 1 ? 'col-span-2 md:col-span-4' : k === 2 ? 'md:col-span-2' : k === 3 && i === 0 ? 'col-span-2 md:col-span-2' : '' }));
    }
  }
  return out;
}

function KotakFoto({ u, onBuka }: { u: Ubin; onBuka: () => void }) {
  const [ok, setOk] = useState(true);
  const { f } = u;
  return (
    <button onClick={onBuka} className={`group relative overflow-hidden rounded-2xl border border-line bg-[#E4ECE4] text-left shadow-soft transition active:scale-[0.99] ${u.kelas}`} aria-label={`Buka foto: ${f.judul}`}>
      {ok && <img src={f.src} alt="" aria-hidden loading="lazy" className="absolute inset-0 h-full w-full scale-125 object-cover opacity-50 blur-2xl" />}
      <div className="absolute inset-0 flex items-center justify-center p-2 pb-14">
        {ok ? <img src={f.src} alt={f.judul} width={f.w} height={f.h} loading="lazy" decoding="async" className="max-h-full max-w-full rounded-lg object-contain shadow-soft" onError={() => setOk(false)} />
          : <p className="px-4 text-center text-sm text-mute">Gambar tidak dapat dimuat</p>}
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-card/90 px-3 py-2 backdrop-blur">
        <p className="truncate text-sm font-semibold">{f.judul}</p>
        <p className="line-clamp-1 text-xs text-mute">{f.deskripsi}</p>
      </div>
    </button>
  );
}

export default function Galeri() {
  const [buka, setBuka] = useState<Foto | null>(null);
  const ubin = useMemo(() => susun(FOTO), []);
  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-8">
      <h1 className="text-3xl font-semibold tracking-tighter sm:text-4xl">Galeri lapangan</h1>
      <p className="mt-2 max-w-[60ch] text-mute">Dokumentasi pengukuran vegetatif, peta blok, dan pemetaan drone. Tata letak menyesuaikan jumlah dan arah foto, gambar tidak dipotong, dan bisa dibuka lebih besar.</p>
      {FOTO.length === 0 ? <p className="mt-8 rounded-xl border border-dashed border-line p-8 text-center text-sm text-mute">Belum ada foto. Tambahkan file ke public/foto dan daftarkan di src/lib/foto.ts.</p> : (
        <div className="mt-6 grid auto-rows-[9.5rem] grid-flow-dense grid-cols-2 gap-3 sm:auto-rows-[11rem] md:grid-cols-4 md:gap-4 lg:auto-rows-[13rem]">
          {ubin.map((u) => <KotakFoto key={u.f.id} u={u} onBuka={() => setBuka(u.f)} />)}
        </div>
      )}
      <Modal open={!!buka} onClose={() => setBuka(null)} title={buka?.judul ?? ''}>
        {buka && <><div className="flex max-h-[60dvh] items-center justify-center rounded-xl bg-[#E4ECE4]"><img src={buka.src} alt={buka.judul} className="max-h-[60dvh] max-w-full object-contain" /></div><p className="mt-3 text-sm text-mute">{buka.deskripsi}</p></>}
      </Modal>
    </div>
  );
}
