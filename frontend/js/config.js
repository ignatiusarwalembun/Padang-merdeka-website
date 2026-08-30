window.PM_CONFIG = {
  // Setelah backend Railway dideploy, ganti placeholder ini dengan URL Railway.
  // Saat dibuka di localhost, frontend otomatis memakai http://localhost:3000.
  API_BASE_URL: location.hostname === 'localhost' || location.hostname === '127.0.0.1'
    ? 'http://localhost:3000'
    : 'https://YOUR-RAILWAY-SERVICE.up.railway.app',

  OFFICIAL: {
    bio: 'https://bio.padangmerdeka.com/',
    instagram: 'https://instagram.com/padangmerdeka',
    tiktok: 'https://www.tiktok.com/@padangmerdeka',
    kotaTuaWhatsApp: 'https://wa.me/6282112459363',
    kotaTuaMaps: 'https://www.google.com/maps/place/Padang+Merdeka/@-6.1358912,106.8138698,17z',
    menuPdf: 'https://drive.google.com/file/d/1QrQjFfYNb07Jo7H9Eii1PRlJLPLcn59Q/view?usp=sharing',
    gofood: 'https://gofood.co.id/jakarta/restaurants/brand/977490db-7d76-460a-9b9b-2ea6a0835016',
    // Halaman resmi Padang Merdeka menyediakan pemilih cabang untuk GrabFood/ShopeeFood.
    grabfood: 'https://bio.padangmerdeka.com/',
    shopeefood: 'https://bio.padangmerdeka.com/'
  },

  POLL_INTERVAL_MS: 5000
};
