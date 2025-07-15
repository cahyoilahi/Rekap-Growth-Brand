// Import library yang dibutuhkan
const express = require('express');
const cors = require('cors'); // Untuk mengizinkan koneksi dari frontend

// Inisialisasi aplikasi Express
const app = express();
const PORT = 3000; // Server akan berjalan di port 3000

// Gunakan CORS agar frontend bisa mengakses backend ini
app.use(cors());

// =================================================================
// BAGIAN SIMULASI - Di aplikasi nyata, bagian ini akan diganti
// =================================================================

/**
 * SIMULASI DATABASE
 * Di aplikasi nyata, Anda akan menggunakan database seperti PostgreSQL, MongoDB, atau MySQL.
 * Objek ini bertindak sebagai penyimpanan sementara untuk data pertumbuhan.
 */
const simulatedDatabase = {};

/**
 * FUNGSI SIMULASI UNTUK MENGAMBIL DATA DARI API INSTAGRAM
 * @param {string} username - Username Instagram
 * @returns {Promise<object>} - Data followers dan likes
 */
async function fetchInstagramData(username) {
    console.log(`[API SIM] Meminta data untuk Instagram: @${username}`);
    // Di sini Anda akan menggunakan library seperti 'axios' atau 'node-fetch'
    // untuk memanggil API Instagram Graph dengan Kunci API Anda.
    // Kita simulasikan dengan data acak.
    return {
        followers: Math.floor(Math.random() * (60000 - 50000) + 50000), // antara 50k - 60k
        likes: Math.floor(Math.random() * (25000 - 20000) + 20000)
    };
}

/**
 * FUNGSI SIMULASI UNTUK MENGAMBIL DATA DARI API X (TWITTER)
 * @param {string} username - Username X
 * @returns {Promise<object>} - Data followers dan likes
 */
async function fetchXData(username) {
    console.log(`[API SIM] Meminta data untuk X: @${username}`);
    // Panggil API X di sini...
    return {
        followers: Math.floor(Math.random() * (30000 - 20000) + 20000), // antara 20k - 30k
        likes: Math.floor(Math.random() * (18000 - 12000) + 12000)
    };
}

/**
 * FUNGSI SIMULASI UNTUK MENGAMBIL DATA DARI API TIKTOK
 * @param {string} username - Username TikTok
 * @returns {Promise<object>} - Data followers dan likes
 */
async function fetchTikTokData(username) {
    console.log(`[API SIM] Meminta data untuk TikTok: @${username}`);
    // Panggil API TikTok di sini...
    return {
        followers: Math.floor(Math.random() * (50000 - 40000) + 40000), // antara 40k - 50k
        likes: Math.floor(Math.random() * (10000 - 7000) + 7000)
    };
}

/**
 * FUNGSI UTAMA UNTUK MENGAMBIL DAN MENYIMPAN DATA HARIAN
 * Di aplikasi nyata, fungsi ini akan dijalankan oleh cron job setiap hari.
 */
async function fetchAndStoreDailyData(usernames) {
    const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
    
    // Ambil data dari semua platform secara bersamaan
    const [igData, xData, tiktokData] = await Promise.all([
        fetchInstagramData(usernames.instagram),
        fetchXData(usernames.x),
        fetchTikTokData(usernames.tiktok)
    ]);

    // Simpan ke database simulasi kita
    if (!simulatedDatabase[today]) {
        simulatedDatabase[today] = {};
    }
    simulatedDatabase[today] = {
        instagram: igData,
        x: xData,
        tiktok: tiktokData,
        totalFollowers: igData.followers + xData.followers + tiktokData.followers,
        totalLikes: igData.likes + xData.likes + tiktokData.likes,
    };

    console.log(`[DB SIM] Data untuk tanggal ${today} berhasil disimpan:`, simulatedDatabase[today]);
}


// =================================================================
// BAGIAN API ENDPOINT - Ini adalah "pintu" yang diakses frontend
// =================================================================

app.get('/api/growth-data', async (req, res) => {
    const { instagram, x, tiktok, period } = req.query;

    if (!instagram || !x || !tiktok || !period) {
        return res.status(400).json({ error: 'Parameter tidak lengkap. Diperlukan username dan periode.' });
    }

    // SIMULASI: Setiap kali frontend meminta data, kita jalankan proses pengambilan data harian.
    // Di aplikasi nyata, proses ini berjalan terpisah di latar belakang.
    await fetchAndStoreDailyData({ instagram, x, tiktok });

    // LOGIKA UNTUK MENYIAPKAN DATA GRAFIK
    // Di aplikasi nyata, Anda akan mengambil data dari database asli untuk 7, 30, atau 90 hari terakhir.
    // Kita akan tetap menggunakan data statis untuk struktur grafiknya agar sederhana.
    const chartDataStructure = {
        '7': { labels: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'], followers: [124, 126, 129, 135, 140, 148, 155], likes: [5.2, 5.8, 6.1, 5.5, 7.2, 8.0, 7.5] },
        '30': { labels: ['Minggu 1', 'Minggu 2', 'Minggu 3', 'Minggu 4'], followers: [105, 112, 119, 125.6], likes: [10.5, 12.1, 11.8, 10.8] },
        '90': { labels: ['Bulan 1', 'Bulan 2', 'Bulan 3'], followers: [88, 105, 125.6], likes: [35.2, 40.1, 45.2] }
    };
    
    // Kirim data kembali ke frontend
    res.json(chartDataStructure[period] || chartDataStructure['30']);
});


// Menjalankan server
app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
    console.log("Backend ini siap menerima permintaan dari frontend Anda.");
    console.log("CATATAN: Data yang dikirim masih berupa simulasi, tetapi strukturnya sudah benar.");
});
