import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';
import { FOTO, Foto } from '../lib/foto';
import { Modal } from './ui';

// Kartu foto: gambar selalu utuh (object-contain) di kotak 4:3 yang seragam, diperkecil bila terlalu besar
function Kartu({ f, onBuka }: { f: Foto; onBuka: () => void }) {
  const [ok, setOk] = useState(true);
  return (
    <article className="w-[17.5rem] shrink-0 snap-start rounded-2xl border border-line bg-card p-2.5 shadow-soft sm:w-72">
      <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl bg-[#E4ECE4]">
        {ok ? <img src={f.src} alt={f.judul} width={f.w} height={f.h} loading="lazy" decoding="async" className="max-h-full max-w-full object-contain" onError={() => setOk(false)} />
          : <p className="px-4 text-center text-sm text-mute">Gambar tidak dapat dimuat</p>}
      </div>
      <h3 className="mt-3 px-1 text-sm font-semibold leading-snug">{f.judul}</h3>
      <p className="mt-1 px-1 text-xs leading-relaxed text-mute">{f.deskripsi}</p>
      <button onClick={onBuka} className="mt-2 inline-flex items-center gap-1 px-1 text-xs font-medium text-accent hover:underline"><Maximize2 size={12} />Lihat penuh</button>
    </article>
  );
}

export default function FotoCarousel() {
  const ref = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);
  const [buka, setBuka] = useState<Foto | null>(null);
  const geser = (arah: number) => { const el = ref.current; if (el) el.scrollBy({ left: arah * (el.firstElementChild as HTMLElement).offsetWidth * 1.05, behavior: 'smooth' }); };
  const posisi = (el: HTMLDivElement) => { const w = (el.firstElementChild as HTMLElement | null)?.offsetWidth ?? 1; setI(Math.min(FOTO.length - 1, Math.round(el.scrollLeft / (w + 16)))); };
  return (
    <div aria-roledescription="carousel" aria-label="Foto lapangan">
      <div ref={ref} onScroll={(e) => posisi(e.currentTarget)} className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2">
        {FOTO.map((f) => <Kartu key={f.id} f={f} onBuka={() => setBuka(f)} />)}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="flex gap-1.5">{FOTO.map((f, k) => <span key={f.id} className={`h-1.5 rounded-full transition-all ${k === i ? 'w-6 bg-accent' : 'w-1.5 bg-line'}`} />)}</div>
        <div className="flex gap-1.5">
          <button className="btn btn-ghost !rounded-full !p-1.5" onClick={() => geser(-1)} aria-label="Sebelumnya"><ChevronLeft size={16} /></button>
          <button className="btn btn-ghost !rounded-full !p-1.5" onClick={() => geser(1)} aria-label="Berikutnya"><ChevronRight size={16} /></button>
        </div>
      </div>
      <Modal open={!!buka} onClose={() => setBuka(null)} title={buka?.judul ?? ''}>
        {buka && <><div className="flex max-h-[60dvh] items-center justify-center rounded-xl bg-[#E4ECE4]"><img src={buka.src} alt={buka.judul} className="max-h-[60dvh] max-w-full object-contain" /></div><p className="mt-3 text-sm text-mute">{buka.deskripsi}</p></>}
      </Modal>
    </div>
  );
}
