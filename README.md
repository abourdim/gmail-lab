# 📧 Gmail Lab — Workshop DIY

**Search, analyze, and explore your Gmail inbox — privacy-first, no server, open source.**

A feature-rich educational web app built on the [Workshop-DIY](https://workshop-diy.org) template. Each user signs in with their **own** Google account and gets read-only access to their Gmail inbox.

![Version](https://img.shields.io/badge/version-2.0-blue)
![License](https://img.shields.io/badge/license-Workshop--DIY-orange)
![No Frameworks](https://img.shields.io/badge/dependencies-none-brightgreen)

**[Live Demo](https://abourdim.github.io/gmail-lab/)**

---

## ✨ Features

### 📧 Gmail Integration
- **Google OAuth2** — each user signs in with their own Google account
- **Read-only access** — cannot modify, delete, or send emails
- **Direct API** — emails go from Google → browser, no middleman
- **Auto sign-in** — silent re-authentication on page reload
- **Sign out anytime** — revokes access token immediately

### 🚀 Quick Commands (9 built-in)
| Command | What It Does | Gmail Syntax |
|---------|-------------|--------------|
| 📬 Unread emails | Lists unread messages | `is:unread` |
| 🔍 From someone | Searches by sender | `from:email` |
| 📖 Latest email | Reads newest message | _(most recent)_ |
| 📋 By subject | Keyword subject search | `subject:keyword` |
| 📎 Attachments | Emails with files (7 days) | `has:attachment` |
| ⭐ Starred | Starred messages | `is:starred` |
| ✉️ Sent | Your sent emails | `in:sent` |
| 🔄 All with someone | Sent + received | `from:X OR to:X` |
| 🏷️ Labels | Lists all labels | _(labels API)_ |

### 🔧 Filter Builder
Visual query builder — fill in From, To, Subject, dates, and checkboxes. The app builds the Gmail syntax for you.

### 📅 Date Range Search
Calendar date pickers with preset buttons: Today, This Week, This Month, 3 Months, This Year.

### ⬇️ Export (3 modes)
- **Export loaded** — fast, metadata only (From, Subject, Date, Snippet)
- **Export all** — fetches all matching emails with pagination + progress bar
- **Full content** — includes complete email body (slower, capped at 500)
- **Formats**: CSV, JSON, TXT

### 📊 Email Stats Dashboard
Analyzes 500 recent emails:
- Overview: total, unread, starred, unique senders
- Top 10 senders (bar chart)
- Emails by day of week
- Busiest hours (24-hour histogram)

### ☁️ Word Cloud
Generates a visual word cloud from email subjects. Click any word to search. Sized and colored by frequency.

### 📰 Email Digest
Summary for Today, This Week, or This Month: totals, unread, starred, top senders.

### 📎 Attachment Manager
Scans emails with attachments. Lists every file with name, type, size, sender, date. Sort, filter, export.

### 👥 Contact Book
Auto-extracts unique senders and recipients from 500 emails. Shows frequency, search button per contact, export as CSV/JSON.

### 🕐 Search History & Saved
- Auto-tracks last 50 searches
- Bookmark favorites with ⭐
- One-click re-run
- Persists across sessions

### 📝 Email Templates
Pre-written responses (Professional, Polite, Decline) with one-click copy. Add and save your own custom templates.

### 📋 Bulk Clipboard
Copy all subjects, senders, snippets, or full data from search results in one click.

### 📦 Email Size Analyzer
Size distribution chart, heaviest emails list, total storage used, average email size.

### 🏆 Inbox Score
Gamified 0-100 health score based on unread ratio, labels, stars, organization. Includes improvement tips.

### ⌨️ Gmail Shortcuts Trainer
Interactive quiz on 20 Gmail keyboard shortcuts. Auto-advances, tracks your score.

### 🧠 Gmail Search Quiz
10 multiple-choice questions testing Gmail search syntax knowledge. Score with emoji feedback.

### 💡 Tip of the Day
20 Gmail power-user tips, random on each load, refreshable.

### 🎨 Workshop-DIY Template Features
- **9 themes** — 6 dark + 2 light + hidden Retro (Konami code)
- **3 languages** — English, Francais, العربية (auto RTL)
- **Activity Log** — timestamped, color-coded, filterable, exportable
- **Sound effects** — click, success, error tones
- **Easter eggs** — Konami code, Matrix rain, Morse code
- **PWA ready** — manifest.json, theme-color
- **Fully accessible** — keyboard nav, ARIA labels, focus traps
- **Offline detection** — graceful banner when offline

---

## 🚀 Quick Start

### 1. Clone
```bash
git clone https://github.com/abourdim/gmail-lab.git
cd gmail-lab
```

### 2. Get a Google OAuth Client ID (free)
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a project → name it "Gmail Lab"
3. Go to **Audience** → User type: External → Add your email as Test user
4. Go to **Clients** → **+ CREATE CREDENTIALS** → **OAuth client ID**
5. Type: **Web application** → name: "Gmail Lab"
6. **Authorized JavaScript origins**: add `http://localhost:8080` and your deploy URL
7. Click **Create** → copy the **Client ID**
8. Go to [API Library → Gmail API](https://console.cloud.google.com/apis/library/gmail.googleapis.com) → **Enable**

### 3. Serve locally
```bash
python3 -m http.server 8080
```

### 4. Open & Connect
1. Open `http://localhost:8080`
2. Paste your Client ID
3. Click **"Sign in with Google"**
4. Tap any Quick Command!

---

## 📁 Project Structure

```
gmail-lab/
├── index.html          ← Main app (all sections & panels)
├── script.js           ← Template engine (themes, i18n, log, panels)
├── gmail-lab.js        ← Gmail logic (OAuth, API, all features)
├── style.css           ← Template styles (9 themes, responsive, RTL)
├── gmail-lab.css       ← Gmail-specific styles
├── manifest.json       ← PWA manifest
├── README.md           ← This file
└── CHANGES.md          ← Changelog
```

---

## 🔒 Privacy & Security

- **Read-only scope** (`gmail.readonly`) — cannot modify, delete, or send emails
- **No server** — all API calls go directly from browser to Google
- **No tracking** — no analytics, no cookies (only `localStorage` for preferences)
- **No data stored** — emails are fetched live and never persisted
- **Revocable** — sign out revokes the OAuth token immediately
- **Each user authenticates independently** — no shared credentials
- **Open source** — inspect every line of code

---

## ⚠️ Common Issues

| Problem | Solution |
|---------|----------|
| "Access blocked" | Add your email as Test user in OAuth consent screen |
| "Google hasn't verified" | Click "Continue" — normal for testing mode |
| "Error 400: redirect_uri_mismatch" | Add your exact URL to Authorized JavaScript origins |
| "Error 401: invalid_client" | Wrong Client ID — click "Change Client ID" and paste the correct one |
| Token expires after 1 hour | App auto-refreshes. If it fails, click Sign In again |
| "popup_closed_by_user" | Click Sign In again and complete the flow |
| Export stops at 77/201 | Fixed in v1.1 — update to latest version |
| Works locally but not on GitHub Pages | Add `https://yourusername.github.io` to authorized origins |

See the **Wiki tab** in the Help panel for a complete troubleshooting guide.

---

## 🎨 Themes

| Theme | Style | Mode |
|-------|-------|------|
| Mosque Gold | Gold & blue | Dark |
| Zellige | Blue & purple | Dark |
| Andalus | Green & gold | Dark |
| Space | Purple & cyan | Dark |
| Jungle | Lime & orange | Dark |
| Robot | Blue & orange | Dark |
| **Riad** | Terracotta & ivory | **Light** |
| **Medina** | Teal & pearl | **Light** |
| **Retro** | Green phosphor CRT | **Hidden** (Konami code) |

---

## 🤝 Built With

- [Workshop-DIY Template v1.2](https://github.com/abourdim/tools) — vanilla HTML/CSS/JS framework
- [Google Identity Services](https://developers.google.com/identity/gsi/web) — OAuth2 authentication
- [Gmail API](https://developers.google.com/gmail/api) — email access
- [Google Fonts](https://fonts.google.com) — Amiri, Righteous, Tajawal, Bangers, Orbitron

---

## 📄 License

Workshop-DIY — [abourdim](https://github.com/abourdim)
