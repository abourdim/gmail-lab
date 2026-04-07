# Gmail Lab — Changelog

## v2.0 — 2026-04-07

### New Features

**Multi-Search (Comma-Separated)**
- Type multiple names or emails separated by commas to build combined OR queries
- Plain names become `from:X OR to:X` for each term
- Operator terms (e.g. `from:alice, subject:report`) join with OR
- Works in both main search bar and MBOX viewer

**Auto Exact Count**
- Background exact count runs automatically after every search
- Paginates through full result set to replace Gmail's estimate with true count
- Manual Count button still available for on-demand use

**Export Verification Summary**
- Every export (CSV, JSON, TXT) appends a verification summary
- Includes: total emails, success/fail count, unread count, unique senders, date range, export timestamp, and query used

**Batch API Exports**
- Full content export now uses `gapi.client.newBatch()` for parallel requests
- Significantly faster than sequential fetching for large exports

**Email Summarizer**
- Auto-generated 2-sentence summary when reading any email
- Sentence scoring by position and length, no external API
- Toggle visibility with the Summary button

**Smart Replies**
- Context-aware reply suggestions appear when reading emails
- Detects meeting, invoice, question, and general email types
- One-click copy to clipboard

**Email to PDF**
- Print-friendly email view opens in a new tab
- Includes From, Subject, Date, and full body with clean formatting

**Email Timeline**
- Monthly volume chart spanning inbox history
- Scans up to 2000 emails with batch API fetching
- Renders month-by-month bar chart

**Sender Network Graph**
- Interactive radial graph showing top email contacts
- Contact size reflects email volume
- You at the center, senders arranged around

**Duplicate Finder**
- Scans inbox for emails with identical subjects from the same sender
- Groups duplicates with counts and clickable email lists
- Useful for spotting newsletter duplicates or re-sent messages

**Auto-Categorizer**
- Sorts recent emails into 6 categories using keyword matching
- Categories: Invoices/Payments, Newsletters, Social/Notifications, Meetings/Calendar, Jobs/Career, Shopping/Orders
- Per-category counts with clickable email groups

**MBOX Viewer**
- Open Google Takeout `.mbox` files directly in the browser
- Full MBOX parser with quoted-printable and Base64 subject decoding
- Multipart MIME body extraction (text/plain from multipart messages)
- Keyword search, comma-separated multi-search, and regex mode
- Regex supports `/pattern/flags` syntax and case-sensitive toggle
- Export filtered results as CSV, JSON, or TXT
- Handles large files with 50MB chunked reading
- Works completely offline, no API needed

**Share Search + QR Code**
- Generate a shareable URL for any Gmail search query
- Auto-copies to clipboard
- QR code generation via Google Charts API
- Recipients who open the link auto-run the search after sign-in

**Diff Viewer**
- Side-by-side comparison of two emails by message ID
- Shows From, Subject, Date, and full body for each
- Fetches both emails in parallel

**Paste-to-Search from History**
- Clicking a saved search pastes it into the search bar
- Appends with comma if text already exists, enabling multi-search composition
- Star button to bookmark favorites

**Clickable Search Hints**
- Hint chips below the search bar: `from:`, `to:`, `subj:`, `unread`, `attach`, `7d`, `OR`, `a,b`
- One-click paste of operators into the search field
- Regex hint opens the MBOX viewer in the Tools panel

**9th Quick Command**
- Added "All emails with someone" command (`from:X OR to:X`)
- Prompts for email/name and shows full conversation history

**Tools Panel (4 tabs)**
- Reorganized features into Search, Insights, Data, and Learn tabs
- Accessible via the toolbox button in the header

### Improvements

- Export All Inbox: dedicated section for bulk inbox export (headers or full content)
- Batch API usage throughout insights features for faster data fetching
- Better MIME decoding for email body extraction

### Documentation

- Updated README with all v2.0 features
- Added 5 new FAQ entries (multi-search, MBOX viewer, auto exact count, verification summary, paste from saved searches)
- Added 13 new How-To steps (steps 21-33) covering all advanced features
- Added v2.0 changelog

---

## v1.0 — 2026-04-07

### 🎉 Initial Release

**Gmail Integration**
- Google OAuth2 sign-in (each user connects their own account)
- Read-only Gmail access (`gmail.readonly` scope)
- Search emails with any Gmail query syntax
- Read full email content (text/plain extraction)
- List Gmail labels (system + user-created)
- Profile display with avatar, name, email, stats

**Quick Commands (8 built-in)**
- 📬 Show unread emails
- 🔍 Find emails from someone (with prompt)
- 📖 Read latest email
- 📋 Search by subject (with prompt)
- 📎 Emails with attachments (last 7 days)
- ⭐ Starred emails
- ✉️ Sent emails
- 🏷️ List labels

**Educational Content**
- Gmail Search Cheat Sheet (9 operators)
- How It Works (4-step guide)
- Setup Guide (8-step Google Cloud walkthrough)
- FAQ, How-To, and Wiki in Help panel

**Template Features (Workshop-DIY v1.2)**
- 9 themes (6 dark + 2 light + 1 hidden retro)
- Trilingual i18n (EN/FR/AR with RTL)
- Activity Log with TX/RX tracking
- Sound effects, splash screen, pixel pet
- Easter eggs (Konami, Matrix rain, Morse)
- PWA manifest, responsive, accessible

**Privacy**
- Read-only access only
- No server, no tracking, no data storage
- Direct browser ↔ Google API communication
- Sign out revokes token immediately
