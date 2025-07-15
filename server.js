// Import library yang dibutuhkan
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise'); // Library untuk MySQL
const cron = require('node-cron');

// Inisialisasi aplikasi Express
const app = express();
const PORT = 3000;

app.use(cors());

// =================================================================
// KONEKSI DATABASE MYSQL
// GANTI BAGIAN INI DENGAN DETAIL DATABASE ANDA
// =================================================================
const pool = mysql.createPool({
    host: 'localhost',         // Ganti jika perlu
    user: 'root',              // Ganti dengan username database Anda
    password: 'password_anda', // Ganti dengan password database Anda
    database: 'nama_database_anda', // Ganti dengan nama database Anda
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Tes koneksi saat server mulai
pool.getConnection()
    .then(connection => {
        console.log('✅ Berhasil terhubung ke database MySQL!');
        connection.release();
    })
    .catch(err => {
        console.error('❌ Gagal terhubung ke database:', err.message);
    });

// =================================================================
// FUNGSI SIMULASI API (Tidak perlu diubah)
// =================================================================
async function fetchInstagramData(username) {
    console.log(`[API SIM] Meminta data untuk Instagram: @${username}`);
    return {
        followers: Math.floor(Math.random() * (60000 - 50000) + 50000),
        likes: Math.floor(Math.random() * (25000 - 20000) + 20000)
    };
}
async function fetchXData(username) {
    console.log(`[API SIM] Meminta data untuk X: @${username}`);
    return {
        followers: Math.floor(Math.random() * (30000 - 20000) + 20000),
        likes: Math.floor(Math.random() * (18000 - 12000) + 12000)
    };
}
async function fetchTikTokData(username) {
    console.log(`[API SIM] Meminta data untuk TikTok: @${username}`);
    return {
        followers: Math.floor(Math.random() * (50000 - 40000) + 40000),
        likes: Math.floor(Math.random() * (10000 - 7000) + 7000)
    };
}

// =================================================================
// FUNGSI PENYIMPANAN DATA KE DATABASE
// =================================================================
async function fetchAndStoreDailyData(usernames) {
    const today = new Date().toISOString().split('T')[0];
    
    const [igData, xData, tiktokData] = await Promise.all([
        fetchInstagramData(usernames.instagram),
        fetchXData(usernames.x),
        fetchTikTokData(usernames.tiktok)
    ]);

    const stats = [
        { platform: 'instagram', username: usernames.instagram, ...igData },
        { platform: 'x', username: usernames.x, ...xData },
        { platform: 'tiktok', username: usernames.tiktok, ...tiktokData }
    ];

    try {
        const connection = await pool.getConnection();
        for (const data of stats) {
            const query = `
                INSERT INTO social_media_stats (platform, username, followers, likes, recorded_at)
                VALUES (?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                    followers = VALUES(followers), 
                    likes = VALUES(likes),
                    username = VALUES(username);
            `;
            const values = [data.platform, data.username, data.followers, data.likes, today];
            await connection.execute(query, values);
        }
        connection.release();
        console.log(`[DB] Data untuk tanggal ${today} berhasil disimpan atau diperbarui.`);
    } catch (error) {
        console.error('[DB] Gagal menyimpan data:', error);
    }
}

// =================================================================
// API ENDPOINT YANG DIAKSES FRONTEND
// =================================================================
app.get('/api/growth-data', async (req, res) => {
    const period = parseInt(req.query.period) || 30;

    try {
        const query = `
            SELECT
                recorded_at AS date,
                SUM(followers) AS total_followers,
                SUM(likes) AS total_likes
            FROM
                social_media_stats
            WHERE
                recorded_at >= CURDATE() - INTERVAL ? DAY
            GROUP BY
                recorded_at
            ORDER BY
                recorded_at ASC;
        `;
        
        const [rows] = await pool.query(query, [period]);

        if (rows.length === 0) {
            return res.json({ labels: [], followers: [], likes: [] });
        }

        const chartData = {
            labels: rows.map(row => new Date(row.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })),
            followers: rows.map(row => (Number(row.total_followers) / 1000).toFixed(1)),
            likes: rows.map(row => (Number(row.total_likes) / 1000).toFixed(1))
        };
        
        res.json(chartData);
    } catch (error) {
        console.error('[API] Gagal mengambil data dari database:', error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
    }
});

// =================================================================
// PENJADWALAN OTOMATIS (CRON JOB)
// =================================================================
cron.schedule('5 0 * * *', () => {
    console.log('[CRON] Menjalankan tugas harian...');
    fetchAndStoreDailyData({
        instagram: 'user_ig_anda',
        x: 'user_x_anda',
        tiktok: 'user_tiktok_anda'
    });
}, {
    timezone: "Asia/Jakarta"
});

// =================================================================
// MENJALANKAN SERVER
// =================================================================
app.listen(PORT, () => {
    console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
    console.log("   Backend siap menerima permintaan dari frontend.");
    console.log("   Cron job untuk pengambilan data harian telah dijadwalkan.");
});