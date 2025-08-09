// app.js (চূড়ান্ত সংস্করণ)

// এই ফাংশনটি তখনই চলবে যখন HTML পেজের সমস্ত কিছু লোড হয়ে যাবে।
document.addEventListener('DOMContentLoaded', () => {
    
    // টেলিগ্রাম ওয়েব অ্যাপের অবজেক্টটি নিন
    const tg = window.Telegram.WebApp;
    
    // অ্যাপটিকে পূর্ণ স্ক্রিনে দেখানোর জন্য
    tg.expand();

    // --- ব্যবহারকারীর তথ্য সেট করুন ---
    const user = tg.initDataUnsafe?.user;
    const greetingNameElement = document.getElementById('greeting-name');
    
    if (user && user.first_name) {
        greetingNameElement.textContent = user.first_name;
    } else {
        greetingNameElement.textContent = 'ব্যবহারকারী'; // যদি নাম না পাওয়া যায়
    }

    // --- আজকের তারিখ সেট করুন ---
    const today = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('date-today').textContent = today.toLocaleDateString('bn-BD', options);

    // --- ডার্ক মোড চেক করুন এবং প্রয়োগ করুন ---
    // টেলিগ্রাম অ্যাপ যদি ডার্ক মোডে থাকে, তাহলে আমাদের অ্যাপও ডার্ক মোডে দেখাবে
    if (tg.colorScheme === 'dark') {
        document.body.classList.add('dark-mode');
    }

    // --- নামাজের সময় লোড করার ফাংশন ---
    async function fetchPrayerTimes(city = 'Dhaka') {
        const prayerList = document.getElementById('prayer-list');
        try {
            // একটি ফ্রী API থেকে নামাজের সময় আনা হচ্ছে
            const response = await fetch(`https://api.aladhan.com/v1/timingsByCity?city=${city}&country=Bangladesh&method=1`);
            const data = await response.json();
            const timings = data.data.timings;
            
            // কোন নামাজের পর কোন নামাজ, সেই অনুযায়ী সাজানো
            const prayerOrder = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
            const prayerMapping = { 'Fajr': 'ফজর', 'Dhuhr': 'যোহর', 'Asr': 'আসর', 'Maghrib': 'মাগরিব', 'Isha': 'ইশা' };

            prayerList.innerHTML = ''; // আগের "লোড হচ্ছে..." লেখাটি মুছে ফেলুন

            prayerOrder.forEach(prayerKey => {
                const prayerNameBn = prayerMapping[prayerKey];
                const prayerTime = timings[prayerKey];

                const li = document.createElement('li');
                li.innerHTML = `<span class="prayer-name">${prayerNameBn}</span> <span class="prayer-time">${prayerTime}</span>`;
                prayerList.appendChild(li);
            });

        } catch (error) {
            console.error('Error fetching prayer times:', error);
            prayerList.innerHTML = '<li>নামাজের সময় লোড করা যায়নি।</li>';
        }
    }

    // --- আজকের আয়াত লোড করার ফাংশন ---
    function fetchDailyVerse() {
        // ভবিষ্যতে আপনি এই তথ্য আপনার Firebase ডাটাবেস থেকে আনতে পারবেন
        const verseArabic = document.getElementById('verse-arabic');
        const verseTranslation = document.getElementById('verse-translation');

        verseArabic.textContent = "فَإِنَّ مَعَ الْعُسْرِ يُسْرًا";
        verseTranslation.textContent = "\"নিশ্চয়ই কষ্টের সাথে স্বস্তি রয়েছে।\" (সূরা আল-ইনশিরাহ, আয়াত ৫)";
    }

    // --- অ্যাপ চালু হওয়ার সাথে সাথে ফাংশনগুলো চালান ---
    fetchPrayerTimes('Dhaka'); // ডিফল্ট শহর হিসেবে ঢাকা দেওয়া হলো
    fetchDailyVerse();
});
