// index.js (চূড়ান্ত এবং সুরক্ষিত কোড)

const { Telegraf, Markup } = require('telegraf');
const admin = require('firebase-admin');
const axios = require('axios');
const express = require('express');

// --- Vercel Environment Variables থেকে গোপন তথ্য নিরাপদে লোড হবে ---
// এই কোডে কোনো পরিবর্তন করবেন না। Vercel নিজে থেকেই এই তথ্যগুলো বসিয়ে দেবে।
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_IDS = (process.env.ADMIN_IDS || '').split(',');
const FIREBASE_SERVICE_ACCOUNT_JSON = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
const GIGADS_CODE = process.env.GIGADS_CODE;
const VERCEL_URL = process.env.VERCEL_URL;

// --- Firebase শুরু করুন ---
try {
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(JSON.parse(FIREBASE_SERVICE_ACCOUNT_JSON))
        });
    }
} catch (e) {
    console.error('Firebase admin initialization error', e);
}
const db = admin.firestore();

// --- মাল্টি-ল্যাঙ্গুয়েজ টেক্সট ---
const translations = {
  bn: {
    welcome: (name) => `আসসালামু আলাইকুম, ${name}!\n\n"দিন মুসলিম" বটে আপনাকে স্বাগতম।`,
    menu_prompt: 'অনুগ্রহ করে নিচের মেনু থেকে আপনার প্রয়োজনীয় সেবা বেছে নিন:',
    prayer_times: '🕋 নামাজের সময়', quran: '📖 কুরআন', hadith: '📜 হাদিস', tasbeeh: '📿 ডিজিটাল তাসবিহ', qibla: '🧭 কিবলা', language: '🌐 ভাষা', web_notify: '🔔 ওয়েব নোটিফিকেশন',
    coming_soon: 'এই ফিচারটি খুব শীঘ্রই আসছে।',
    location_prompt: 'আপনার এলাকার নামাজের সঠিক সময় জানতে, শহরের নাম লিখুন। যেমন: `Dhaka`',
    broadcast_success: (s, f) => `✅ বার্তাটি সফলভাবে পাঠানো শুরু হয়েছে।\nসফল: ${s}, ব্যর্থ: ${f}`,
    broadcast_fail: '❌ শুধুমাত্র অ্যাডমিন এই কমান্ডটি ব্যবহার করতে পারবেন।',
    broadcast_usage: 'ব্যবহার: /broadcast <আপনার বার্তা>',
    lang_selected: '✅ আপনার ভাষা সফলভাবে পরিবর্তন করা হয়েছে।',
    ad_message: `\n\n---\n${GIGADS_CODE}\n---`
  },
  en: {
    welcome: (name) => `Assalamualaikum, ${name}!\n\nWelcome to the "Din Muslim" bot.`,
    menu_prompt: 'Please choose a service from the menu below:',
    prayer_times: '🕋 Prayer Times', quran: '📖 Quran', hadith: '📜 Hadith', tasbeeh: '📿 Digital Tasbeeh', qibla: '🧭 Qibla', language: '🌐 Language', web_notify: '🔔 Web Notification',
    coming_soon: 'This feature is coming soon.',
    location_prompt: 'To get prayer times, please write the city name. e.g., `Dhaka`',
    broadcast_success: (s, f) => `✅ Broadcast has started.\nSuccess: ${s}, Failed: ${f}`,
    broadcast_fail: '❌ Only admins can use this command.',
    broadcast_usage: 'Usage: /broadcast <your message>',
    lang_selected: '✅ Your language has been changed successfully.',
    ad_message: `\n\n---\n${GIGADS_CODE}\n---`
  }
};

const bot = new Telegraf(BOT_TOKEN);

// --- হেলপার ফাংশন ---
const getUserLang = async (ctx) => (await db.collection('users').doc(String(ctx.from.id)).get()).data()?.language || 'bn';
const getText = (lang, key, ...args) => (translations[lang]?.[key] instanceof Function ? translations[lang][key](...args) : translations[lang]?.[key]);

let commandCount = {};
const sendAdIfNeeded = async (ctx) => {
    const userId = ctx.from.id;
    commandCount[userId] = (commandCount[userId] || 0) + 1;
    if (commandCount[userId] % 5 === 0) {
        try { await ctx.reply(getText(await getUserLang(ctx), 'ad_message')); } catch (e) { console.error("Ad Error:", e.message); }
    }
};

const sendMainMenu = async (ctx) => {
    const lang = await getUserLang(ctx);
    const webNotifyUrl = `https://${VERCEL_URL}/index.html?chat_id=${ctx.from.id}&lang=${lang}`;
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback(getText(lang, 'prayer_times'), 'PRAYER_TIMES')],
        [Markup.button.callback(getText(lang, 'quran'), 'COMING_SOON'), Markup.button.callback(getText(lang, 'hadith'), 'COMING_SOON')],
        [Markup.button.callback(getText(lang, 'tasbeeh'), 'COMING_SOON'), Markup.button.callback(getText(lang, 'qibla'), 'COMING_SOON')],
        [Markup.button.callback(getText(lang, 'language'), 'LANGUAGE_MENU'), Markup.button.url(getText(lang, 'web_notify'), webNotifyUrl)]
    ]);
    await ctx.reply(getText(lang, 'menu_prompt'), keyboard);
};

