import { ReactNode, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

export const Skeleton = ({ className = '' }: { className?: string }) => <div className={`skel ${className}`} aria-hidden />;

export function useDebounce<T>(value: T, ms = 250) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

const GLYPH = '0123456789#%+-';
// Teks "diacak" lalu menetap, dipakai saat angka KPI berubah
export function Scramble({ text }: { text: string }) {
  const [out, setOut] = useState(text);
  const prev = useRef(text);
  useEffect(() => {
    if (prev.current === text || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setOut(text); prev.current = text; return; }
    prev.current = text;
    let frame = 0;
    const id = setInterval(() => {
      frame++;
      setOut(text.split('').map((c, i) => (i < frame / 2 || c === ' ' || c === ',' || c === '.' ? c : GLYPH[Math.floor(Math.random() * GLYPH.length)])).join(''));
      if (frame / 2 >= text.length) { clearInterval(id); setOut(text); }
    }, 32);
    return () => clearInterval(id);
  }, [text]);
  return <span aria-label={text}>{out}</span>;
}

export function Marquee({ items }: { items: ReactNode[] }) {
  const list = items.length ? items : [<span key="k">Belum ada blok untuk ditampilkan</span>];
  return (
    <div className="marquee overflow-hidden border-y border-line bg-card" aria-label="Ringkasan blok">
      <div className="marquee-track flex w-max gap-10 whitespace-nowrap py-2 text-sm text-mute">
        {[...list, ...list].map((it, i) => <span key={i} className="flex items-center gap-2">{it}<i className="ml-8 h-1 w-1 rounded-full bg-line" /></span>)}
      </div>
    </div>
  );
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[1200] flex items-end justify-center bg-ink/50 p-0 sm:items-center sm:p-6" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div className="max-h-[85dvh] w-full max-w-xl overflow-y-auto rounded-t-2xl bg-card p-5 shadow-soft sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          <button className="btn btn-ghost !p-1.5" onClick={onClose} aria-label="Tutup"><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Breadcrumbs({ items }: { items: string[] }) {
  return (
    <nav aria-label="Lokasi" className="flex flex-wrap items-center gap-1 text-sm text-mute">
      {items.map((t, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight size={14} className="text-line" />}
          <span className={i === items.length - 1 ? 'font-medium text-ink' : ''}>{t}</span>
        </span>
      ))}
    </nav>
  );
}

// Carousel scroll-snap: bisa digeser jari/trackpad, tombol, dan titik
export function Carousel({ slides, label }: { slides: ReactNode[]; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);
  const go = (n: number) => { const el = ref.current; if (!el) return; const k = Math.max(0, Math.min(slides.length - 1, n)); el.scrollTo({ left: k * el.clientWidth, behavior: 'smooth' }); };
  return (
    <div aria-roledescription="carousel" aria-label={label}>
      <div ref={ref} className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto" onScroll={(e) => { const el = e.currentTarget; setI(Math.round(el.scrollLeft / el.clientWidth)); }}>
        {slides.map((s, k) => <div key={k} className="w-full shrink-0 snap-center">{s}</div>)}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="flex gap-1.5">{slides.map((_, k) => <button key={k} onClick={() => go(k)} aria-label={`Slide ${k + 1}`} className={`h-1.5 rounded-full transition-all ${k === i ? 'w-6 bg-accent' : 'w-1.5 bg-line'}`} />)}</div>
        <div className="flex gap-1.5">
          <button className="btn btn-ghost !p-1.5" onClick={() => go(i - 1)} disabled={i === 0} aria-label="Sebelumnya"><ChevronLeft size={16} /></button>
          <button className="btn btn-ghost !p-1.5" onClick={() => go(i + 1)} disabled={i === slides.length - 1} aria-label="Berikutnya"><ChevronRight size={16} /></button>
        </div>
      </div>
    </div>
  );
}

export const Kosong = ({ judul, isi }: { judul: string; isi: string }) => (
  <div className="rounded-xl border border-dashed border-line px-6 py-10 text-center">
    <p className="font-medium">{judul}</p>
    <p className="mx-auto mt-1 max-w-sm text-sm text-mute">{isi}</p>
  </div>
);
