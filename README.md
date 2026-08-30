# Padang Merdeka — Production-ready Prototype

Prototype ini memisahkan website customer, backend cloud, Restaurant Console, dan POS Connector agar strukturnya siap untuk pola deploy **Netlify + Railway + POS localhost**.

> Ini adalah prototype independen/demonstrasi dan bukan source code resmi Padang Merdeka.

## Struktur

```text
padang-merdeka-production-ready/
├─ frontend/                  # Deploy ke Netlify
│  ├─ index.html              # Website customer
│  ├─ restaurant-console.html # Web B / Restaurant Console
│  ├─ css/
│  ├─ js/
│  └─ assets/                 # fallback images lokal
├─ backend/                   # Deploy ke Railway
│  ├─ src/server.js
│  ├─ src/store.js
│  ├─ package.json
│  ├─ railway.json
│  └─ .env.example
├─ pos-connector/             # Jalan di PC restoran
│  ├─ src/index.js
│  ├─ src/adapters/generic-http.js
│  ├─ mock-pos.js
│  └─ .env.example
├─ netlify.toml
└─ run-demo.bat
```

## Arsitektur

```text
Customer Browser
      │
      ▼
Netlify (frontend)
      │ POST /api/reservations
      ▼
Railway (Express API)
      │
      ├── PostgreSQL (production)
      │
      └── Restaurant Console (admin confirm / reject)
                    │
                    │ confirm
                    ▼
                POS Job
                    │
                    ▼
        POS Connector di PC restoran
                    │
                    ▼
       http://localhost:PORT POS asli
```

Railway **tidak mengakses localhost restoran secara langsung**. Connector berjalan di komputer restoran, menarik job dari Railway, lalu berbicara dengan API POS lokal.

## Demo lokal satu klik (Windows)

1. Pastikan Node.js 20+ dan Python terpasang.
2. Double click `run-demo.bat`.
3. Customer web terbuka di `http://localhost:5510`.
4. Restaurant Console terbuka di tab kedua.
5. Admin key demo: `dev-admin-key`.
6. Submit reservasi dari website customer.
7. Klik **Confirm** di Restaurant Console.
8. Window **Mock POS** akan menerima data reservasi melalui `http://localhost:5050/api/reservations`.

## Deploy Frontend ke Netlify

1. Push folder project ke GitHub.
2. Hubungkan repo ke Netlify.
3. `netlify.toml` sudah mengatur publish directory ke `frontend`.
4. Setelah Railway selesai dideploy, edit `frontend/js/config.js`:

```js
API_BASE_URL: 'https://NAMA-BACKEND.up.railway.app'
```

5. Redeploy Netlify.

## Deploy Backend ke Railway

Set Railway Root Directory ke `backend`.

Environment variables minimum:

```env
NODE_ENV=production
FRONTEND_ORIGINS=https://NAMA-SITE.netlify.app
ADMIN_API_KEY=buat-key-admin-yang-panjang
POS_CONNECTOR_TOKEN=buat-token-connector-yang-panjang
DATABASE_URL=<dari Railway PostgreSQL>
```

Tambahkan PostgreSQL service di project Railway. Backend akan membuat tabel `reservations` dan `pos_jobs` otomatis saat startup.

Health check:

```text
GET /health
```

## Restaurant Console

Buka:

```text
https://NAMA-SITE.netlify.app/console
```

Console meminta `ADMIN_API_KEY`. Key disimpan di `sessionStorage`, bukan ditanam di source frontend.

Alur status:

```text
pending -> confirmed
        -> rejected
```

Ketika reservasi menjadi `confirmed`, backend otomatis membuat POS job.

## POS Connector

Copy folder `pos-connector` ke PC restoran lalu buat file `.env` dari `.env.example`.

Contoh:

```env
API_BASE_URL=https://NAMA-BACKEND.up.railway.app
POS_CONNECTOR_TOKEN=sama-dengan-Railway
POLL_INTERVAL_MS=5000
POS_BASE_URL=http://localhost:8080
POS_RESERVATION_PATH=/api/reservations
POS_LOCAL_TOKEN=
```

Jalankan:

```bash
npm install
npm start
```

### Penting soal POS asli

Connector saat ini memakai **generic HTTP adapter**. Ini benar-benar dapat mengirim data ke localhost, tetapi endpoint/payload POS nyata harus disesuaikan dengan dokumentasi POS yang digunakan restoran.

Jika POS mereka menerima:

```text
POST http://localhost:8080/api/reservations
```

generic adapter bisa langsung digunakan.

Jika format API POS berbeda, cukup ubah:

```text
pos-connector/src/adapters/generic-http.js
```

Website customer dan backend tidak perlu dibongkar.

## Update dari kanal resmi Padang Merdeka

Prototype ini memasukkan elemen yang saat ini ada pada kanal resmi mereka:

- tagline `Satu Nusa Satu Bangsa Satu Selera` dan `#SekaliPadangTetapMerdeka`
- status Halal yang dicantumkan pada halaman resmi
- delivery melalui GoFood, GrabFood dan ShopeeFood
- Hantaran & Catering / layanan resmi
- social media resmi
- daftar outlet yang tercantum di halaman resmi
- Kota Tua: Jl. Lada No.1, Pinangsia, Taman Sari, Jakarta Barat

Menu visual tetap berupa prototype discovery. Sebelum production, nama menu, harga, foto, availability, dan link delivery per outlet sebaiknya diambil dari data resmi terbaru restoran.

## Security notes

Untuk production:

- jangan gunakan key demo;
- batasi `FRONTEND_ORIGINS` hanya ke domain Netlify resmi;
- gunakan Railway PostgreSQL;
- jalankan POS Connector sebagai Windows Service/PM2/NSSM agar otomatis aktif saat PC restoran menyala;
- kalau POS lokal menyediakan authentication, isi `POS_LOCAL_TOKEN`;
- jangan expose port POS lokal ke internet.
