# Smart Notes (نوتتي الذكية) - Handoff for another Claude session

Give this file plus the whole project folder to the new Claude and say: "Continue this project from HANDOFF.md".

## What it is
Arabic (RTL, Egyptian dialect) single-file web app: `index.html` (HTML + CSS + JS, no build step, no frameworks).
Static hosting (Vercel preset "Other"). Also runs as a Windows standalone window via `SmartNotes.ps1` (local HttpListener on localhost:5178 + Edge/Chrome `--app` window).
PWA files: `manifest.webmanifest`, `sw.js` (network-first cache, bump cache name on release), `icons/`.

## Features implemented
- Smart capture: one textarea / voice; `classify(raw)` detects: password, money (expense/income), reminder (installment, bill, receivable = money owed to user, payable = money user owes, normal), link, phone, note. Arabic digits normalized.
- Dates: `parseWhen(t)` handles بكرة / بعد بكرة / بعد N يوم|ساعة|دقيقة|اسبوع|شهر / يوم السبت / d/m(/y) / الساعة N ص|م / HH:MM. Recurrence words: كل اسبوع|شهر|سنة; "يوم 5 كل شهر".
- Tabs: home (stats, capture, search, filters, timeline), money (quick form, month list), reminders (kinds, amount, who, recurrence, lead days, done / done+record to money / snooze), passwords, reports (month totals, by category, by who, CSV export, JSON backup/restore).
- PIN lock: PBKDF2 (250k, SHA-256) -> AES-GCM key kept in memory only; only password VALUES are encrypted (`item.enc = {iv, ct}`), plaintext cache `PW` in memory while unlocked. Auto-lock after 2 min idle or >60s hidden. Forgotten PIN = passwords unrecoverable (by design).
- Voice: Web Speech API (`webkitSpeechRecognition`, lang ar-EG), floating mic button (#fab), Alt+M, spoken confirmation via speechSynthesis. Works in Edge/Chrome with internet; weak on iOS. Does NOT work in Electron without Google API keys (that is why the desktop build is a browser app window, not Electron).
- Reminders fire via setInterval(15s) + Notification API only while the app is open (no push yet).

## Data model (localStorage key `sn1`)
`{ items: [...], lock: {salt, chk} }`. Item common: `id, type, ts, text`.
- password: `label, enc` (value removed after encryption; `text` = label)
- money: `kind 'in'|'out', amount, cat, who`
- reminder: `at (ms), done, fired, pfired, kind normal|installment|bill|receivable|payable, amount, who, rec none|week|month|year, lead (days), day`
- link / phone / note: just `text`.
Backup JSON = this whole object (passwords stay encrypted, need same PIN).

## Known limits
Data is per device (no sync). Only password values are encrypted; other notes are plain in storage (hidden behind the lock screen only). `who` extraction only after: عند / من / لل / لـ. Reminder needs an explicit date/time in the sentence, otherwise saved as a note. No push notifications when closed.

## Roadmap agreed with the owner
1. Supabase: Auth (email) + table `items(id text pk, user_id uuid default auth.uid(), data jsonb, updated_at, deleted bool)` with RLS `user_id = auth.uid()`; sync local <-> cloud (last-write-wins by updated_at); keep password values encrypted client-side before upload. Needs owner's Project URL + anon key (NEVER service_role).
2. Push notifications (service worker + server scheduler).
3. Optional full-data encryption, biometric unlock (WebAuthn).
4. Multi-user paid subscription (symbolic price): Supabase subscription-status table enforced by RLS, payment webhooks (Paymob for Egypt: cards for recurring, wallets via payment links), privacy policy / terms, account deletion, export. Free beta first.
5. Android wrap (Capacitor) later.

## Design notes
Navy `#0F1B33` + amber `#F2A33A`, font Cairo, desktop right sidebar (RTL), mobile bottom nav, dark mode via prefers-color-scheme. Keep Arabic UI copy in Egyptian dialect, short and direct.

## Owner preferences
Replies in Egyptian Arabic; wants professional UI, voice input always available, everything runnable without Vercel on desktop too.
