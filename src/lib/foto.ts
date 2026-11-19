export type Foto = { id: string; src: string; w: number; h: number; judul: string; deskripsi: string };

export const FOTO: Foto[] = [
  { id: 'foto-1', src: '/foto/foto-1.webp', w: 750, h: 1000, judul: 'Pengukuran tinggi tanaman', deskripsi: 'Tim mengukur pelepah TBM di Sigala-Gala, Batang Toru. 9 November 2026.' },
  { id: 'foto-2', src: '/foto/foto-2.webp', w: 750, h: 1000, judul: 'Kunjungan harian vegetatif', deskripsi: 'Pengamatan tanaman di Sei Dadap I/II, Asahan. 12 November 2026.' },
  { id: 'foto-3', src: '/foto/foto-3.webp', w: 1000, h: 750, judul: 'Pencatatan data lapangan', deskripsi: 'Pengukuran dan pencatatan bersama di Sei Dadap I/II, Asahan. 8 November 2026.' },
  { id: 'foto-4', src: '/foto/foto-4.webp', w: 908, h: 607, judul: 'Batas blok AA38', deskripsi: 'Poligon blok AA38 Sei Daun di atas citra satelit, lengkap dengan label nama blok.' },
  { id: 'foto-5', src: '/foto/foto-5.webp', w: 1000, h: 666, judul: 'Pemantauan drone', deskripsi: 'Operator memantau drone sayap tetap yang melayang dengan remote kontrol.' },
  { id: 'foto-6', src: '/foto/foto-6.webp', w: 562, h: 1000, judul: 'Persiapan drone pemetaan', deskripsi: 'Drone Wingtra disiapkan di titik pandang kebun, lengkap dengan laptop dan kotak peralatan.' }
];
