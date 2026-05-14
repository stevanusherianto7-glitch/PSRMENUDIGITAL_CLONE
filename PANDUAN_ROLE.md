# 📖 Panduan Mengubah Role Karyawan (Kedai Elvera 57 POS)

Dokumen ini menjelaskan cara mengubah hak akses (*Role*) karyawan setelah mereka mendaftar menggunakan Email atau Gmail (Google Auth).

---

## ⚠️ Aturan Penting (Harap Dibaca)
Secara default, sistem diatur untuk memberikan role **`waiter`** kepada setiap pengguna baru yang mendaftar. 

Hanya ada **4 nilai valid** untuk kolom `role` di database:
1. **`manager`** : Bisa akses Dashboard, Laporan, Menu, Kasir, dan semua halaman.
2. **`owner`**   : Bisa akses Dashboard, Laporan, Menu, Kasir, dan semua halaman.
3. **`waiter`**  : Hanya bisa akses halaman Waiter (Antar Pesanan).
4. **`cook`**    : Hanya bisa akses halaman Dapur (Proses Masak).

> [!WARNING]
> Pastikan Anda mengetik nilai role dengan **huruf kecil semua** (lowercase) persis seperti di atas. Jika Anda mengetik `Manager` (dengan 'M' besar) atau `koki`, sistem akan error atau menolak akses mereka.

---

## 🛠️ Langkah-langkah Mengubah Role di Supabase

Jika ada staf baru (misal Koki) yang baru saja login pertama kali dengan Gmail, ikuti langkah ini untuk mengubah hak aksesnya:

1. **Buka Dashboard Supabase**
   * Masuk ke proyek Supabase Anda.

2. **Buka Table Editor**
   * Klik ikon **"Table Editor"** (ikon berbentuk tabel/grid) di sidebar sebelah kiri.

3. **Pilih Tabel `profiles`**
   * Di daftar tabel (skema `public`), klik tabel bernama **`profiles`**.

4. **Cari Data Karyawan**
   * Cari baris data karyawan yang ingin Anda ubah berdasarkan kolom `email` atau `nama`.

5. **Ubah Nilai Role**
   * Klik dua kali (double click) pada kolom **`role`** di baris karyawan tersebut.
   * Hapus tulisan `waiter` dan ganti menjadi **`admin`** atau **`kitchen`** (sesuai kebutuhan).
   * Tekan tombol **Enter** pada keyboard Anda.

6. **Selesai!**
   * Perubahan akan tersimpan secara otomatis. Karyawan tersebut sekarang bisa mencoba logout dan login kembali di aplikasi untuk melihat perubahannya.

---

*Dokumen ini dibuat otomatis oleh Antigravity AI.*
