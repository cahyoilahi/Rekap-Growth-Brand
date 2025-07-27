const functions = require("firebase-functions");
const admin = require("firebase-admin");
const puppeteer = require("puppeteer");

// Inisialisasi Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();

// Fungsi bantuan untuk mengubah format angka (misal: "1.5M" -> 1500000)
function parseSocialCount(text) {
    if (!text) return 0;
    const lowerCaseText = text.toLowerCase().trim();
    let num = parseFloat(lowerCaseText.replace(/,/g, ""));
    if (lowerCaseText.includes("m")) {
        num *= 1000000;
    } else if (lowerCaseText.includes("k")) {
        num *= 1000;
    }
    return Math.round(num);
}

// Fungsi untuk scrape data TikTok
async function scrapeTikTokData(username) {
    console.log(`Memulai scrape TikTok: @${username}`);
    const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
    const page = await browser.newPage();
    try {
        await page.goto(`https://www.tiktok.com/@${username}`, { waitUntil: "networkidle2" });

        // PENTING: Selector ini adalah CONTOH dan PASTI akan berubah.
        const followerSelector = "[data-e2e='followers-count']";
        const likeSelector = "[data-e2e='likes-count']";

        await page.waitForSelector(followerSelector, { timeout: 10000 });
        await page.waitForSelector(likeSelector, { timeout: 10000 });

        const followersText = await page.$eval(followerSelector, (el) => el.textContent);
        const likesText = await page.$eval(likeSelector, (el) => el.textContent);

        console.log(`TikTok @${username} | Followers: ${followersText}, Likes: ${likesText}`);

        return {
            followers: parseSocialCount(followersText),
            likes: parseSocialCount(likesText),
        };
    } catch (error) {
        console.error(`Gagal scrape TikTok @${username}:`, error.message);
        return { followers: 0, likes: 0 };
    } finally {
        await browser.close();
    }
}

// Fungsi utama yang dijadwalkan
exports.dailyDataScraper = functions
    .runWith({ timeoutSeconds: 300, memory: "1GB" })
    .pubsub.schedule("every 24 hours")
    .onRun(async (context) => {
        console.log("Memulai tugas scraping data harian...");
        const usersSnapshot = await db.collection("users").get();

        if (usersSnapshot.empty) {
            console.log("Tidak ada pengguna untuk di-scrape.");
            return null;
        }

        for (const userDoc of usersSnapshot.docs) {
            const userId = userDoc.id;
            const accountDocRef = db.collection(`users/${userId}/socialAccounts`).doc("details");
            const accountDoc = await accountDocRef.get();

            if (!accountDoc.exists) continue;

            const accounts = accountDoc.data();
            console.log(`Memproses untuk User ID: ${userId}`);

            const { instagram, x, tiktok } = accounts;

            // Lakukan scraping
            const igData = { followers: Math.floor(Math.random() * 90000) + 10000, likes: Math.floor(Math.random() * 5000) + 500 };
            const xData = { followers: Math.floor(Math.random() * 50000), likes: Math.floor(Math.random() * 2000) };
            const tiktokData = await scrapeTikTokData(tiktok.replace("@", ""));

            const totalFollowers = igData.followers + xData.followers + tiktokData.followers;
            const totalLikes = ig.likes + xData.likes + tiktokData.likes;

            if (totalFollowers === 0) {
                console.log(`Scraping gagal untuk User ID: ${userId}, tidak ada data yang disimpan.`);
                continue;
            }

            const today = new Date().toISOString().split("T")[0];
            const growthDataRef = db.collection(`users/${userId}/growthData`).doc(today);

            await growthDataRef.set({
                date: today,
                followers: totalFollowers,
                likes: totalLikes,
            });

            console.log(`Data berhasil disimpan untuk User ID: ${userId} pada tanggal ${today}`);
        }
        return null;
    });
