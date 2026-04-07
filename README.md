# Gmail Lab — Workshop DIY

**Search, analyze, and explore your Gmail inbox — privacy-first, no server, open source.**

A feature-rich educational web app built on the [Workshop-DIY](https://workshop-diy.org) template. Each user signs in with their **own** Google account and gets read-only access to their Gmail inbox.

![Version](https://img.shields.io/badge/version-2.0-blue)
![License](https://img.shields.io/badge/license-Workshop--DIY-orange)
![No Frameworks](https://img.shields.io/badge/dependencies-none-brightgreen)

**[Live Demo](https://abourdim.github.io/gmail-lab/)**

---

## Features

### Gmail Integration
- **Google OAuth2** — each user signs in with their own Google account
- **Read-only access** — cannot modify, delete, or send emails
- **Direct API** — emails go from Google to browser, no middleman
- **Auto sign-in** — silent re-authentication on page reload
- **Sign out anytime** — revokes access token immediately

### Quick Commands (9 built-in)
| Command | What It Does | Gmail Syntax |
|---------|-------------|--------------|
| Unread emails | Lists unread messages | `is:unread` |
| From someone | Searches by sender | `from:email` |
| Latest email | Reads newest message | _(most recent)_ |
| By subject | Keyword subject search | `subject:keyword` |
| Attachments | Emails with files (7 days) | `has:attachment` |
| Starred | Starred messages | `is:starred` |
| Sent | Your sent emails | `in:sent` |
| All with someone | Sent + received | `from:X OR to:X` |
| Labels | Lists all labels | _(labels API)_ |

### Multi-Search (Comma-Separated)
Type multiple names or queries separated by commas. Plain names become `from:X OR to:X OR ...`. Queries with operators join with `OR`. Clickable search hints below the search bar let you paste operators with one click.

### Auto Exact Count
After every search, the app automatically counts all matching emails in the background (paginating through the full result set). A manual "Count" button is also available for on-demand exact counts.

### Filter Builder
Visual query builder — fill in From, To, Subject, dates, and checkboxes. The app builds the Gmail syntax for you.

### Date Range Search
Calendar date pickers with preset buttons: Today, This Week, This Month, 3 Months, This Year.

### Export (3 modes)
- **Export loaded** — fast, metadata only (From, Subject, Date, Snippet)
- **Export all** — fetches all matching emails with pagination + progress bar
- **Full content** — includes complete email body using batch API requests (capped at 500)
- **Formats**: CSV, JSON, TXT
- **Verification summary** — every export appends a summary block with total count, success/fail breakdown, unique senders, date range, unread count, query, and export timestamp

### Email Summarizer
When reading a full email, click "Summary" to see an auto-generated 2-sentence summary extracted from the email body. Uses sentence scoring by position and length — no external API needed.

### Smart Replies
Context-aware reply suggestions appear when reading an email. Detects meeting, invoice, question, and general topics. One-click copy to clipboard.

### Email to PDF
Click the PDF button when reading an email to open a print-friendly version in a new tab. Includes From, Subject, Date, and full body.

### Email Stats Dashboard
Analyzes 500 recent emails:
- Overview: total, unread, starred, unique senders
- Top 10 senders (bar chart)
- Emails by day of week
- Busiest hours (24-hour histogram)

### Word Cloud
Generates a visual word cloud from email subjects. Click any word to search. Sized and colored by frequency.

### Email Digest
Summary for Today, This Week, or This Month: totals, unread, starred, top senders.

### Email Timeline
Monthly email volume chart spanning your inbox history. Scans up to 2000 emails with batch API fetching to build a month-by-month bar chart.

### Sender Network Graph
Visual network showing your top email contacts and their relative volume. Scans recent emails and renders an interactive radial graph with you at the center.

### Duplicate Finder
Scans your inbox for emails with identical subjects from the same sender. Groups duplicates together so you can spot repeated messages, newsletter duplicates, or re-sent emails.

### Auto-Categorizer
Automatically sorts recent emails into categories (Invoices, Newsletters, Social, Meetings, Jobs, Shopping) using keyword matching on subjects and snippets. Shows per-category counts and lets you click to view emails in each group.

### Attachment Manager
Scans emails with attachments. Lists every file with name, type, size, sender, date. Sort, filter, export.

### Contact Book
Auto-extracts unique senders and recipients from 500 emails. Shows frequency, search button per contact, export as CSV/JSON.

### Email Size Analyzer
Size distribution chart, heaviest emails list, total storage used, average email size.

### Inbox Score
Gamified 0-100 health score based on unread ratio, labels, stars, organization. Includes improvement tips.

### MBOX Viewer
Open Google Takeout `.mbox` files directly in the browser — works offline, no API needed. Features:
- Parses MBOX format with quoted-printable and Base64 decoding
- Keyword search with comma-separated multi-search
- Regex mode with `/pattern/flags` syntax and case-sensitive toggle
- Read individual emails with full body display
- Export filtered results as CSV, JSON, or TXT
- Handles large files (50MB+ chunked reading)

### Share Search + QR Code
Generate a shareable link for any Gmail search query. Recipients who open the link and sign in will auto-run the same search. Also generates a scannable QR code via Google Charts API.

### Diff Viewer
Side-by-side comparison of two emails by their message IDs. Shows From, Subject, Date, and full body for each email. Useful for comparing versions or similar messages.

### Search History and Saved Searches
- Auto-tracks last 50 searches
- Bookmark favorites with a star
- One-click re-run or paste into search bar
- **Paste-to-search**: clicking a saved search appends it to the current query with a comma, enabling multi-search composition from history
- Persists across sessions

### Clickable Search Hints
Below the search bar, clickable hint chips (`from:`, `to:`, `subj:`, `unread`, `attach`, `7d`, `OR`, `a,b`) paste operators directly into the search field. The `regex` hint opens the MBOX viewer in the Tools panel.

### Export All Inbox
Bulk export your entire inbox as headers-only (CSV, JSON, TXT) or with full content (CSV, JSON, TXT). Uses batch API requests with progress tracking.

### Gmail Shortcuts Trainer
Interactive quiz on 20 Gmail keyboard shortcuts. Auto-advances, tracks your score.

### Gmail Search Quiz
10 multiple-choice questions testing Gmail search syntax knowledge. Score with emoji feedback.

### Bulk Clipboard
Copy all subjects, senders, snippets, or full data from search results in one click.

### Email Templates
Pre-written responses (Professional, Polite, Decline) with one-click copy. Add and save your own custom templates.

### Tip of the Day
20 Gmail power-user tips, random on each load, refreshable.

### Workshop-DIY Template Features
- **9 themes** — 6 dark + 2 light + hidden Retro (Konami code)
- **3 languages** — English, Francais, Arabic (auto RTL)
- **Activity Log** — timestamped, color-coded, filterable, exportable
- **Sound effects** — click, success, error tones
- **Easter eggs** — Konami code, Matrix rain, Morse code
- **PWA ready** — manifest.json, theme-color
- **Fully accessible** — keyboard nav, ARIA labels, focus traps
- **Offline detection** — graceful banner when offline

---

## Quick Start

### 1. Clone
```bash
git clone https://github.com/abourdim/gmail-lab.git
cd gmail-lab
```

### 2. Get a Google OAuth Client ID (free)
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a project and name it "Gmail Lab"
3. Go to **Audience** and set User type to External. Add your email as Test user
4. Go to **Clients** then **+ CREATE CREDENTIALS** then **OAuth client ID**
5. Type: **Web application** and name it "Gmail Lab"
6. **Authorized JavaScript origins**: add `http://localhost:8080` and your deploy URL
7. Click **Create** and copy the **Client ID**
8. Go to [API Library then Gmail API](https://console.cloud.google.com/apis/library/gmail.googleapis.com) and click **Enable**

### 3. Serve locally
```bash
python3 -m http.server 8080
```

### 4. Open and Connect
1. Open `http://localhost:8080`
2. Paste your Client ID
3. Click **"Sign in with Google"**
4. Tap any Quick Command!

---

## Project Structure

```
gmail-lab/
├── index.html          Main app (all sections and panels)
├── script.js           Template engine (themes, i18n, log, panels)
├── gmail-lab.js        Gmail logic (OAuth, API, all features)
├── style.css           Template styles (9 themes, responsive, RTL)
├── gmail-lab.css       Gmail-specific styles
├── manifest.json       PWA manifest
├── README.md           This file
└── CHANGES.md          Changelog
```

---

## Privacy and Security

- **Read-only scope** (`gmail.readonly`) — cannot modify, delete, or send emails
- **No server** — all API calls go directly from browser to Google
- **No tracking** — no analytics, no cookies (only `localStorage` for preferences)
- **No data stored** — emails are fetched live and never persisted
- **Revocable** — sign out revokes the OAuth token immediately
- **Each user authenticates independently** — no shared credentials
- **Open source** — inspect every line of code

---

## Common Issues

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

## Themes

| Theme | Style | Mode |
|-------|-------|------|
| Mosque Gold | Gold and blue | Dark |
| Zellige | Blue and purple | Dark |
| Andalus | Green and gold | Dark |
| Space | Purple and cyan | Dark |
| Jungle | Lime and orange | Dark |
| Robot | Blue and orange | Dark |
| **Riad** | Terracotta and ivory | **Light** |
| **Medina** | Teal and pearl | **Light** |
| **Retro** | Green phosphor CRT | **Hidden** (Konami code) |

---

## Built With

- [Workshop-DIY Template v1.2](https://github.com/abourdim/tools) — vanilla HTML/CSS/JS framework
- [Google Identity Services](https://developers.google.com/identity/gsi/web) — OAuth2 authentication
- [Gmail API](https://developers.google.com/gmail/api) — email access
- [Google Fonts](https://fonts.google.com) — Amiri, Righteous, Tajawal, Bangers, Orbitron

---

## License

Workshop-DIY — [abourdim](https://github.com/abourdim)
