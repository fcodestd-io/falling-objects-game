# Falling Objects — Stage 3+ (Indonesia)

Game arcade berbasis Phaser 3 + TypeScript + Vite. Fitur tambahan: background gambar, nyawa dengan ikon hati PNG, double coin, spell magnet dan kebal yang diaktifkan manual, nyawa tambahan otomatis, serta login nama dan leaderboard lokal.

## Menjalankan

```bash
npm install
npm run dev
```

Untuk build produksi: `npm run build`.

## Kontrol
- Gerak: panah kiri/kanan atau A/D.
- Magnet: klik tombol Magnet atau tekan M. Aktif 5 detik, menarik coin ke pemain.
- Kebal: klik tombol Kebal atau tekan I. Aktif 5 detik; bom dan coin yang terlewat tidak mengurangi nyawa.
- Double coin: spell yang jatuh acak; coin bernilai 2x selama 8 detik.
- Tambah nyawa: jatuh acak dan langsung menambah satu nyawa saat tersentuh (maksimum 5).

Spell magnet, kebal, double coin, dan nyawa jatuh secara acak. Magnet/kebal disimpan sebagai charge dan harus digunakan manual. Data nama, skor, dan leaderboard disimpan di localStorage browser yang sama; data tidak tersinkron antarperangkat/browser.
