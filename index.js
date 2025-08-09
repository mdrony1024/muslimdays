// index.js (Mini-App Launcher Version)
const { Telegraf, Markup } = require('telegraf');

// --- Vercel Environment Variables থেকে গোপন তথ্য ---
const BOT_TOKEN = process.env.BOT_TOKEN;
const VERCEL_URL = process.env.VERCEL_URL;

const bot = new Telegraf(BOT_TOKEN);

// --- /start কমান্ড ---
// এই কমান্ডটি এখন একটি বড় "Open" বাটন দেখাবে
bot.start((ctx) => {
    const miniAppUrl = `https://${VERCEL_URL}/index.html`;

    ctx.reply(
        'আসসালামু আলাইকুম! "দিন মুসলিম" অ্যাপটি ব্যবহার করতে নিচের বাটনে ক্লিক করুন।',
        Markup.keyboard([
            // এটি একটি বিশেষ Web App বাটন
            Markup.button.webApp('🌟 অ্যাপটি খুলুন', miniAppUrl)
        ]).resize()
    );
});

// Vercel এর জন্য এক্সপোর্ট
module.exports = async (req, res) => {
    try {
        // নিশ্চিত করুন যে Webhook রুটটি /api/bot
        if (req.url === '/api/bot') {
            await bot.handleUpdate(req.body, res);
        } else {
            res.status(200).send('Hello! This is the bot server, not the web app.');
        }
    } catch (err) {
        console.error("Error handling update:", err);
        if (!res.headersSent) {
            res.status(500).send("Internal Server Error");
        }
    }
};