// --- বট কমান্ড ---
bot.start(async (ctx) => {
    const userRef = db.collection('users').doc(String(ctx.from.id));
    const doc = await userRef.get();
    if (!doc.exists) {
        await userRef.set({ chat_id: ctx.chat.id, username: ctx.from.username, first_name: ctx.from.first_name, language: 'bn' });
        return ctx.reply('ভাষা বেছে নিন / Choose language:', Markup.inlineKeyboard([ Markup.button.callback('বাংলা', 'SET_LANG_bn'), Markup.button.callback('English', 'SET_LANG_en') ]));
    }
    await ctx.reply(getText(await getUserLang(ctx), 'welcome', ctx.from.first_name));
    await sendMainMenu(ctx);
});

bot.action(/SET_LANG_(.+)/, async (ctx) => {
    const langCode = ctx.match[1];
    await db.collection('users').doc(String(ctx.from.id)).update({ language: langCode });
    await ctx.answerCbQuery(getText(langCode, 'lang_selected'));
    await ctx.deleteMessage().catch(()=>{});
    await ctx.reply(getText(langCode, 'welcome', ctx.from.first_name));
    await sendMainMenu(ctx);
});

bot.action('LANGUAGE_MENU', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('ভাষা বেছে নিন / Choose language:', Markup.inlineKeyboard([ Markup.button.callback('বাংলা', 'SET_LANG_bn'), Markup.button.callback('English', 'SET_LANG_en') ]));
});

bot.action('PRAYER_TIMES', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(getText(await getUserLang(ctx), 'location_prompt'));
    await sendAdIfNeeded(ctx);
});

bot.action('COMING_SOON', async(ctx) => await ctx.answerCbQuery(getText(await getUserLang(ctx), 'coming_soon'), { show_alert: true }));

bot.on('text', async (ctx) => {
    if (ctx.message.text.startsWith('/')) return;
    try {
        const response = await axios.get(`http://api.aladhan.com/v1/timingsByCity`, { params: { city: ctx.message.text, country: '', method: 1 } });
        const { timings, date, meta } = response.data.data;
        await ctx.reply(`City: ${ctx.message.text}\nDate: ${date.readable}\nTimezone: ${meta.timezone}\n\nFajr: ${timings.Fajr}\nDhuhr: ${timings.Dhuhr}\nAsr: ${timings.Asr}\nMaghrib: ${timings.Maghrib}\nIsha: ${timings.Isha}`);
    } catch (e) { /* কোনো শহর না মিললে কোনো উত্তর দেবে না */ }
    await sendAdIfNeeded(ctx);
});

bot.on('new_chat_members', async (ctx) => {
    if (ctx.message.new_chat_members.some(m => m.id === ctx.botInfo.id)) {
        await db.collection('groups').doc(String(ctx.chat.id)).set({ title: ctx.chat.title, type: ctx.chat.type });
        await ctx.reply('Assalamualaikum! I will now send notifications in this group.');
    }
});

// --- অ্যাডমিন কমান্ড: ব্রডকাস্ট ---
bot.command('broadcast', async (ctx) => {
    const lang = await getUserLang(ctx);
    if (!ADMIN_IDS.includes(String(ctx.from.id))) {
        return ctx.reply(getText(lang, 'broadcast_fail'));
    }
    const message = ctx.message.text.substring(ctx.message.text.indexOf(' ') + 1);
    if (!message || message === '/broadcast') {
        return ctx.reply(getText(lang, 'broadcast_usage'));
    }
    const usersSnapshot = await db.collection('users').get();
    const groupsSnapshot = await db.collection('groups').get();
    let successCount = 0, failureCount = 0;
    const broadcastPromises = [];
    usersSnapshot.forEach(doc => { broadcastPromises.push(bot.telegram.sendMessage(doc.data().chat_id, message)); });
    groupsSnapshot.forEach(doc => { broadcastPromises.push(bot.telegram.sendMessage(doc.id, message)); });
    const results = await Promise.allSettled(broadcastPromises);
    results.forEach(result => result.status === 'fulfilled' ? successCount++ : failureCount++);
    await ctx.reply(getText(lang, 'broadcast_success', successCount, failureCount));
});

// --- Express সার্ভার এবং Webhook ---
const app = express();
app.use(express.json());
app.post('/save-fcm-token', async (req, res) => {
    const { chatId, fcmToken } = req.body;
    if (!chatId || !fcmToken) return res.status(400).json({ success: false, message: 'Missing data' });
    try {
        await db.collection('users').doc(String(chatId)).update({ fcmToken });
        res.status(200).json({ success: true, message: 'Token saved' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to save token' });
    }
});
app.use(async (req, res) => {
    try { await bot.handleUpdate(req.body, res); } catch (err) { console.error('Error handling update:', err); }
    if (!res.headersSent) { res.status(200).send('OK'); }
});
module.exports = app;
