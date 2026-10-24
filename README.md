# نوتتي الذكية

## تشغيل على الكمبيوتر (بدون Vercel)
المتطلبات: ويندوز + Microsoft Edge (موجود افتراضيا) أو Google Chrome.
1. فك الضغط في أي فولدر ثابت (مثلا C:\SmartNotes).
2. شغّل `Create-Shortcut.bat` مرة واحدة: هيعمل اختصار "Smart Notes" على سطح المكتب بأيقونة البرنامج.
3. افتح الاختصار: البرنامج بيفتح في نافذة مستقلة (من غير شريط متصفح)، والتسجيل الصوتي شغّال.

### عايز ملف EXE فعلي؟
شغّل `Build-EXE.bat` (محتاج نت مرة واحدة). هيطلع `SmartNotes.exe` في نفس الفولدر. سيبه جنب index.html.

بياناتك بتتحفظ في: `%LOCALAPPDATA%\SmartNotes\profile` (خد منه نسخة احتياطية من زرار التقارير > نسخة احتياطية).

## النشر على Vercel
Framework Preset: Other، وسيب Build و Output فاضيين.

## Supabase (لاحقا)
ابعت Project URL و anon key عشان نضيف المزامنة.
