// admin.js

function setupAdminCommands(bot, db, ADMIN_IDS, getText) {
    
    bot.command('broadcast', async (ctx) => {
        // প্রথমে ব্যবহারকারীর ভাষা জেনে নিন
        const doc = await db.collection('users').doc(String(ctx.from.id)).get();
        const lang = doc.exists ? doc.data().language || 'bn' : 'bn';
        
        // অ্যাডমিন আইডি চেক করুন
        if (!ADMIN_IDS.includes(String(ctx.from.id))) {
            return ctx.reply(getText(lang, 'broadcast_fail'));
        }

        const message = ctx.message.text.substring(ctx.message.text.indexOf(' ') + 1);
        if (!message || message === '/broadcast') {
            return ctx.reply('ব্যবহার: /broadcast <আপনার বার্তা>');
        }

        // ডাটাবেস থেকে সকল ব্যবহারকারী ও গ্রুপের তালিকা নিন
        const usersSnapshot = await db.collection('users').get();
        const groupsSnapshot = await db.collection('groups').get();
        
        let successCount = 0;
        let failureCount = 0;

        // সকল ব্যবহারকারীকে বার্তা পাঠান
        for (const userDoc of usersSnapshot.docs) {
            try {
                await bot.telegram.sendMessage(userDoc.data().chat_id, message);
                successCount++;
            } catch (e) {
                failureCount++;
                console.error(`Failed to send to user ${userDoc.id}:`, e.message);
            }
        }

        // সকল গ্রুপে বার্তা পাঠান
        for (const groupDoc of groupsSnapshot.docs) {
            try {
                await bot.telegram.sendMessage(groupDoc.id, message);
                successCount++;
            } catch (e) {
                failureCount++;
                console.error(`Failed to send to group ${groupDoc.id}:`, e.message);
            }
        }
        
        await ctx.reply(getText(lang, 'broadcast_success') + `\nসফল: ${successCount}, ব্যর্থ: ${failureCount}`);
    });

    // ভবিষ্যতে আরও অ্যাডমিন কমান্ড এখানে যোগ করতে পারেন
}

module.exports = { setupAdminCommands };
