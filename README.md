# 📧 Gmail Lab — Workshop DIY

**Learn to search and explore Gmail — connect your own Google account!**

A fun, kid-friendly educational web app built on the [Workshop-DIY](https://workshop-diy.org) template. Each user signs in with their **own** Google account and gets read-only access to their Gmail inbox.

![Version](https://img.shields.io/badge/version-1.0-blue)
![License](https://img.shields.io/badge/license-Workshop--DIY-orange)
![No Frameworks](https://img.shields.io/badge/dependencies-none-brightgreen)

---

## ✨ Features

### 📧 Gmail Integration
- **Google OAuth2** — each user signs in with their own Google account
- **Read-only access** — cannot modify, delete, or send emails
- **Direct API** — emails go from Google → browser, no middleman
- **Sign out anytime** — revokes access token

### 🚀 Quick Commands (Tap to Run!)
| Command | What It Does | Gmail Syntax |
|---------|-------------|--------------|
| 📬 Unread emails | Lists unread messages | `is:unread` |
| 🔍 From someone | Searches by sender | `from:email` |
| 📖 Latest email | Reads newest message | _(most recent)_ |
| 📋 By subject | Keyword subject search | `subject:keyword` |
| 📎 Attachments | Emails with files (7 days) | `has:attachment` |
| ⭐ Starred | Starred messages | `is:starred` |
| ✉️ Sent | Your sent emails | `in:sent` |
| 🏷️ Labels | Lists all labels | _(labels API)_ |

### 💬 Ask Anything
Free-form search input — type any Gmail search query and see results live.

### 📋 Cheat Sheet
Built-in Gmail search syntax reference with combinable operators.

### 🎨 Workshop-DIY Template Features
- **9 themes** — Mosque Gold, Zellige, Andalus, Riad, Medina, Space, Jungle, Robot + hidden Retro
- **3 languages** — English 🇬🇧, Français 🇫🇷, العربية 🇩🇿 (with auto RTL)
- **Activity Log** — timestamped, color-coded, filterable (Info/✓/✗/TX/RX)
- **Sound effects** — click, success, error tones
- **Easter eggs** — Konami code, Matrix rain, Morse code
- **Magic features** — Whisper mode, breathing guide, pixel pet, night mode
- **PWA ready** — manifest.json, theme-color, touch icons
- **Fully accessible** — keyboard nav, ARIA labels, focus traps

---

## 🚀 Quick Start

### 1. Clone
```bash
git clone https://github.com/abourdim/gmail-lab.git
cd gmail-lab
```

### 2. Get a Google OAuth Client ID (free)
1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. Create a project (or select existing)
3. Click **"+ CREATE CREDENTIALS"** → **"OAuth client ID"**
4. Application type: **"Web application"**
5. Under **"Authorized JavaScript origins"**, add your URL:
   - For local dev: `http://localhost:8080`
   - For GitHub Pages: `https://yourusername.github.io`
6. Click **"Create"** and copy the **Client ID**
7. Go to [API Library → Gmail API](https://console.cloud.google.com/apis/library/gmail.googleapis.com) and click **"Enable"**
8. Under **OAuth consent screen**, add your Google email as a **Test user**

### 3. Serve locally
```bash
# Python
python3 -m http.server 8080

# Node.js
npx serve -p 8080

# PHP
php -S localhost:8080
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
├── index.html          ← Main app (Workshop-DIY 3-panel layout)
├── script.js           ← Template engine (themes, i18n, log, panels, easter eggs)
├── gmail-lab.js        ← Gmail logic (OAuth, API calls, example buttons)
├── style.css           ← Template styles (9 themes, responsive, RTL)
├── gmail-lab.css       ← Gmail-specific styles (auth, email cards, search)
├── manifest.json       ← PWA manifest
├── README.md           ← This file
└── CHANGES.md          ← Changelog
```

---

## 🔒 Privacy & Security

- **Read-only scope** (`gmail.readonly`) — app cannot modify, delete, or send emails
- **No server** — all API calls go directly from the user's browser to Google
- **No tracking** — no analytics, no cookies (except `localStorage` for preferences)
- **No data stored** — emails are displayed in-browser and never persisted
- **Revocable** — sign out revokes the OAuth token immediately
- **Each user authenticates independently** — no shared credentials

---

## 🌐 Deploy to GitHub Pages

1. Push to GitHub
2. Go to repo **Settings → Pages**
3. Set source to **main branch**
4. Your app will be at `https://yourusername.github.io/gmail-lab/`
5. Add this URL to your Google Cloud **Authorized JavaScript origins**

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
| **🕹️ Retro** | Green phosphor CRT | **Dark** (hidden — Konami code) |

---

## 🤝 Built With

- [Workshop-DIY Template v1.2](https://github.com/abourdim/tools) — vanilla HTML/CSS/JS framework
- [Google Identity Services](https://developers.google.com/identity/gsi/web) — OAuth2 authentication
- [Gmail API](https://developers.google.com/gmail/api) — email access
- [Google Fonts](https://fonts.google.com) — Amiri, Righteous, Tajawal, Bangers, Orbitron

---

## 📄 License

Workshop-DIY — [abourdim](https://github.com/abourdim)
