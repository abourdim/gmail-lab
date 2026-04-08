/**
 * Gmail Lab — Google OAuth + Gmail API
 * Each user connects their own Gmail account
 * Workshop-DIY · v1.1
 */

/* ═══════ CONFIG ═══════ */

const GMAIL_SCOPES = 'https://www.googleapis.com/auth/gmail.readonly';
const GMAIL_DISCOVERY = 'https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest';
const GOOGLE_SVG = '<svg viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>';

/* ═══════ STATE ═══════ */

let gmailTokenClient = null;
let gmailGapiInited = false;
let gmailGisInited = false;
let gmailAccessToken = null;
let gmailUserProfile = null;
let gmailIsLoading = false;
let gmailClientId = '';
let gmailTokenExpiry = 0;

/* ═══════ STORAGE ═══════ */

function gmailGetClientId() {
  try { return localStorage.getItem('gmail-lab-client-id') || ''; } catch { return ''; }
}
function gmailSaveClientId(id) {
  try { localStorage.setItem('gmail-lab-client-id', id); } catch {}
}

/* ═══════ OPEN HELP → WIKI ═══════ */

function openHelpWiki() {
  openHelp();
  document.querySelectorAll('.help-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.help-content').forEach(c => c.classList.remove('active'));
  const wikiTab = document.querySelector('.help-tab[data-tab="wiki"]');
  const wikiContent = document.getElementById('helpWiki');
  if (wikiTab) wikiTab.classList.add('active');
  if (wikiContent) wikiContent.classList.add('active');
}

/* ═══════ MODAL INPUT ═══════ */

function gmailShowModal(promptText, callback) {
  let overlay = document.getElementById('gmailModalOverlay');
  if (overlay) overlay.remove();
  overlay = document.createElement('div');
  overlay.id = 'gmailModalOverlay';
  overlay.className = 'gmail-modal-overlay';
  overlay.innerHTML = `
    <div class="gmail-modal">
      <p class="gmail-modal-text">${gmailEscHtml(promptText)}</p>
      <input class="gmail-modal-input" id="gmailModalInput" type="text" autofocus />
      <div class="gmail-modal-btns">
        <button class="gmail-modal-cancel" id="gmailModalCancel">Cancel</button>
        <button class="gmail-modal-ok" id="gmailModalOk">OK</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  const input = document.getElementById('gmailModalInput');
  const close = () => overlay.remove();
  document.getElementById('gmailModalCancel').onclick = () => { close(); callback(null); };
  document.getElementById('gmailModalOk').onclick = () => { const v = input.value.trim(); close(); callback(v); };
  input.addEventListener('keydown', e => { if (e.key === 'Enter') { const v = input.value.trim(); close(); callback(v); } if (e.key === 'Escape') { close(); callback(null); } });
  overlay.addEventListener('click', e => { if (e.target === overlay) { close(); callback(null); } });
  setTimeout(() => input.focus(), 50);
}

/* ═══════ UTF-8 BASE64 DECODE ═══════ */

function decodeBase64Utf8(data) {
  const raw = atob(data.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return new TextDecoder('utf-8').decode(bytes);
}

/* ═══════ UI HELPERS ═══════ */

function gmailEnableButtons(enabled) {
  document.querySelectorAll('.gmail-ex-btn').forEach(b => b.disabled = !enabled);
  const ci = document.getElementById('customInput');
  const cs = document.getElementById('customSend');
  const ec = document.getElementById('extractContactsBtn');
  const sb = document.getElementById('buildStatsBtn');
  if (ci) ci.disabled = !enabled;
  if (cs) cs.disabled = !enabled;
  if (ec) ec.disabled = !enabled;
  if (sb) sb.disabled = !enabled;
  ['scanAttachBtn','exportAttachBtn','wordCloudBtn','digestDayBtn','digestWeekBtn','digestMonthBtn','sizeBtn','scoreBtn','exportAllCsvBtn','exportAllJsonBtn','exportAllTxtBtn','exportFullCsvBtn2','exportFullJsonBtn2','exportFullTxtBtn2','timelineBtn','networkBtn','dupeBtn','catBtn'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = !enabled;
  });
}

function gmailEscHtml(s) {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function gmailEscJs(s) {
  if (!s) return '';
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '');
}

function gmailFormatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
           d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch { return dateStr; }
}

/* ═══════ AUTH UI ═══════ */

function gmailRenderAuth() {
  const body = document.getElementById('authBody');
  const card = document.getElementById('authCard');
  if (!body || !card) return;

  // Connected state
  if (gmailAccessToken && gmailUserProfile) {
    card.classList.add('gmail-auth-connected');
    const initial = (gmailUserProfile.name || gmailUserProfile.email || '?')[0].toUpperCase();
    body.innerHTML = `
      <div class="gmail-profile-row" style="align-items:center">
        ${gmailUserProfile.picture
          ? `<img class="gmail-avatar" src="${gmailUserProfile.picture}" alt="avatar" style="width:28px;height:28px"/>`
          : `<div class="gmail-avatar-placeholder" style="width:28px;height:28px;font-size:0.75rem">${initial}</div>`}
        <div class="gmail-profile-info" style="flex:1;min-width:0">
          <span class="gmail-profile-name" style="font-size:0.85rem">${gmailEscHtml(gmailUserProfile.name || 'Gmail User')}</span>
          <span class="gmail-profile-stats" id="gmailStats" style="font-size:0.72rem;opacity:0.6">…</span>
        </div>
        <button class="gmail-signout-btn" onclick="gmailSignOut()" style="font-size:0.7rem;padding:3px 10px">Sign Out</button>
      </div>
    `;
    setStatus(true);
    gmailEnableButtons(true);
    gmailLoadStats();
    return;
  }

  // Disconnected
  card.classList.remove('gmail-auth-connected');
  setStatus(false);
  gmailClientId = gmailGetClientId();

  if (!gmailClientId) {
    // Need client ID first
    body.innerHTML = `
      <p style="margin-bottom:0.6rem;opacity:0.65;font-size:0.88rem">Enter your Google OAuth Client ID to get started:</p>
      <div class="gmail-clientid-row">
        <input class="gmail-clientid-input" id="clientIdInput" placeholder="your-client-id.apps.googleusercontent.com"/>
        <button class="gmail-clientid-save" onclick="gmailSetClientId()">Save</button>
      </div>
      <p style="font-size:0.76rem;opacity:0.45">Don't have one? <a href="#" onclick="openHelpWiki();return false" style="color:var(--accent,#d4a03c)">📖 See the full setup guide in Wiki</a></p>
    `;
    gmailEnableButtons(false);
  } else {
    // Have client ID, show sign-in button
    body.innerHTML = `
      <div style="text-align:center">
        <button class="gmail-google-btn" onclick="gmailSignIn()" id="signInBtn">
          ${GOOGLE_SVG}
          Sign in with Google
        </button>
        <div style="margin-top:0.5rem">
          <button class="gmail-signout-btn" onclick="gmailClearClientId()" style="font-size:0.72rem">Change Client ID</button>
        </div>
      </div>
    `;
    gmailEnableButtons(false);
    if (!gmailGapiInited || !gmailGisInited) {
      gmailLoadAPIs();
    }
  }
}

function gmailSetClientId() {
  const input = document.getElementById('clientIdInput');
  const val = (input && input.value || '').trim();
  if (!val || !val.includes('.apps.googleusercontent.com')) {
    log('❌ Invalid Client ID — must end with .apps.googleusercontent.com', 'error');
    return;
  }
  gmailClientId = val;
  gmailSaveClientId(val);
  log('🔑 Client ID saved', 'success');
  gmailRenderAuth();
  gmailLoadAPIs();
}

function gmailClearClientId() {
  try { localStorage.removeItem('gmail-lab-client-id'); } catch {}
  gmailClientId = '';
  gmailGapiInited = false;
  gmailGisInited = false;
  gmailAccessToken = null;
  gmailUserProfile = null;
  gmailRenderAuth();
  log('🔑 Client ID cleared', 'info');
}

/* ═══════ LOAD GOOGLE APIs ═══════ */

function gmailLoadAPIs() {
  if (!gmailClientId) return;
  log('📦 Loading Google APIs…', 'info');

  // Load GAPI
  if (!document.getElementById('gapiScript')) {
    const s1 = document.createElement('script');
    s1.id = 'gapiScript';
    s1.src = 'https://apis.google.com/js/api.js';
    s1.onload = () => {
      gapi.load('client', async () => {
        try {
          await gapi.client.init({ discoveryDocs: [GMAIL_DISCOVERY] });
          gmailGapiInited = true;
          log('✅ Gmail API loaded', 'success');
          gmailCheckReady();
        } catch (e) {
          log('❌ Gmail API init failed: ' + e.message, 'error');
        }
      });
    };
    s1.onerror = () => log('❌ Failed to load Google API script', 'error');
    document.head.appendChild(s1);
  }

  // Load GIS (Google Identity Services)
  if (!document.getElementById('gisScript')) {
    const s2 = document.createElement('script');
    s2.id = 'gisScript';
    s2.src = 'https://accounts.google.com/gsi/client';
    s2.onload = () => {
      try {
        gmailTokenClient = google.accounts.oauth2.initTokenClient({
          client_id: gmailClientId,
          scope: GMAIL_SCOPES,
          callback: gmailHandleToken,
        });
        gmailGisInited = true;
        log('✅ Google Sign-In ready', 'success');
        gmailCheckReady();
      } catch (e) {
        log('❌ GIS init failed: ' + e.message, 'error');
      }
    };
    s2.onerror = () => log('❌ Failed to load Google Sign-In script', 'error');
    document.head.appendChild(s2);
  }
}

function gmailCheckReady() {
  if (gmailGapiInited && gmailGisInited) {
    log('🟢 Ready — attempting auto sign-in…', 'info');
    // Try silent re-auth (no popup if user previously consented)
    try {
      gmailTokenClient.requestAccessToken({ prompt: '' });
    } catch {
      log('🟢 Ready — click "Sign in with Google"', 'info');
    }
  }
}

/* ═══════ SIGN IN / OUT ═══════ */

function gmailSignIn() {
  if (!gmailTokenClient) {
    log('❌ Google Sign-In not loaded yet — please wait', 'error');
    return;
  }
  gmailTokenClient.requestAccessToken({ prompt: 'consent' });
}

async function gmailHandleToken(resp) {
  if (resp.error) {
    log('❌ Auth error: ' + resp.error, 'error');
    return;
  }
  gmailAccessToken = resp.access_token;
  gmailTokenExpiry = Date.now() + (resp.expires_in || 3600) * 1000;
  log('🔐 Signed in successfully', 'success');

  // Fetch user info
  try {
    const r = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: 'Bearer ' + gmailAccessToken }
    });
    gmailUserProfile = await r.json();
    log('👤 Welcome ' + (gmailUserProfile.name || gmailUserProfile.email), 'success');
  } catch {
    gmailUserProfile = { email: 'connected', name: 'Gmail User' };
  }
  gmailRenderAuth();
}

function gmailSignOut() {
  if (gmailAccessToken) {
    try { google.accounts.oauth2.revoke(gmailAccessToken); } catch {}
  }
  gmailAccessToken = null;
  gmailUserProfile = null;
  log('👋 Signed out', 'info');
  gmailRenderAuth();
  document.getElementById('resultsContainer').innerHTML = '';
}

async function gmailLoadStats() {
  try {
    const r = await gapi.client.gmail.users.getProfile({ userId: 'me' });
    const s = r.result;
    const el = document.getElementById('gmailStats');
    if (el) el.textContent = `${Number(s.messagesTotal).toLocaleString()} emails · ${Number(s.threadsTotal).toLocaleString()} threads`;
    log('📊 ' + s.messagesTotal + ' emails, ' + s.threadsTotal + ' threads', 'rx');
    // Check unread count
    gmailCheckUnread();
  } catch (e) {
    log('⚠️ Could not load stats: ' + (e.message || ''), 'error');
  }
}

async function gmailCheckUnread() {
  try {
    // Use INBOX label to get Gmail's real unread count
    const r = await gapi.client.gmail.users.labels.get({ userId: 'me', id: 'INBOX' });
    const unreadCount = r.result.messagesUnread || 0;

    if (unreadCount > 0) {
      const el = document.getElementById('gmailStats');
      if (el) el.textContent += ` · 📬 ${unreadCount} unread`;
      log(`📬 You have ~${unreadCount} unread emails`, 'info');

      // Show toast
      showToast(`📬 ${unreadCount} unread emails`, 4000);

      // Browser notification (if permitted)
      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification('Gmail Lab', { body: `You have ~${unreadCount} unread emails`, icon: 'icon-192.png' });
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission().then(p => {
            if (p === 'granted') {
              new Notification('Gmail Lab', { body: `You have ~${unreadCount} unread emails`, icon: 'icon-192.png' });
            }
          });
        }
      }

      // Update page title with unread count
      document.title = `(${unreadCount}) Gmail Lab — Workshop DIY`;
    }
  } catch {}
}

/* ═══════ TOKEN CHECK ═══════ */

async function gmailEnsureToken() {
  if (!gmailAccessToken) return false;
  if (Date.now() > gmailTokenExpiry - 60000) {
    log('🔄 Token expired, refreshing…', 'info');
    try {
      await new Promise((resolve, reject) => {
        gmailTokenClient.requestAccessToken({ prompt: '' });
        const check = setInterval(() => {
          if (Date.now() < gmailTokenExpiry - 60000) { clearInterval(check); resolve(); }
        }, 200);
        setTimeout(() => { clearInterval(check); reject(new Error('Refresh timeout')); }, 10000);
      });
    } catch {
      log('🔑 Please sign in again', 'error');
      gmailSignOut();
      return false;
    }
  }
  return true;
}

/* ═══════ GMAIL API ═══════ */

async function gmailSearch(query, maxResults, pageToken) {
  maxResults = (typeof maxResults === 'number') ? maxResults : 8;
  log('🔍 Searching: ' + (query || '(recent)'), 'tx');
  const listParams = { userId: 'me', q: query, maxResults: maxResults };
  if (pageToken) listParams.pageToken = pageToken;
  const r = await gapi.client.gmail.users.messages.list(listParams);
  const messages = r.result.messages || [];
  const nextPageToken = r.result.nextPageToken || null;
  const totalEstimate = r.result.resultSizeEstimate || 0;
  log('📥 Found ~' + totalEstimate + ' matching emails, showing ' + messages.length, 'rx');

  const detailed = [];
  for (const m of messages) {
    const d = await gapi.client.gmail.users.messages.get({
      userId: 'me', id: m.id, format: 'metadata',
      metadataHeaders: ['From', 'Subject', 'Date']
    });
    const h = d.result.payload.headers;
    const get = n => (h.find(x => x.name === n) || {}).value || '';
    detailed.push({
      id: m.id, threadId: m.threadId,
      from: get('From'), subject: get('Subject'), date: get('Date'),
      snippet: d.result.snippet,
      unread: (d.result.labelIds || []).includes('UNREAD')
    });
  }
  return { emails: detailed, nextPageToken, totalEstimate };
}

async function gmailReadMessage(messageId) {
  log('📖 Reading message ' + messageId.slice(0, 8) + '…', 'tx');
  const r = await gapi.client.gmail.users.messages.get({
    userId: 'me', id: messageId, format: 'full'
  });
  const msg = r.result;
  const h = msg.payload.headers;
  const get = n => (h.find(x => x.name === n) || {}).value || '';

  let body = '';
  function extract(part) {
    if (part.mimeType === 'text/plain' && part.body && part.body.data) {
      body += decodeBase64Utf8(part.body.data);
    }
    if (part.parts) part.parts.forEach(extract);
  }
  extract(msg.payload);
  if (!body && msg.snippet) body = msg.snippet;

  log('📥 Read: ' + (get('Subject') || '(no subject)').slice(0, 40), 'rx');
  return {
    from: get('From'), to: get('To'),
    subject: get('Subject'), date: get('Date'),
    body: body, labels: msg.labelIds || []
  };
}

async function gmailListLabels() {
  log('🏷️ Loading labels…', 'tx');
  const r = await gapi.client.gmail.users.labels.list({ userId: 'me' });
  log('📥 Found ' + r.result.labels.length + ' labels', 'rx');
  return r.result.labels;
}

/* ═══════ DISPLAY ═══════ */

function gmailShowLoading(title) {
  document.getElementById('resultsContainer').innerHTML = `
    <div class="gmail-results">
      <div class="gmail-results-header"><span class="gmail-results-title">🔄 ${gmailEscHtml(title)}</span></div>
      <div class="gmail-loading"><div class="gmail-spinner"></div>Searching your Gmail…</div>
    </div>
  `;
}

function gmailShowError(msg) {
  document.getElementById('resultsContainer').innerHTML = `
    <div class="gmail-results">
      <div class="gmail-results-header">
        <span class="gmail-results-title">❌ Error</span>
        <button class="gmail-results-close" onclick="this.closest('.gmail-results').remove()">✕</button>
      </div>
      <div class="gmail-results-body" style="color:#f04060">${gmailEscHtml(msg)}</div>
    </div>
  `;
}

let gmailTotalLoaded = 0;
let gmailTotalFound = 0;
let gmailLastQuery = '';
let gmailLastTitle = '';
let gmailLoadedEmails = [];

function gmailShowEmailList(title, emails, query, nextPageToken, totalEstimate) {
  const container = document.getElementById('resultsContainer');
  gmailTotalLoaded = emails.length;
  gmailTotalFound = totalEstimate || emails.length;
  const unreadCount = emails.filter(e => e.unread).length;
  const statsText = `~${gmailTotalFound} found · showing ${gmailTotalLoaded}${unreadCount ? ` · ${unreadCount} unread` : ''}`;

  // Store current query for export
  gmailLastQuery = query || '';
  gmailLastTitle = title || '';
  gmailLoadedEmails = emails.slice();

  let html = `<div class="gmail-results">
    <div class="gmail-results-header">
      <span class="gmail-results-title">📨 ${gmailEscHtml(title)}</span>
      <span class="gmail-results-stats" id="resultsStats">${statsText}</span>
      <button class="gmail-save-result-btn" onclick="saveSearch('${gmailEscJs(query||'')}','${gmailEscJs(title||'')}')" title="Save this search">⭐</button>
      <div class="gmail-export-wrap">
        <button class="gmail-export-btn" onclick="toggleExportMenu()">⬇️ Export</button>
        <div class="gmail-export-menu" id="exportMenu" style="display:none">
          <div class="gmail-export-group">
            <div class="gmail-export-label">📋 Headers only — ${emails.length} on screen</div>
            <button onclick="gmailExportLoaded('csv')">CSV</button>
            <button onclick="gmailExportLoaded('json')">JSON</button>
            <button onclick="gmailExportLoaded('txt')">TXT</button>
          </div>
          <div class="gmail-export-group">
            <div class="gmail-export-label">📋 Headers only — all ~${gmailTotalFound} results</div>
            <button onclick="gmailExportAll('csv')">CSV</button>
            <button onclick="gmailExportAll('json')">JSON</button>
            <button onclick="gmailExportAll('txt')">TXT</button>
          </div>
          <div class="gmail-export-group">
            <div class="gmail-export-label">📄 Full email body — all ~${gmailTotalFound} (slower)</div>
            <button onclick="gmailExportFull('csv')">CSV</button>
            <button onclick="gmailExportFull('json')">JSON</button>
            <button onclick="gmailExportFull('txt')">TXT</button>
          </div>
        </div>
      </div>
      <button class="gmail-results-close" onclick="this.closest('.gmail-results').remove()">✕</button>
    </div>
    <div id="exportProgress" class="gmail-export-progress" style="display:none">
      <div class="gmail-export-bar"><div class="gmail-export-fill" id="exportFill"></div></div>
      <span id="exportProgressText">0%</span>
    </div>
    <div class="gmail-results-body">`;

  if (!emails.length) {
    html += '<p style="text-align:center;opacity:0.5;padding:1rem">No emails found.</p>';
  } else {
    for (let idx = 0; idx < emails.length; idx++) {
      const e = emails[idx];
      const from = gmailEscHtml((e.from||'').replace(/<.*>/, '').trim() || e.from);
      html += `<div class="gmail-email ${e.unread ? 'unread' : ''}" onclick="gmailHandleRead('${e.id}')">
        <span class="gmail-email-idx">${idx + 1}/${totalEstimate || emails.length}</span>
        <div class="gmail-email-from">${from}</div>
        <div class="gmail-email-subject">${gmailEscHtml(e.subject || '(no subject)')}</div>
        <div class="gmail-email-snippet">${gmailEscHtml(e.snippet)}</div>
        <div class="gmail-email-date">${gmailFormatDate(e.date)}</div>
      </div>`;
    }
  }
  if (nextPageToken && query !== undefined) {
    html += `<button class="gmail-load-more" onclick="gmailLoadMore('${(query||'').replace(/'/g,"\\'")}','${nextPageToken}')">Load more…</button>`;
  }
  html += '</div></div>';
  container.innerHTML = html;
  container.scrollIntoView({ behavior: 'smooth', block: 'start' });
  log(`📊 ${statsText}`, 'info');
}

async function gmailLoadMore(query, pageToken) {
  if (gmailIsLoading || !gmailAccessToken) return;
  if (!(await gmailEnsureToken())) return;
  gmailIsLoading = true;
  try {
    const result = await gmailSearch(query, 8, pageToken);
    const body = document.querySelector('.gmail-results-body');
    const oldBtn = document.querySelector('.gmail-load-more');
    if (oldBtn) oldBtn.remove();
    if (body) {
      for (let idx = 0; idx < result.emails.length; idx++) {
        const e = result.emails[idx];
        const num = gmailTotalLoaded - result.emails.length + idx + 1;
        const from = gmailEscHtml((e.from||'').replace(/<.*>/, '').trim() || e.from);
        body.insertAdjacentHTML('beforeend', `<div class="gmail-email ${e.unread ? 'unread' : ''}" onclick="gmailHandleRead('${e.id}')">
          <span class="gmail-email-idx">${num}/${gmailTotalFound}</span>
          <div class="gmail-email-from">${from}</div>
          <div class="gmail-email-subject">${gmailEscHtml(e.subject || '(no subject)')}</div>
          <div class="gmail-email-snippet">${gmailEscHtml(e.snippet)}</div>
          <div class="gmail-email-date">${gmailFormatDate(e.date)}</div>
        </div>`);
      }
      if (result.nextPageToken) {
        body.insertAdjacentHTML('beforeend', `<button class="gmail-load-more" onclick="gmailLoadMore('${query.replace(/'/g,"\\'")}','${result.nextPageToken}')">Load more…</button>`);
      }
    }
    gmailTotalLoaded += result.emails.length;
    gmailLoadedEmails.push(...result.emails);
    if (result.totalEstimate) gmailTotalFound = result.totalEstimate;
    const statsEl = document.getElementById('resultsStats');
    if (statsEl) statsEl.textContent = `~${gmailTotalFound} found · showing ${gmailTotalLoaded}`;
    log(`📊 showing ${gmailTotalLoaded} of ~${gmailTotalFound}`, 'info');
    playSound('success');
  } catch (e) {
    log('❌ ' + (e.message || 'Load more failed'), 'error');
  }
  gmailIsLoading = false;
}

function gmailShowEmailFull(email) {
  const container = document.getElementById('resultsContainer');
  container.innerHTML = `
    <div class="gmail-results">
      <div class="gmail-results-header">
        <span class="gmail-results-title">📖 ${gmailEscHtml(email.subject || '(no subject)')}</span>
        <button class="gmail-results-close" onclick="this.closest('.gmail-results').remove()">✕</button>
      </div>
      <div class="gmail-results-body">
        <div><strong>From:</strong> ${gmailEscHtml(email.from)}</div>
        <div><strong>To:</strong> ${gmailEscHtml(email.to)}</div>
        <div><strong>Date:</strong> ${gmailFormatDate(email.date)}</div>
        <div style="margin-top:4px">${(email.labels || []).map(l =>
          `<span class="gmail-label-tag">${l}</span>`).join('')}</div>
        <div class="gmail-email-body">${gmailEscHtml(email.body)}</div>
      </div>
    </div>
  `;
  container.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function gmailShowLabels(labels) {
  const sys = labels.filter(l => l.type === 'system').sort((a, b) => a.name.localeCompare(b.name));
  const usr = labels.filter(l => l.type === 'user').sort((a, b) => a.name.localeCompare(b.name));
  const container = document.getElementById('resultsContainer');
  container.innerHTML = `
    <div class="gmail-results">
      <div class="gmail-results-header">
        <span class="gmail-results-title">🏷️ Your Labels</span>
        <button class="gmail-results-close" onclick="this.closest('.gmail-results').remove()">✕</button>
      </div>
      <div class="gmail-results-body">
        <div style="margin-bottom:0.6rem"><strong>System (${sys.length})</strong></div>
        <div style="margin-bottom:0.8rem">${sys.map(l => `<span class="gmail-label-tag">${l.name}</span>`).join(' ')}</div>
        <div style="margin-bottom:0.6rem"><strong>Your Labels (${usr.length})</strong></div>
        <div>${usr.length
          ? usr.map(l => `<span class="gmail-label-tag user">${l.name}</span>`).join(' ')
          : '<span style="opacity:0.4">No custom labels</span>'}</div>
      </div>
    </div>
  `;
  container.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ═══════ ACTIONS ═══════ */

async function gmailRunSearch(query, title, max) {
  if (gmailIsLoading || !gmailAccessToken) return;
  if (!(await gmailEnsureToken())) return;
  gmailIsLoading = true;
  gmailShowLoading(title);
  try {
    const result = await gmailSearch(query, max || 8);
    gmailShowEmailList(title, result.emails, query, result.nextPageToken, result.totalEstimate);
    playSound('success');
  } catch (e) {
    gmailShowError(e.message || 'Search failed');
    log('❌ ' + (e.message || 'Search failed'), 'error');
    playSound('error');
  }
  gmailIsLoading = false;
}

async function gmailHandleRead(id) {
  if (gmailIsLoading) return;
  gmailIsLoading = true;
  gmailShowLoading('Reading…');
  try {
    const full = await gmailReadMessage(id);
    full._msgId = id;
    gmailShowEmailFull(full);
    playSound('success');
  } catch (e) {
    gmailShowError(e.message || 'Read failed');
    log('❌ ' + (e.message || ''), 'error');
    playSound('error');
  }
  gmailIsLoading = false;
}

function runCustomSearch() {
  const input = document.getElementById('customInput');
  let val = (input && input.value || '').trim();
  if (!val || gmailIsLoading || !gmailAccessToken) return;

  // Multi-search: if input contains commas, build OR query
  if (val.includes(',') && !val.includes(':')) {
    // Plain names/emails separated by commas → from:X OR from:X OR ...
    const terms = val.split(',').map(t => t.trim()).filter(Boolean);
    val = terms.map(t => `from:${t} OR to:${t}`).join(' OR ');
    gmailRunSearch(val, terms.join(', '));
  } else if (val.includes(',') && val.includes(':')) {
    // Already has operators but comma-separated → join with OR
    const terms = val.split(',').map(t => t.trim()).filter(Boolean);
    val = terms.join(' OR ');
    gmailRunSearch(val, val.slice(0, 40));
  } else {
    gmailRunSearch(val, val.slice(0, 40) + (val.length > 40 ? '…' : ''));
  }
  input.value = '';
}

/* ═══════ EXAMPLE BUTTONS ═══════ */

const GMAIL_EXAMPLES = [
  { icon: '📬', label: 'Show my unread emails', query: 'is:unread in:inbox', tip: 'is:unread in:inbox' },
  { icon: '🔍', label: 'Find emails from someone', query: null, tip: 'from:email', askInput: true, askPrompt: 'Enter email address or name:' },
  { icon: '📖', label: 'Read my latest email', query: null, tip: 'Reads newest message', special: 'latest' },
  { icon: '📋', label: 'Search by subject', query: null, tip: 'subject:keyword', askInput: true, askPrompt: 'Enter subject keyword:', prefix: 'subject:' },
  { icon: '📎', label: 'Emails with attachments', query: 'has:attachment newer_than:7d', tip: 'has:attachment' },
  { icon: '⭐', label: 'Starred emails', query: 'is:starred', tip: 'is:starred' },
  { icon: '✉️', label: 'Sent emails', query: 'in:sent', tip: 'in:sent' },
  { icon: '🔄', label: 'All emails with someone', query: null, tip: 'from:X OR to:X', askInput: true, askPrompt: 'Enter email address or name:', special: 'conversation' },
  { icon: '🏷️', label: 'List my labels', query: null, tip: 'Shows all labels', special: 'labels' },
];

function gmailBuildExamples() {
  const container = document.getElementById('exampleButtons');
  if (!container) return;

  GMAIL_EXAMPLES.forEach(ex => {
    const btn = document.createElement('button');
    btn.className = 'gmail-ex-btn';
    btn.disabled = !gmailAccessToken;
    btn.innerHTML = `
      <span class="ex-icon">${ex.icon}</span>
      <div class="ex-text">
        <div class="ex-label">${ex.label}</div>
        <div class="ex-tip">${ex.tip}</div>
      </div>
      <span class="ex-run">RUN ▶</span>
    `;
    btn.onclick = async () => {
      if (!gmailAccessToken) return;
      playSound('click');

      if (ex.special === 'conversation') {
        gmailShowModal(ex.askPrompt, (val) => {
          if (!val) return;
          const q = `from:${val} OR to:${val}`;
          gmailRunSearch(q, 'All emails with: ' + val);
        });
        return;
      } else if (ex.askInput) {
        gmailShowModal(ex.askPrompt, (val) => {
          if (!val) return;
          const q = (ex.prefix || 'from:') + val;
          gmailRunSearch(q, ex.label + ': ' + val);
        });
        return;
      } else if (ex.special === 'latest') {
        if (gmailIsLoading) return;
        gmailIsLoading = true;
        gmailShowLoading('Latest Email');
        try {
          const result = await gmailSearch('', 1);
          if (result.emails.length) {
            const full = await gmailReadMessage(result.emails[0].id);
            gmailShowEmailFull(full);
            playSound('success');
          } else { gmailShowError('No emails found'); }
        } catch (e) {
          gmailShowError(e.message);
          log('❌ ' + e.message, 'error');
        }
        gmailIsLoading = false;
      } else if (ex.special === 'labels') {
        if (gmailIsLoading) return;
        gmailIsLoading = true;
        gmailShowLoading('Labels');
        try {
          gmailShowLabels(await gmailListLabels());
          playSound('success');
        } catch (e) {
          gmailShowError(e.message);
          log('❌ ' + e.message, 'error');
        }
        gmailIsLoading = false;
      } else {
        gmailRunSearch(ex.query, ex.label);
      }
    };
    container.appendChild(btn);
  });
}

/* ═══════ EXACT COUNT ═══════ */

async function gmailExactCount() {
  if (!gmailAccessToken || !gmailLastQuery) { showToast('Search first', 1500); return; }
  if (!(await gmailEnsureToken())) return;

  const statsEl = document.getElementById('resultsStats');
  if (statsEl) statsEl.textContent = 'Counting…';
  log(`🔢 Counting exact results for: ${gmailLastQuery}`, 'info');

  let total = 0;
  let pageToken = null;

  try {
    do {
      const p = { userId: 'me', q: gmailLastQuery, maxResults: 500 };
      if (pageToken) p.pageToken = pageToken;
      const r = await gapi.client.gmail.users.messages.list(p);
      total += (r.result.messages || []).length;
      pageToken = r.result.nextPageToken;
      if (statsEl) statsEl.textContent = `Counting… ${total}`;
    } while (pageToken);

    gmailTotalFound = total;
    const statsText = `${total} found (exact) · showing ${gmailTotalLoaded}`;
    if (statsEl) statsEl.textContent = statsText;
    log(`🔢 Exact count: ${total} emails`, 'success');
    playSound('success');
  } catch (e) {
    log('❌ Count failed: ' + (e.message || ''), 'error');
    if (statsEl) statsEl.textContent = 'Count failed';
  }
}

/* ═══════ BACKGROUND EXACT COUNT ═══════ */

async function gmailExactCountBg(query) {
  if (!gmailAccessToken) return;
  const statsEl = document.getElementById('resultsStats');
  let total = 0;
  let pageToken = null;
  try {
    do {
      const p = { userId: 'me', q: query || '', maxResults: 500 };
      if (pageToken) p.pageToken = pageToken;
      const r = await gapi.client.gmail.users.messages.list(p);
      total += (r.result.messages || []).length;
      pageToken = r.result.nextPageToken;
      if (statsEl) statsEl.textContent = `counting… ${total}`;
    } while (pageToken);
    gmailTotalFound = total;
    if (statsEl) statsEl.textContent = `${total} found · showing ${gmailTotalLoaded}`;
  } catch {}
}

/* ═══════ EXPORT EMAILS ═══════ */

function toggleExportMenu() {
  const menu = document.getElementById('exportMenu');
  if (!menu) return;
  menu.style.display = menu.style.display === 'none' ? 'flex' : 'none';
  playSound('click');
}

// Close export menu when clicking outside
document.addEventListener('click', e => {
  const menu = document.getElementById('exportMenu');
  if (menu && menu.style.display !== 'none' && !e.target.closest('.gmail-export-wrap')) {
    menu.style.display = 'none';
  }
});

function emailToRow(e) {
  return {
    from: (e.from || '').replace(/"/g, '""'),
    subject: (e.subject || '').replace(/"/g, '""'),
    date: e.date || '',
    snippet: (e.snippet || '').replace(/"/g, '""'),
    unread: e.unread ? 'Yes' : 'No',
    id: e.id || ''
  };
}

function emailsToCsv(emails) {
  const header = 'From,Subject,Date,Snippet,Unread,ID';
  const rows = emails.map(e => {
    const r = emailToRow(e);
    return `"${r.from}","${r.subject}","${r.date}","${r.snippet}","${r.unread}","${r.id}"`;
  });
  return header + '\n' + rows.join('\n');
}

function emailsToJson(emails) {
  return JSON.stringify(emails.map(e => ({
    from: e.from, subject: e.subject, date: e.date,
    snippet: e.snippet, unread: e.unread, id: e.id,
    threadId: e.threadId
  })), null, 2);
}

function emailsToTxt(emails) {
  return emails.map((e, i) => {
    return `--- Email ${i + 1} ---\nFrom: ${e.from}\nSubject: ${e.subject}\nDate: ${e.date}\nUnread: ${e.unread ? 'Yes' : 'No'}\n\n${e.snippet}\n`;
  }).join('\n');
}

function exportVerifySummary(emails, format) {
  const total = emails.length;
  const failed = emails.filter(e => (!e.from && !e.subject) || (e.subject || '').includes('(error') || (e.subject || '').includes('(failed') || (e.subject || '').includes('(parse error')).length;
  const ok = total - failed;
  const senders = new Set(emails.filter(e => e.from).map(e => e.from.toLowerCase())).size;
  const dates = emails.map(e => e.date).filter(Boolean).map(d => new Date(d)).filter(d => !isNaN(d)).sort((a, b) => a - b);
  const oldest = dates.length ? dates[0].toLocaleDateString() : 'N/A';
  const newest = dates.length ? dates[dates.length - 1].toLocaleDateString() : 'N/A';
  const unread = emails.filter(e => e.unread).length;

  if (format === 'txt') {
    return `\n\n${'═'.repeat(50)}\n` +
      `EXPORT VERIFICATION SUMMARY\n` +
      `${'═'.repeat(50)}\n` +
      `Total emails in file: ${total}\n` +
      `Successfully exported: ${ok}\n` +
      `Failed/skipped: ${failed}\n` +
      `Unread: ${unread}\n` +
      `Unique senders: ${senders}\n` +
      `Date range: ${oldest} → ${newest}\n` +
      `Exported on: ${new Date().toLocaleString()}\n` +
      `Query: ${gmailLastQuery || '(all inbox)'}\n` +
      `${'═'.repeat(50)}\n`;
  } else if (format === 'csv') {
    return `\n\n"--- VERIFICATION SUMMARY ---"\n` +
      `"Total","${total}"\n"OK","${ok}"\n"Failed","${failed}"\n` +
      `"Unread","${unread}"\n"Senders","${senders}"\n` +
      `"Date range","${oldest} → ${newest}"\n` +
      `"Exported","${new Date().toLocaleString()}"\n` +
      `"Query","${gmailLastQuery || '(all inbox)'}"`;
  }
  return '';
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
  log(`💾 Exported: ${filename}`, 'success');
  playSound('success');
}

function gmailExportLoaded(format) {
  const menu = document.getElementById('exportMenu');
  if (menu) menu.style.display = 'none';

  if (!gmailLoadedEmails.length) {
    log('❌ No emails to export', 'error');
    return;
  }

  const ts = new Date().toISOString().slice(0, 10);
  const prefix = `gmail-${gmailLastTitle.replace(/[^a-zA-Z0-9]/g, '-').slice(0, 30)}-${ts}`;

  if (format === 'csv') {
    downloadFile(emailsToCsv(gmailLoadedEmails) + exportVerifySummary(gmailLoadedEmails, 'csv'), `${prefix}.csv`, 'text/csv');
  } else if (format === 'json') {
    downloadFile(emailsToJson(gmailLoadedEmails), `${prefix}.json`, 'application/json');
  } else {
    downloadFile(emailsToTxt(gmailLoadedEmails) + exportVerifySummary(gmailLoadedEmails, 'txt'), `${prefix}.txt`, 'text/plain');
  }
  log(`📊 Exported ${gmailLoadedEmails.length} loaded emails as ${format.toUpperCase()}`, 'info');
}

async function gmailExportAll(format) {
  const menu = document.getElementById('exportMenu');
  if (menu) menu.style.display = 'none';

  if (!gmailAccessToken) {
    log('❌ No search to export', 'error');
    return;
  }

  if (!(await gmailEnsureToken())) return;

  const progressEl = document.getElementById('exportProgress');
  const fillEl = document.getElementById('exportFill');
  const textEl = document.getElementById('exportProgressText');
  if (progressEl) progressEl.style.display = 'flex';

  const allEmails = [];
  let pageToken = null;
  let page = 0;
  const estimate = gmailTotalFound || 100;

  log(`⬇️ Exporting all ~${estimate} emails…`, 'info');

  try {
    // Step 1: Collect all message IDs (fast, no metadata fetch)
    const allIds = [];
    do {
      const listParams = { userId: 'me', q: gmailLastQuery, maxResults: 500 };
      if (pageToken) listParams.pageToken = pageToken;
      const r = await gapi.client.gmail.users.messages.list(listParams);
      allIds.push(...(r.result.messages || []).map(m => m.id));
      pageToken = r.result.nextPageToken;

      if (textEl) textEl.textContent = `IDs: ${allIds.length} / ~${estimate}`;
      if (allIds.length >= 2000) { log('⚠️ Capped at 2000', 'info'); break; }
    } while (pageToken);

    // Step 2: Fetch metadata in batches of 100
    log(`📦 Reading metadata for ${allIds.length} emails in batches…`, 'info');
    const META_BATCH = 100;
    for (let bs = 0; bs < allIds.length; bs += META_BATCH) {
      const batchIds = allIds.slice(bs, bs + META_BATCH);
      const batchNum = Math.floor(bs / META_BATCH) + 1;
      const totalBatches = Math.ceil(allIds.length / META_BATCH);
      try {
        const boundary = 'batch_meta_' + Date.now();
        let body = '';
        batchIds.forEach((id, idx) => {
          body += `--${boundary}\r\nContent-Type: application/http\r\nContent-ID: <m${idx}>\r\n\r\nGET /gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date\r\n\r\n`;
        });
        body += `--${boundary}--`;
        const resp = await fetch('https://www.googleapis.com/batch/gmail/v1', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + gmailAccessToken, 'Content-Type': 'multipart/mixed; boundary=' + boundary },
          body
        });
        const text = await resp.text();
        const rb = text.match(/^--([^\r\n]+)/)?.[1];
        if (rb) {
          text.split('--' + rb).slice(1, -1).forEach(part => {
            try {
              const json = JSON.parse(part.match(/\{[\s\S]*\}/)?.[0]);
              if (json.error) { allEmails.push({ id: '', from: '', subject: '(error)', date: '', snippet: '', unread: false }); return; }
              const h = json.payload?.headers || [];
              const get = n => (h.find(x => x.name === n) || {}).value || '';
              allEmails.push({ id: json.id, from: get('From'), subject: get('Subject'), date: get('Date'), snippet: json.snippet, unread: (json.labelIds || []).includes('UNREAD') });
            } catch { allEmails.push({ id: '', from: '', subject: '(parse error)', date: '', snippet: '', unread: false }); }
          });
        }
      } catch (e) {
        log(`⚠️ Batch ${batchNum} failed, using fallback…`, 'error');
        for (const id of batchIds) {
          try {
            const d = await gapi.client.gmail.users.messages.get({ userId: 'me', id, format: 'metadata', metadataHeaders: ['From', 'Subject', 'Date'] });
            const h = d.result.payload.headers; const get = n => (h.find(x => x.name === n) || {}).value || '';
            allEmails.push({ id, from: get('From'), subject: get('Subject'), date: get('Date'), snippet: d.result.snippet, unread: (d.result.labelIds || []).includes('UNREAD') });
          } catch { allEmails.push({ id, from: '', subject: '(error)', date: '', snippet: '', unread: false }); }
        }
      }
      const pct = Math.min(100, Math.round((allEmails.length / allIds.length) * 100));
      if (fillEl) fillEl.style.width = pct + '%';
      if (textEl) textEl.textContent = `Batch ${batchNum}/${totalBatches} — ${allEmails.length}/${allIds.length}`;
      if (bs + META_BATCH < allIds.length) await new Promise(r => setTimeout(r, 300));
    }

    const ts = new Date().toISOString().slice(0, 10);
    const prefix = `gmail-ALL-${gmailLastTitle.replace(/[^a-zA-Z0-9]/g, '-').slice(0, 30)}-${ts}`;

    if (format === 'csv') {
      downloadFile(emailsToCsv(allEmails) + exportVerifySummary(allEmails, 'csv'), `${prefix}.csv`, 'text/csv');
    } else if (format === 'json') {
      downloadFile(emailsToJson(allEmails), `${prefix}.json`, 'application/json');
    } else {
      downloadFile(emailsToTxt(allEmails) + exportVerifySummary(allEmails, 'txt'), `${prefix}.txt`, 'text/plain');
    }
    log(`📊 Exported ALL ${allEmails.length} emails as ${format.toUpperCase()}`, 'success');
  } catch (e) {
    log('❌ Export failed: ' + (e.message || ''), 'error');
  }

  if (progressEl) progressEl.style.display = 'none';
  if (fillEl) fillEl.style.width = '0%';
}

/* ═══════ FULL CONTENT EXPORT ═══════ */

function fullEmailToCsv(emails) {
  const header = 'From,To,Subject,Date,Labels,Body';
  const rows = emails.map(e => {
    const esc = s => '"' + (s || '').replace(/"/g, '""').replace(/\n/g, ' ') + '"';
    return [esc(e.from), esc(e.to), esc(e.subject), esc(e.date), esc((e.labels||[]).join('; ')), esc(e.body)].join(',');
  });
  return header + '\n' + rows.join('\n');
}

function fullEmailToJson(emails) {
  return JSON.stringify(emails.map(e => ({
    from: e.from, to: e.to, subject: e.subject, date: e.date,
    labels: e.labels, body: e.body
  })), null, 2);
}

function fullEmailToTxt(emails) {
  return emails.map((e, i) => {
    return `════════════════════════════════════════\n` +
      `Email ${i + 1}\n` +
      `════════════════════════════════════════\n` +
      `From:    ${e.from}\n` +
      `To:      ${e.to}\n` +
      `Subject: ${e.subject}\n` +
      `Date:    ${e.date}\n` +
      `Labels:  ${(e.labels||[]).join(', ')}\n` +
      `────────────────────────────────────────\n\n` +
      `${e.body || '(no content)'}\n`;
  }).join('\n\n');
}

async function gmailExportFull(format) {
  const menu = document.getElementById('exportMenu');
  if (menu) menu.style.display = 'none';

  if (!gmailAccessToken) { log('❌ Not signed in', 'error'); return; }
  if (!(await gmailEnsureToken())) return;

  // Use export progress from results header, or from Tools sidebar
  let progressEl = document.getElementById('exportProgress') || document.getElementById('exportAllProgress');
  let fillEl = document.getElementById('exportFill') || document.getElementById('exportAllFill');
  let textEl = document.getElementById('exportProgressText') || document.getElementById('exportAllText');
  if (progressEl) progressEl.style.display = 'flex';

  showToast('Starting full export…', 0);

  // Step 1: Collect all message IDs
  const allIds = [];
  let pageToken = null;
  const estimate = gmailTotalFound || 100;

  log(`📄 Fetching all message IDs for full export…`, 'info');

  try {
    do {
      const listParams = { userId: 'me', q: gmailLastQuery, maxResults: 500 };
      if (pageToken) listParams.pageToken = pageToken;
      const r = await gapi.client.gmail.users.messages.list(listParams);
      const msgs = r.result.messages || [];
      allIds.push(...msgs.map(m => m.id));
      pageToken = r.result.nextPageToken;

      const pct = Math.min(50, Math.round((allIds.length / estimate) * 50));
      if (fillEl) fillEl.style.width = pct + '%';
      if (textEl) textEl.textContent = `IDs: ${allIds.length} / ~${estimate}`;

      if (allIds.length >= 1000) {
        log(`⚠️ Full export capped at 1000 emails (API rate protection)`, 'info');
        break;
      }
    } while (pageToken);

    // Step 2: Fetch full content using gapi.client.newBatch()
    log(`📄 Reading ${allIds.length} emails in batches of 20…`, 'info');
    const fullEmails = [];
    const BATCH = 20;

    for (let i = 0; i < allIds.length; i += BATCH) {
      const chunk = allIds.slice(i, i + BATCH);
      const batchNum = Math.floor(i / BATCH) + 1;
      const totalBatches = Math.ceil(allIds.length / BATCH);

      try {
        // Use gapi batch (official SDK method)
        const batch = gapi.client.newBatch();
        chunk.forEach((id, idx) => {
          batch.add(gapi.client.gmail.users.messages.get({
            userId: 'me', id: id, format: 'full'
          }), { id: 'msg' + idx });
        });

        const batchResp = await batch;
        for (const key of Object.keys(batchResp.result)) {
          const res = batchResp.result[key];
          try {
            if (res.status !== 200 || !res.result?.payload) {
              fullEmails.push({ from: '', to: '', subject: '(error ' + (res.status || '') + ')', date: '', body: '', labels: [] });
              continue;
            }
            const msg = res.result;
            const headers = msg.payload.headers || [];
            const get = n => (headers.find(x => x.name === n) || {}).value || '';
            let body = '';
            function extractBody(p) {
              if (p.mimeType === 'text/plain' && p.body?.data) body += decodeBase64Utf8(p.body.data);
              if (p.parts) p.parts.forEach(extractBody);
            }
            extractBody(msg.payload);
            if (!body && msg.snippet) body = msg.snippet;
            fullEmails.push({ from: get('From'), to: get('To'), subject: get('Subject'), date: get('Date'), body, labels: msg.labelIds || [] });
          } catch { fullEmails.push({ from: '', to: '', subject: '(parse error)', date: '', body: '', labels: [] }); }
        }
      } catch (e) {
        log(`⚠️ Batch ${batchNum} failed: ${e.message}, reading individually…`, 'error');
        for (const id of chunk) {
          try { fullEmails.push(await gmailReadMessage(id)); }
          catch { fullEmails.push({ from: '', to: '', subject: '(failed)', date: '', body: '', labels: [] }); }
          await new Promise(r => setTimeout(r, 500));
        }
      }

      const pct = 50 + Math.round((fullEmails.length / allIds.length) * 50);
      if (fillEl) fillEl.style.width = pct + '%';
      if (textEl) textEl.textContent = `Batch ${batchNum}/${totalBatches} — ${fullEmails.length}/${allIds.length}`;
      showToast(`Full export: ${fullEmails.length}/${allIds.length}`, 0);
      log(`📦 Batch ${batchNum}/${totalBatches}: ${fullEmails.length} read`, 'info');

      // Pause between batches
      if (i + BATCH < allIds.length) await new Promise(r => setTimeout(r, 1000));
    }

    // Step 3: Download
    const ts = new Date().toISOString().slice(0, 10);
    const prefix = `gmail-FULL-${gmailLastTitle.replace(/[^a-zA-Z0-9]/g, '-').slice(0, 30)}-${ts}`;

    if (format === 'csv') {
      downloadFile(fullEmailToCsv(fullEmails) + exportVerifySummary(fullEmails, 'csv'), `${prefix}.csv`, 'text/csv');
    } else if (format === 'json') {
      downloadFile(fullEmailToJson(fullEmails), `${prefix}.json`, 'application/json');
    } else {
      downloadFile(fullEmailToTxt(fullEmails) + exportVerifySummary(fullEmails, 'txt'), `${prefix}.txt`, 'text/plain');
    }
    log(`📄 Exported ${fullEmails.length} emails with full content as ${format.toUpperCase()}`, 'success');

  } catch (e) {
    log('❌ Full export failed: ' + (e.message || ''), 'error');
  }

  if (progressEl) progressEl.style.display = 'none';
  if (fillEl) fillEl.style.width = '0%';
  hideToast();
}

/* ═══════ SEARCH HISTORY ═══════ */

let searchHistory = [];
let savedSearches = [];

function loadSearchHistory() {
  try { searchHistory = JSON.parse(localStorage.getItem('gmail-search-history') || '[]'); } catch { searchHistory = []; }
  try { savedSearches = JSON.parse(localStorage.getItem('gmail-saved-searches') || '[]'); } catch { savedSearches = []; }
}

function saveSearchHistory() {
  try { localStorage.setItem('gmail-search-history', JSON.stringify(searchHistory.slice(0, 50))); } catch {}
}

function saveSavedSearches() {
  try { localStorage.setItem('gmail-saved-searches', JSON.stringify(savedSearches)); } catch {}
}

function addToHistory(query, title) {
  if (!query && query !== '') return;
  searchHistory = searchHistory.filter(h => h.query !== query);
  searchHistory.unshift({ query, title, time: new Date().toLocaleString() });
  if (searchHistory.length > 50) searchHistory.pop();
  saveSearchHistory();
  renderHistory();
}

function saveSearch(query, title) {
  if (savedSearches.find(s => s.query === query)) return;
  savedSearches.push({ query, title, time: new Date().toLocaleString() });
  saveSavedSearches();
  renderHistory();
  log(`⭐ Search saved: ${title || query}`, 'success');
  playSound('success');
}

function removeSavedSearch(idx) {
  savedSearches.splice(idx, 1);
  saveSavedSearches();
  renderHistory();
}

function clearSearchHistory() {
  searchHistory = [];
  saveSearchHistory();
  renderHistory();
  log('🕐 Search history cleared', 'info');
}

function showHistoryTab(tab) {
  document.querySelectorAll('.gmail-htab').forEach(t => t.classList.remove('active'));
  document.querySelector(`.gmail-htab[onclick*="${tab}"]`)?.classList.add('active');
  const recent = document.getElementById('historyRecent');
  const saved = document.getElementById('historySaved');
  if (recent) recent.style.display = tab === 'recent' ? '' : 'none';
  if (saved) saved.style.display = tab === 'saved' ? '' : 'none';
}

function renderHistory() {
  const recentEl = document.getElementById('historyRecent');
  const savedEl = document.getElementById('historySaved');

  if (recentEl) {
    if (!searchHistory.length) {
      recentEl.innerHTML = '<p style="text-align:center;opacity:0.4;padding:12px">No recent searches</p>';
    } else {
      recentEl.innerHTML = `<div style="text-align:right;margin-bottom:6px"><button class="gmail-history-clear" onclick="clearSearchHistory()">🧹 Clear</button></div>` +
        searchHistory.map(h => `
          <div class="gmail-history-item">
            <div class="gmail-history-info" onclick="pasteToSearch('${gmailEscJs(h.query)}')">
              <span class="gmail-history-query">${gmailEscHtml(h.title || h.query)}</span>
              <span class="gmail-history-time">${h.time}</span>
            </div>
            <button class="gmail-history-save" onclick="saveSearch('${gmailEscHtml(h.query).replace(/'/g,"\\'")}','${gmailEscHtml(h.title||h.query).replace(/'/g,"\\'")}')">⭐</button>
          </div>
        `).join('');
    }
  }

  if (savedEl) {
    if (!savedSearches.length) {
      savedEl.innerHTML = '<p style="text-align:center;opacity:0.4;padding:12px">No saved searches</p>';
    } else {
      savedEl.innerHTML = savedSearches.map((s, i) => `
        <div class="gmail-history-item">
          <div class="gmail-history-info" onclick="pasteToSearch('${gmailEscJs(s.query)}')">
            <span class="gmail-history-query">⭐ ${gmailEscHtml(s.title || s.query)}</span>
            <span class="gmail-history-time">${s.time}</span>
          </div>
          <button class="gmail-history-del" onclick="removeSavedSearch(${i})">🗑️</button>
        </div>
      `).join('');
    }
  }
}

function pasteToSearch(query) {
  const input = document.getElementById('customInput');
  if (!input) return;
  // Append to existing text with comma if not empty
  const current = input.value.trim();
  if (current && !current.endsWith(',')) {
    input.value = current + ', ' + query;
  } else if (current) {
    input.value = current + ' ' + query;
  } else {
    input.value = query;
  }
  input.focus();
  playSound('click');
}

function saveCurrentSearch() {
  const input = document.getElementById('customInput');
  const val = (input && input.value || '').trim();
  if (!val) { showToast('Type a search first', 1500); return; }
  saveSearch(val, val.slice(0, 40));
}

// Hook into gmailRunSearch to track history + auto count
const _origRunSearch = gmailRunSearch;
gmailRunSearch = async function(query, title, max) {
  addToHistory(query, title);
  const result = await _origRunSearch(query, title, max);
  // Auto count in background
  gmailExactCountBg(query);
  return result;
};

/* ═══════ CONTACT BOOK ═══════ */

let extractedContacts = [];
let isExtracting = false;

async function gmailExtractContacts() {
  if (isExtracting || !gmailAccessToken) return;
  if (!(await gmailEnsureToken())) return;

  isExtracting = true;
  const btn = document.getElementById('extractContactsBtn');
  if (btn) btn.textContent = '⏳ Extracting…';

  const contactMap = {};
  let pageToken = null;
  let totalFetched = 0;

  log('👥 Extracting contacts from emails…', 'info');

  try {
    // Scan recent 500 emails for unique senders/recipients
    do {
      const listParams = { userId: 'me', maxResults: 200 };
      if (pageToken) listParams.pageToken = pageToken;
      const r = await gapi.client.gmail.users.messages.list(listParams);
      const msgs = r.result.messages || [];
      pageToken = r.result.nextPageToken;

      for (const m of msgs) {
        try {
          const d = await gapi.client.gmail.users.messages.get({
            userId: 'me', id: m.id, format: 'metadata',
            metadataHeaders: ['From', 'To']
          });
          const headers = d.result.payload.headers;
          const from = (headers.find(h => h.name === 'From') || {}).value || '';
          const to = (headers.find(h => h.name === 'To') || {}).value || '';

          [from, to].forEach(field => {
            if (!field) return;
            // Split multiple recipients
            field.split(',').forEach(part => {
              part = part.trim();
              const emailMatch = part.match(/<([^>]+)>/);
              const email = emailMatch ? emailMatch[1].toLowerCase() : part.toLowerCase();
              if (!email || !email.includes('@')) return;
              const nameMatch = part.match(/^"?([^"<]+)"?\s*</);
              const name = nameMatch ? nameMatch[1].trim() : '';

              if (!contactMap[email]) {
                contactMap[email] = { email, name, count: 1 };
              } else {
                contactMap[email].count++;
                if (name && !contactMap[email].name) contactMap[email].name = name;
              }
            });
          });
        } catch {}
      }

      totalFetched += msgs.length;
      if (btn) btn.textContent = `⏳ ${totalFetched} emails scanned…`;

      if (totalFetched >= 500) break;
      // Small delay to avoid rate limits
      await new Promise(r => setTimeout(r, 300));
    } while (pageToken);

    extractedContacts = Object.values(contactMap).sort((a, b) => b.count - a.count);

    log(`👥 Extracted ${extractedContacts.length} unique contacts from ${totalFetched} emails`, 'success');
    playSound('success');
    renderContacts();
    updateContactButtons(true);

  } catch (e) {
    log('❌ Contact extraction failed: ' + (e.message || ''), 'error');
  }

  isExtracting = false;
  if (btn) btn.textContent = '🔍 Extract Contacts';
}

function renderContacts(filter) {
  const container = document.getElementById('contactsList');
  const countEl = document.getElementById('contactCount');
  if (!container) return;

  let list = extractedContacts;
  if (filter) {
    const f = filter.toLowerCase();
    list = list.filter(c => c.email.includes(f) || (c.name && c.name.toLowerCase().includes(f)));
  }

  if (countEl) countEl.textContent = `${list.length} contact${list.length !== 1 ? 's' : ''}`;

  if (!list.length) {
    container.innerHTML = '<p style="text-align:center;opacity:0.4;padding:12px">No contacts found</p>';
    return;
  }

  container.innerHTML = list.slice(0, 200).map(c => `
    <div class="gmail-contact-item">
      <div class="gmail-contact-avatar">${(c.name || c.email)[0].toUpperCase()}</div>
      <div class="gmail-contact-info">
        <span class="gmail-contact-name">${gmailEscHtml(c.name || c.email.split('@')[0])}</span>
        <span class="gmail-contact-email">${gmailEscHtml(c.email)}</span>
      </div>
      <span class="gmail-contact-count">${c.count}x</span>
      <button class="gmail-contact-search" onclick="gmailRunSearch('from:${c.email} OR to:${c.email}','All emails: ${gmailEscHtml(c.name||c.email).replace(/'/g,"")}')" title="Search emails">🔍</button>
    </div>
  `).join('');
}

function filterContacts() {
  const val = document.getElementById('contactFilter')?.value || '';
  renderContacts(val);
}

function updateContactButtons(enabled) {
  const csv = document.getElementById('exportContactsCsvBtn');
  const json = document.getElementById('exportContactsJsonBtn');
  if (csv) csv.disabled = !enabled;
  if (json) json.disabled = !enabled;
}

function gmailExportContacts(format) {
  if (!extractedContacts.length) return;

  const ts = new Date().toISOString().slice(0, 10);
  if (format === 'csv') {
    const csv = 'Name,Email,Frequency\n' + extractedContacts.map(c =>
      `"${(c.name||'').replace(/"/g,'""')}","${c.email}","${c.count}"`
    ).join('\n');
    downloadFile(csv, `gmail-contacts-${ts}.csv`, 'text/csv');
  } else {
    downloadFile(JSON.stringify(extractedContacts, null, 2), `gmail-contacts-${ts}.json`, 'application/json');
  }
  log(`👥 Exported ${extractedContacts.length} contacts as ${format.toUpperCase()}`, 'success');
}

/* ═══════ INSIGHT CONCURRENCY GUARD ═══════ */

let insightRunning = false;
function insightGuard() {
  if (insightRunning) { showToast('Another analysis is running…', 2000); return false; }
  insightRunning = true;
  return true;
}
function insightDone() { insightRunning = false; }

/* ═══════ EMAIL STATS DASHBOARD ═══════ */

async function gmailBuildStats() {
  if (!insightGuard()) return;
  if (!gmailAccessToken) return;
  if (!(await gmailEnsureToken())) return;

  const btn = document.getElementById('buildStatsBtn');
  const status = document.getElementById('statsStatus');
  const dashboard = document.getElementById('statsDashboard');
  if (btn) btn.disabled = true;
  if (status) status.textContent = 'Scanning…';

  const senderMap = {};
  const dayMap = {};
  const hourMap = {};
  let totalScanned = 0, unreadTotal = 0, starredTotal = 0, attachTotal = 0;
  let pageToken = null;

  log('📊 Analyzing inbox…', 'info');

  try {
    do {
      const listParams = { userId: 'me', maxResults: 250 };
      if (pageToken) listParams.pageToken = pageToken;
      const r = await gapi.client.gmail.users.messages.list(listParams);
      const msgs = r.result.messages || [];
      pageToken = r.result.nextPageToken;

      for (const m of msgs) {
        try {
          const d = await gapi.client.gmail.users.messages.get({
            userId: 'me', id: m.id, format: 'metadata',
            metadataHeaders: ['From', 'Date']
          });
          const headers = d.result.payload.headers;
          const from = (headers.find(h => h.name === 'From') || {}).value || '';
          const dateStr = (headers.find(h => h.name === 'Date') || {}).value || '';
          const labels = d.result.labelIds || [];

          // Sender stats
          const emailMatch = from.match(/<([^>]+)>/);
          const senderEmail = emailMatch ? emailMatch[1].toLowerCase() : from.toLowerCase().trim();
          const nameMatch = from.match(/^"?([^"<]+)"?\s*</);
          const senderName = nameMatch ? nameMatch[1].trim() : senderEmail.split('@')[0];
          if (senderEmail) {
            if (!senderMap[senderEmail]) senderMap[senderEmail] = { name: senderName, email: senderEmail, count: 0 };
            senderMap[senderEmail].count++;
          }

          // Day & hour stats
          try {
            const dt = new Date(dateStr);
            const dayKey = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dt.getDay()];
            const hourKey = dt.getHours();
            dayMap[dayKey] = (dayMap[dayKey] || 0) + 1;
            hourMap[hourKey] = (hourMap[hourKey] || 0) + 1;
          } catch {}

          // Labels
          if (labels.includes('UNREAD')) unreadTotal++;
          if (labels.includes('STARRED')) starredTotal++;
          if (labels.includes('ATTACHMENT') || d.result.payload?.parts?.some(p => p.filename)) attachTotal++;
        } catch {}
      }

      totalScanned += msgs.length;
      if (status) status.textContent = `${totalScanned} emails scanned…`;
      if (totalScanned >= 500) break;
      await new Promise(r => setTimeout(r, 200));
    } while (pageToken);

    // Build dashboard
    const topSenders = Object.values(senderMap).sort((a, b) => b.count - a.count).slice(0, 10);
    const maxCount = topSenders[0]?.count || 1;
    const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    const maxDay = Math.max(...days.map(d => dayMap[d] || 0), 1);
    const maxHour = Math.max(...Object.values(hourMap), 1);

    if (dashboard) dashboard.innerHTML = `
      <div class="stats-overview">
        <div class="stats-card"><span class="stats-num">${totalScanned}</span><span class="stats-label">Scanned</span></div>
        <div class="stats-card"><span class="stats-num">${unreadTotal}</span><span class="stats-label">Unread</span></div>
        <div class="stats-card"><span class="stats-num">${starredTotal}</span><span class="stats-label">Starred</span></div>
        <div class="stats-card"><span class="stats-num">${Object.keys(senderMap).length}</span><span class="stats-label">Senders</span></div>
      </div>

      <h4 class="stats-section-title">🏆 Top 10 Senders</h4>
      <div class="stats-bars">
        ${topSenders.map(s => `
          <div class="stats-bar-row">
            <span class="stats-bar-label" title="${gmailEscHtml(s.email)}">${gmailEscHtml(s.name)}</span>
            <div class="stats-bar-track"><div class="stats-bar-fill" style="width:${(s.count/maxCount*100).toFixed(0)}%"></div></div>
            <span class="stats-bar-val">${s.count}</span>
          </div>
        `).join('')}
      </div>

      <h4 class="stats-section-title">📅 Emails by Day</h4>
      <div class="stats-bars">
        ${days.map(d => `
          <div class="stats-bar-row">
            <span class="stats-bar-label">${d}</span>
            <div class="stats-bar-track"><div class="stats-bar-fill" style="width:${((dayMap[d]||0)/maxDay*100).toFixed(0)}%"></div></div>
            <span class="stats-bar-val">${dayMap[d]||0}</span>
          </div>
        `).join('')}
      </div>

      <h4 class="stats-section-title">⏰ Busiest Hours</h4>
      <div class="stats-hours">
        ${Array.from({length:24}, (_,h) => {
          const v = hourMap[h] || 0;
          const pct = (v / maxHour * 100).toFixed(0);
          return `<div class="stats-hour" title="${h}:00 — ${v} emails"><div class="stats-hour-bar" style="height:${pct}%"></div><span>${h}</span></div>`;
        }).join('')}
      </div>
    `;

    log(`📊 Stats: ${totalScanned} emails, ${Object.keys(senderMap).length} senders, top: ${topSenders[0]?.name || 'N/A'}`, 'success');
    playSound('success');
  } catch (e) {
    log('❌ Stats failed: ' + (e.message || ''), 'error');
  }

  if (btn) btn.disabled = false;
  insightDone();
  if (status) status.textContent = '';
}

/* ═══════ FILTER BUILDER ═══════ */

function fbBuildQuery() {
  const parts = [];
  const from = document.getElementById('fbFrom')?.value.trim();
  const to = document.getElementById('fbTo')?.value.trim();
  const subject = document.getElementById('fbSubject')?.value.trim();
  const words = document.getElementById('fbWords')?.value.trim();
  const after = document.getElementById('fbAfter')?.value;
  const before = document.getElementById('fbBefore')?.value;
  const unread = document.getElementById('fbUnread')?.checked;
  const starred = document.getElementById('fbStarred')?.checked;
  const attach = document.getElementById('fbAttach')?.checked;

  if (from) parts.push(`from:${from}`);
  if (to) parts.push(`to:${to}`);
  if (subject) parts.push(`subject:${subject}`);
  if (words) parts.push(words);
  if (after) parts.push(`after:${after.replace(/-/g, '/')}`);
  if (before) parts.push(`before:${before.replace(/-/g, '/')}`);
  if (unread) parts.push('is:unread');
  if (starred) parts.push('is:starred');
  if (attach) parts.push('has:attachment');

  return parts.join(' ');
}

function fbUpdatePreview() {
  const q = fbBuildQuery();
  const preview = document.getElementById('fbPreview');
  if (preview) preview.textContent = q || '(empty — enter at least one filter)';
}

function fbRun() {
  const q = fbBuildQuery();
  if (!q) { showToast('Add at least one filter', 2000); return; }
  gmailRunSearch(q, 'Filter: ' + q.slice(0, 40));
  playSound('click');
}

function fbClear() {
  ['fbFrom','fbTo','fbSubject','fbWords','fbAfter','fbBefore'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  ['fbUnread','fbStarred','fbAttach'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.checked = false;
  });
  fbUpdatePreview();
}

// Auto-update preview on input
document.addEventListener('DOMContentLoaded', () => {
  ['fbFrom','fbTo','fbSubject','fbWords','fbAfter','fbBefore'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', fbUpdatePreview);
  });
  ['fbUnread','fbStarred','fbAttach'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', fbUpdatePreview);
  });
});

/* ═══════ GMAIL SEARCH QUIZ ═══════ */

const GMAIL_QUIZ = [
  { q: 'How do you find unread emails?', opts: ['is:unread', 'unread:true', 'status:unread', 'filter:unread'], ans: 0 },
  { q: 'Search for emails from "ahmed"?', opts: ['sender:ahmed', 'by:ahmed', 'from:ahmed', 'origin:ahmed'], ans: 2 },
  { q: 'Find emails with PDF attachments?', opts: ['has:pdf', 'attachment:pdf', 'filename:pdf', 'file:pdf'], ans: 2 },
  { q: 'Show emails from the last 7 days?', opts: ['last:7d', 'recent:7d', 'newer_than:7d', 'age:7d'], ans: 2 },
  { q: 'Search emails by subject line?', opts: ['title:hello', 'heading:hello', 'subject:hello', 'about:hello'], ans: 2 },
  { q: 'Find starred emails?', opts: ['starred:true', 'is:starred', 'flag:starred', 'mark:star'], ans: 1 },
  { q: 'Search sent emails only?', opts: ['is:sent', 'folder:sent', 'in:sent', 'box:sent'], ans: 2 },
  { q: 'Find emails with any attachment?', opts: ['with:file', 'has:attachment', 'includes:file', 'contains:attach'], ans: 1 },
  { q: 'Emails after January 1, 2025?', opts: ['since:2025/01/01', 'after:2025/01/01', 'from_date:2025/01/01', 'date>2025/01/01'], ans: 1 },
  { q: 'Combine: unread from mom with attachment?', opts: ['from:mom + is:unread + has:attachment', 'from:mom is:unread has:attachment', 'from:mom AND unread AND attachment', 'from:mom,is:unread,has:attachment'], ans: 1 },
];

let gmQuizAnswers = {};
let gmQuizScore = 0;

function renderGmailQuiz() {
  const container = document.getElementById('gmailQuizContainer');
  const result = document.getElementById('gmailQuizResult');
  if (!container) return;
  if (result) result.style.display = 'none';
  gmQuizAnswers = {}; gmQuizScore = 0;

  container.innerHTML = GMAIL_QUIZ.map((q, qi) => `
    <div class="gmail-quiz-q" id="gq-${qi}">
      <p class="gmail-quiz-question"><strong>${qi + 1}.</strong> ${q.q}</p>
      <div class="gmail-quiz-opts">
        ${q.opts.map((o, oi) => `<button class="gmail-quiz-opt" onclick="answerGmailQuiz(${qi},${oi})"><code>${o}</code></button>`).join('')}
      </div>
    </div>
  `).join('');
}

function answerGmailQuiz(qi, oi) {
  if (gmQuizAnswers[qi] !== undefined) return;
  gmQuizAnswers[qi] = oi;
  const correct = GMAIL_QUIZ[qi].ans === oi;
  if (correct) gmQuizScore++;

  const qEl = document.getElementById(`gq-${qi}`);
  if (qEl) qEl.querySelectorAll('.gmail-quiz-opt').forEach((b, i) => {
    b.disabled = true;
    if (i === GMAIL_QUIZ[qi].ans) b.classList.add('correct');
    if (i === oi && !correct) b.classList.add('wrong');
  });

  if (Object.keys(gmQuizAnswers).length === GMAIL_QUIZ.length) {
    const r = document.getElementById('gmailQuizResult');
    if (r) {
      r.style.display = 'block';
      const pct = Math.round((gmQuizScore / GMAIL_QUIZ.length) * 100);
      const msg = pct === 100 ? '🏆 Perfect! You are a Gmail Master!' : pct >= 70 ? '🎉 Great job!' : pct >= 50 ? '👍 Not bad!' : '📚 Keep learning!';
      r.textContent = `${msg} Score: ${gmQuizScore}/${GMAIL_QUIZ.length} (${pct}%)`;
      r.className = 'gmail-quiz-result' + (pct === 100 ? ' perfect' : '');
    }
    playSound(gmQuizScore === GMAIL_QUIZ.length ? 'success' : 'click');
    log(`🧠 Quiz: ${gmQuizScore}/${GMAIL_QUIZ.length}`, gmQuizScore === GMAIL_QUIZ.length ? 'success' : 'info');
  }
}

function resetGmailQuiz() { gmQuizAnswers = {}; gmQuizScore = 0; renderGmailQuiz(); }

/* ═══════ DATE RANGE SEARCH ═══════ */

function drPreset(preset) {
  const now = new Date();
  const from = document.getElementById('drFrom');
  const to = document.getElementById('drTo');
  if (!from || !to) return;
  to.value = now.toISOString().slice(0, 10);

  const d = new Date(now);
  switch (preset) {
    case 'today': d.setHours(0,0,0,0); break;
    case 'week': d.setDate(d.getDate() - d.getDay()); break;
    case 'month': d.setDate(1); break;
    case '3months': d.setMonth(d.getMonth() - 3); break;
    case 'year': d.setMonth(0); d.setDate(1); break;
  }
  from.value = d.toISOString().slice(0, 10);
  playSound('click');
}

function drSearch() {
  const from = document.getElementById('drFrom')?.value;
  const to = document.getElementById('drTo')?.value;
  const sender = document.getElementById('drSender')?.value.trim();
  if (!from && !to) { showToast('Select at least one date', 2000); return; }

  const parts = [];
  if (from) parts.push(`after:${from.replace(/-/g, '/')}`);
  if (to) parts.push(`before:${to.replace(/-/g, '/')}`);
  if (sender) parts.push(`from:${sender} OR to:${sender}`);

  const q = parts.join(' ');
  const label = `${from || '...'} → ${to || '...'}${sender ? ' (' + sender + ')' : ''}`;
  gmailRunSearch(q, label);
  playSound('click');
}

/* ═══════ EMAIL TEMPLATES ═══════ */

const DEFAULT_TEMPLATES = {
  professional: [
    { name: 'Acknowledge receipt', body: 'Thank you for your email. I have received it and will get back to you shortly.\n\nBest regards' },
    { name: 'Request information', body: 'I hope this message finds you well.\n\nCould you please provide more details about [topic]? I would appreciate any additional information you can share.\n\nThank you in advance.' },
    { name: 'Follow up', body: 'I wanted to follow up on my previous email regarding [topic]. Could you please provide an update when you get a chance?\n\nThank you for your time.' },
    { name: 'Meeting request', body: 'I would like to schedule a meeting to discuss [topic]. Would any of the following times work for you?\n\n- [Option 1]\n- [Option 2]\n- [Option 3]\n\nPlease let me know your availability.' },
  ],
  polite: [
    { name: 'Thank you', body: 'JazakAllahu khairan for your help and support. I truly appreciate it.\n\nMay Allah bless you.' },
    { name: 'Apology for delay', body: 'Assalamu Alaikum,\n\nI sincerely apologize for the delay in responding. [Reason]. I will address your request immediately.\n\nBarakAllahu feek.' },
    { name: 'Congratulations', body: 'Assalamu Alaikum,\n\nMasha Allah! Congratulations on [achievement]. May Allah continue to bless you with success.\n\nWarm regards' },
  ],
  decline: [
    { name: 'Politely decline', body: 'Thank you for thinking of me. Unfortunately, I am unable to [action] at this time due to [reason].\n\nI hope you understand, and I wish you all the best.' },
    { name: 'Reschedule', body: 'Thank you for the invitation. Unfortunately, I have a conflict at that time. Would it be possible to reschedule to [alternative time]?\n\nI apologize for any inconvenience.' },
  ],
  custom: [],
};

let emailTemplates = null;

function loadTemplates() {
  try {
    const saved = JSON.parse(localStorage.getItem('gmail-templates-custom') || '[]');
    DEFAULT_TEMPLATES.custom = saved;
  } catch {}
  emailTemplates = DEFAULT_TEMPLATES;
}

function saveCustomTemplates() {
  try { localStorage.setItem('gmail-templates-custom', JSON.stringify(emailTemplates.custom)); } catch {}
}

function renderTemplates(category) {
  const tabs = document.getElementById('tplTabs');
  const container = document.getElementById('tplContainer');
  if (!tabs || !container) return;

  const cats = Object.keys(emailTemplates);
  const labels = { professional: '💼 Professional', polite: '🤝 Polite', decline: '🙅 Decline', custom: '✏️ My Templates' };
  const activeCat = category || cats[0];

  tabs.innerHTML = cats.map(c =>
    `<button class="gmail-tpl-tab ${c === activeCat ? 'active' : ''}" onclick="renderTemplates('${c}')">${labels[c] || c}</button>`
  ).join('');

  const tpls = emailTemplates[activeCat] || [];
  if (!tpls.length) {
    container.innerHTML = '<p style="text-align:center;opacity:0.4;padding:12px">No templates yet</p>';
    return;
  }

  container.innerHTML = tpls.map((t, i) => `
    <div class="gmail-tpl-item">
      <div class="gmail-tpl-header">
        <strong>${gmailEscHtml(t.name)}</strong>
        <div>
          <button class="gmail-tpl-copy" onclick="copyTemplate(${i},'${activeCat}')" title="Copy">📋</button>
          ${activeCat === 'custom' ? `<button class="gmail-tpl-del" onclick="deleteTemplate(${i})" title="Delete">🗑️</button>` : ''}
        </div>
      </div>
      <pre class="gmail-tpl-body">${gmailEscHtml(t.body)}</pre>
    </div>
  `).join('');
}

async function copyTemplate(idx, cat) {
  const tpl = emailTemplates[cat]?.[idx];
  if (!tpl) return;
  try {
    await navigator.clipboard.writeText(tpl.body);
    showToast('Template copied!', 1200);
    playSound('success');
    log(`📝 Copied template: ${tpl.name}`, 'info');
  } catch {
    showToast('Copy failed', 1200);
  }
}

function addCustomTemplate() {
  const name = document.getElementById('tplName')?.value.trim();
  const body = document.getElementById('tplBody')?.value.trim();
  if (!name || !body) { showToast('Enter name and text', 2000); return; }
  emailTemplates.custom.push({ name, body });
  saveCustomTemplates();
  renderTemplates('custom');
  document.getElementById('tplName').value = '';
  document.getElementById('tplBody').value = '';
  log(`📝 Template saved: ${name}`, 'success');
  playSound('success');
}

function deleteTemplate(idx) {
  emailTemplates.custom.splice(idx, 1);
  saveCustomTemplates();
  renderTemplates('custom');
}

/* ═══════ TIP OF THE DAY ═══════ */

const GMAIL_TIPS = [
  'Use "is:unread" to find all unread emails instantly.',
  'Combine operators: "from:boss has:attachment newer_than:7d"',
  'Use "larger:5m" to find emails larger than 5 MB.',
  'Search by filename: "filename:invoice.pdf"',
  'Use "in:anywhere" to search all folders including trash and spam.',
  'Use "to:me" to find emails sent directly to you (not CC/BCC).',
  'Search exact phrases with quotes: "project meeting"',
  'Use "OR" (uppercase) to combine: "from:ahmed OR from:ali"',
  'Use "-" to exclude: "project -meeting" finds "project" without "meeting"',
  'Use "label:important" to filter by Gmail labels.',
  'Use "before:2025/01/01" and "after:2024/06/01" for date ranges.',
  'Use "has:drive" to find emails with Google Drive links.',
  'Use "cc:someone" to search the CC field.',
  'Use "list:info@newsletter.com" to find mailing list emails.',
  'Use "category:promotions" to filter by Gmail category tabs.',
  'Use "deliveredto:myemail@gmail.com" for alias-specific searches.',
  'Keyboard shortcut: press "/" in Gmail to jump to the search bar.',
  'Use "AROUND 5" between words to find them within 5 words of each other.',
  'Use "older_than:1y" to find emails older than 1 year.',
  'Star important emails and find them fast with "is:starred".',
];

function showRandomTip() {
  const banner = document.getElementById('tipBanner');
  const text = document.getElementById('tipText');
  if (!banner || !text) return;
  const tip = GMAIL_TIPS[Math.floor(Math.random() * GMAIL_TIPS.length)];
  text.textContent = tip;
  banner.style.display = 'flex';
}

function closeTip() {
  const banner = document.getElementById('tipBanner');
  if (banner) banner.style.display = 'none';
}

/* ═══════ ATTACHMENT MANAGER ═══════ */

let attachmentData = [];

async function gmailScanAttachments() {
  if (!insightGuard()) return;
  if (!gmailAccessToken) { insightDone(); return; }
  if (!(await gmailEnsureToken())) { insightDone(); return; }
  const btn = document.getElementById('scanAttachBtn');
  const status = document.getElementById('attachStatus');
  if (btn) btn.disabled = true;
  if (status) status.textContent = 'Scanning…';
  attachmentData = [];
  let pageToken = null, total = 0;
  try {
    do {
      const p = { userId: 'me', q: 'has:attachment', maxResults: 100 };
      if (pageToken) p.pageToken = pageToken;
      const r = await gapi.client.gmail.users.messages.list(p);
      const msgs = r.result.messages || [];
      pageToken = r.result.nextPageToken;
      for (const m of msgs) {
        try {
          const d = await gapi.client.gmail.users.messages.get({ userId: 'me', id: m.id, format: 'metadata', metadataHeaders: ['From', 'Subject', 'Date'] });
          const h = d.result.payload.headers;
          const get = n => (h.find(x => x.name === n) || {}).value || '';
          const parts = d.result.payload.parts || [];
          parts.forEach(part => {
            if (part.filename && part.filename.length > 0) {
              attachmentData.push({ name: part.filename, size: part.body?.size || 0, type: part.mimeType || '', from: get('From'), subject: get('Subject'), date: get('Date'), msgId: m.id });
            }
          });
        } catch {}
      }
      total += msgs.length;
      if (status) status.textContent = `${total} emails scanned, ${attachmentData.length} attachments found…`;
      if (total >= 300) break;
      await new Promise(r => setTimeout(r, 200));
    } while (pageToken);
    log(`📎 Found ${attachmentData.length} attachments in ${total} emails`, 'success');
    playSound('success');
    renderAttachments();
    const eb = document.getElementById('exportAttachBtn');
    if (eb) eb.disabled = false;
  } catch (e) { log('❌ ' + (e.message || ''), 'error'); }
  if (btn) btn.disabled = false;
  insightDone();
  if (status) status.textContent = '';
}

function renderAttachments() {
  const container = document.getElementById('attachList');
  if (!container) return;
  let list = attachmentData.slice();
  const filter = (document.getElementById('attachFilter')?.value || '').toLowerCase();
  if (filter) list = list.filter(a => a.name.toLowerCase().includes(filter) || a.from.toLowerCase().includes(filter) || a.type.toLowerCase().includes(filter));
  const sort = document.getElementById('attachSort')?.value || 'date';
  if (sort === 'size') list.sort((a, b) => b.size - a.size);
  else if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
  else if (sort === 'sender') list.sort((a, b) => a.from.localeCompare(b.from));
  if (!list.length) { container.innerHTML = '<p style="text-align:center;opacity:0.4;padding:12px">No attachments</p>'; return; }
  container.innerHTML = list.slice(0, 200).map(a => {
    const ext = a.name.split('.').pop().toLowerCase();
    const icon = { pdf: '📄', doc: '📝', docx: '📝', xls: '📊', xlsx: '📊', ppt: '📽️', pptx: '📽️', jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️', zip: '📦', rar: '📦', mp3: '🎵', mp4: '🎬', csv: '📊' }[ext] || '📎';
    const sz = a.size > 1048576 ? (a.size / 1048576).toFixed(1) + ' MB' : a.size > 1024 ? Math.round(a.size / 1024) + ' KB' : a.size + ' B';
    const sender = a.from.replace(/<.*>/, '').trim();
    return `<div class="gmail-contact-item"><span style="font-size:1.3rem">${icon}</span><div class="gmail-contact-info"><span class="gmail-contact-name">${gmailEscHtml(a.name)}</span><span class="gmail-contact-email">${gmailEscHtml(sender)} · ${sz} · ${gmailFormatDate(a.date)}</span></div><button class="gmail-contact-search" onclick="gmailHandleRead('${a.msgId}')" title="Open email">📖</button></div>`;
  }).join('');
}

function exportAttachmentList() {
  if (!attachmentData.length) return;
  const csv = 'Filename,Type,Size,From,Subject,Date\n' + attachmentData.map(a => `"${a.name}","${a.type}","${a.size}","${a.from.replace(/"/g, '')}","${(a.subject || '').replace(/"/g, '')}","${a.date}"`).join('\n');
  downloadFile(csv, `gmail-attachments-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv');
}

/* ═══════ WORD CLOUD ═══════ */

async function gmailBuildWordCloud() {
  if (!insightGuard()) return;
  if (!gmailAccessToken) return;
  if (!(await gmailEnsureToken())) return;
  const btn = document.getElementById('wordCloudBtn');
  const status = document.getElementById('wordCloudStatus');
  const container = document.getElementById('wordCloudContainer');
  if (btn) btn.disabled = true;
  if (status) status.textContent = 'Scanning subjects…';
  const wordMap = {};
  const stopWords = new Set(['re','fwd','the','a','an','and','or','is','in','to','for','of','on','at','by','with','from','your','you','this','that','it','we','our','my','me','i','de','le','la','les','du','des','un','une','et','en','au','à','ce','qui','que','ne','pas','est','pour','sur','se','son','sa','il','elle','nous','je','avec','dans','par','sont','au','aux','mais','ou','donc','ni','car']);
  let pageToken = null, total = 0;
  try {
    do {
      const p = { userId: 'me', maxResults: 200 };
      if (pageToken) p.pageToken = pageToken;
      const r = await gapi.client.gmail.users.messages.list(p);
      const msgs = r.result.messages || [];
      pageToken = r.result.nextPageToken;
      for (const m of msgs) {
        try {
          const d = await gapi.client.gmail.users.messages.get({ userId: 'me', id: m.id, format: 'metadata', metadataHeaders: ['Subject'] });
          const subj = ((d.result.payload.headers.find(h => h.name === 'Subject') || {}).value || '').toLowerCase();
          subj.split(/[\s\-_:,;.!?()[\]{}"'\/\\]+/).forEach(w => {
            w = w.trim();
            if (w.length > 2 && !stopWords.has(w) && !/^\d+$/.test(w)) wordMap[w] = (wordMap[w] || 0) + 1;
          });
        } catch {}
      }
      total += msgs.length;
      if (status) status.textContent = `${total} subjects scanned…`;
      if (total >= 500) break;
      await new Promise(r => setTimeout(r, 200));
    } while (pageToken);
    const words = Object.entries(wordMap).sort((a, b) => b[1] - a[1]).slice(0, 80);
    const maxC = words[0]?.[1] || 1;
    if (container) {
      container.innerHTML = words.map(([w, c]) => {
        const size = 0.6 + (c / maxC) * 2;
        const opacity = 0.4 + (c / maxC) * 0.6;
        const hue = Math.floor(Math.random() * 360);
        return `<span class="wc-word" style="font-size:${size}rem;opacity:${opacity};color:hsl(${hue},70%,65%)" onclick="gmailRunSearch('subject:${w}','Subject: ${w}')" title="${c} emails">${gmailEscHtml(w)}</span>`;
      }).join(' ');
    }
    log(`☁️ Word cloud: ${words.length} words from ${total} emails`, 'success');
    playSound('success');
  } catch (e) { log('❌ ' + (e.message || ''), 'error'); }
  if (btn) btn.disabled = false;
  insightDone();
  if (status) status.textContent = '';
}

/* ═══════ EMAIL DIGEST ═══════ */

async function gmailBuildDigest(period) {
  if (!insightGuard()) return;
  if (!gmailAccessToken) return;
  if (!(await gmailEnsureToken())) return;
  const container = document.getElementById('digestContainer');
  if (!container) return;
  const now = new Date();
  const d = new Date(now);
  if (period === 'day') d.setHours(0, 0, 0, 0);
  else if (period === 'week') d.setDate(d.getDate() - 7);
  else d.setMonth(d.getMonth() - 1);
  const q = `after:${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
  container.innerHTML = '<p style="text-align:center;opacity:0.5">Generating digest…</p>';
  try {
    const senderMap = {};
    let totalEmails = 0, unread = 0, starred = 0;
    let pageToken = null;
    do {
      const p = { userId: 'me', q, maxResults: 250 };
      if (pageToken) p.pageToken = pageToken;
      const r = await gapi.client.gmail.users.messages.list(p);
      const msgs = r.result.messages || [];
      pageToken = r.result.nextPageToken;
      for (const m of msgs) {
        try {
          const det = await gapi.client.gmail.users.messages.get({ userId: 'me', id: m.id, format: 'metadata', metadataHeaders: ['From', 'Subject'] });
          const from = ((det.result.payload.headers.find(h => h.name === 'From') || {}).value || '').replace(/<.*>/, '').trim();
          const labels = det.result.labelIds || [];
          if (from) senderMap[from] = (senderMap[from] || 0) + 1;
          if (labels.includes('UNREAD')) unread++;
          if (labels.includes('STARRED')) starred++;
          totalEmails++;
        } catch {}
      }
      if (totalEmails >= 500) break;
      await new Promise(r => setTimeout(r, 200));
    } while (pageToken);
    const topSenders = Object.entries(senderMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const periodLabel = { day: 'Today', week: 'This Week', month: 'This Month' }[period];
    container.innerHTML = `
      <div class="gmail-digest-summary">
        <h4>📰 ${periodLabel}'s Digest</h4>
        <div class="stats-overview" style="margin:10px 0">
          <div class="stats-card"><span class="stats-num">${totalEmails}</span><span class="stats-label">Total</span></div>
          <div class="stats-card"><span class="stats-num">${unread}</span><span class="stats-label">Unread</span></div>
          <div class="stats-card"><span class="stats-num">${starred}</span><span class="stats-label">Starred</span></div>
          <div class="stats-card"><span class="stats-num">${Object.keys(senderMap).length}</span><span class="stats-label">Senders</span></div>
        </div>
        <h4 class="stats-section-title">🏆 Top Senders</h4>
        ${topSenders.map(([name, count]) => `<div class="gmail-contact-item" style="padding:6px 10px"><span class="gmail-contact-name" style="flex:1">${gmailEscHtml(name)}</span><span class="gmail-contact-count">${count}</span></div>`).join('')}
      </div>`;
    log(`📰 Digest (${periodLabel}): ${totalEmails} emails, ${unread} unread`, 'success');
    playSound('success');
  } catch (e) { log('❌ ' + (e.message || ''), 'error'); container.innerHTML = ''; insightDone(); }
}

/* ═══════ BULK CLIPBOARD ═══════ */

async function bulkCopy(type) {
  if (!gmailLoadedEmails.length) { showToast('Search first, then bulk copy', 2000); return; }
  let text = '';
  const emails = gmailLoadedEmails;
  if (type === 'subjects') text = emails.map(e => e.subject || '').join('\n');
  else if (type === 'senders') text = [...new Set(emails.map(e => e.from || ''))].join('\n');
  else if (type === 'snippets') text = emails.map(e => `${e.subject}: ${e.snippet || ''}`).join('\n\n');
  else text = emails.map(e => `From: ${e.from}\nSubject: ${e.subject}\nDate: ${e.date}\n${e.snippet || ''}\n---`).join('\n');
  try {
    await navigator.clipboard.writeText(text);
    showToast(`Copied ${emails.length} emails (${type})`, 1500);
    playSound('success');
    const info = document.getElementById('bulkInfo');
    if (info) info.textContent = `✓ ${emails.length} items copied as ${type}`;
  } catch { showToast('Copy failed', 1500); }
}

/* ═══════ EMAIL SIZE ANALYZER ═══════ */

async function gmailAnalyzeSize() {
  if (!insightGuard()) return;
  if (!gmailAccessToken) return;
  if (!(await gmailEnsureToken())) return;
  const btn = document.getElementById('sizeBtn');
  const status = document.getElementById('sizeStatus');
  const container = document.getElementById('sizeContainer');
  if (btn) btn.disabled = true;
  if (status) status.textContent = 'Analyzing…';
  const sizeBuckets = { '< 100 KB': 0, '100 KB - 1 MB': 0, '1 - 5 MB': 0, '5 - 10 MB': 0, '> 10 MB': 0 };
  const bigEmails = [];
  let totalSize = 0, totalCount = 0, pageToken = null;
  try {
    do {
      const p = { userId: 'me', maxResults: 200 };
      if (pageToken) p.pageToken = pageToken;
      const r = await gapi.client.gmail.users.messages.list(p);
      const msgs = r.result.messages || [];
      pageToken = r.result.nextPageToken;
      for (const m of msgs) {
        try {
          const d = await gapi.client.gmail.users.messages.get({ userId: 'me', id: m.id, format: 'metadata', metadataHeaders: ['From', 'Subject', 'Date'] });
          const sz = d.result.sizeEstimate || 0;
          totalSize += sz;
          totalCount++;
          const h = d.result.payload.headers;
          const get = n => (h.find(x => x.name === n) || {}).value || '';
          if (sz < 102400) sizeBuckets['< 100 KB']++;
          else if (sz < 1048576) sizeBuckets['100 KB - 1 MB']++;
          else if (sz < 5242880) sizeBuckets['1 - 5 MB']++;
          else if (sz < 10485760) sizeBuckets['5 - 10 MB']++;
          else sizeBuckets['> 10 MB']++;
          if (sz > 1048576) bigEmails.push({ from: get('From'), subject: get('Subject'), date: get('Date'), size: sz });
        } catch {}
      }
      if (status) status.textContent = `${totalCount} emails analyzed…`;
      if (totalCount >= 500) break;
      await new Promise(r => setTimeout(r, 200));
    } while (pageToken);
    bigEmails.sort((a, b) => b.size - a.size);
    const maxBucket = Math.max(...Object.values(sizeBuckets), 1);
    const totalMB = (totalSize / 1048576).toFixed(1);
    const avgKB = totalCount ? Math.round(totalSize / totalCount / 1024) : 0;
    if (container) container.innerHTML = `
      <div class="stats-overview" style="margin-bottom:12px">
        <div class="stats-card"><span class="stats-num">${totalMB}</span><span class="stats-label">Total MB</span></div>
        <div class="stats-card"><span class="stats-num">${avgKB}</span><span class="stats-label">Avg KB</span></div>
        <div class="stats-card"><span class="stats-num">${totalCount}</span><span class="stats-label">Emails</span></div>
        <div class="stats-card"><span class="stats-num">${bigEmails.length}</span><span class="stats-label">> 1 MB</span></div>
      </div>
      <h4 class="stats-section-title">📊 Size Distribution</h4>
      <div class="stats-bars">${Object.entries(sizeBuckets).map(([label, count]) => `
        <div class="stats-bar-row"><span class="stats-bar-label">${label}</span><div class="stats-bar-track"><div class="stats-bar-fill" style="width:${(count/maxBucket*100).toFixed(0)}%"></div></div><span class="stats-bar-val">${count}</span></div>`).join('')}
      </div>
      ${bigEmails.length ? `<h4 class="stats-section-title">🐘 Heaviest Emails</h4>${bigEmails.slice(0, 10).map(e => {
        const sz = (e.size / 1048576).toFixed(1);
        const sender = (e.from||'').replace(/<.*>/, '').trim();
        return `<div class="gmail-contact-item" style="padding:6px 10px"><div class="gmail-contact-info"><span class="gmail-contact-name">${gmailEscHtml(e.subject || '(no subject)')}</span><span class="gmail-contact-email">${gmailEscHtml(sender)} · ${gmailFormatDate(e.date)}</span></div><span style="font-weight:700;color:var(--accent)">${sz} MB</span></div>`;
      }).join('')}` : ''}`;
    log(`📦 Size: ${totalMB} MB total, avg ${avgKB} KB, ${bigEmails.length} large emails`, 'success');
    playSound('success');
  } catch (e) { log('❌ ' + (e.message || ''), 'error'); }
  if (btn) btn.disabled = false;
  insightDone();
  if (status) status.textContent = '';
}

/* ═══════ INBOX SCORE ═══════ */

async function gmailCalcInboxScore() {
  if (!insightGuard()) return;
  if (!gmailAccessToken) return;
  if (!(await gmailEnsureToken())) return;
  const btn = document.getElementById('scoreBtn');
  const container = document.getElementById('scoreContainer');
  if (btn) btn.disabled = true;
  if (container) container.innerHTML = '<p style="text-align:center;opacity:0.5">Calculating…</p>';
  try {
    const profile = await gapi.client.gmail.users.getProfile({ userId: 'me' });
    const totalMsgs = profile.result.messagesTotal;
    const totalThreads = profile.result.threadsTotal;
    // Count unread
    const unreadR = await gapi.client.gmail.users.messages.list({ userId: 'me', q: 'is:unread', maxResults: 1 });
    const unreadEst = unreadR.result.resultSizeEstimate || 0;
    // Count starred
    const starR = await gapi.client.gmail.users.messages.list({ userId: 'me', q: 'is:starred', maxResults: 1 });
    const starEst = starR.result.resultSizeEstimate || 0;
    // Count labels
    const labelsR = await gapi.client.gmail.users.labels.list({ userId: 'me' });
    const userLabels = (labelsR.result.labels || []).filter(l => l.type === 'user').length;

    // Scoring
    const unreadRatio = totalMsgs > 0 ? unreadEst / totalMsgs : 0;
    const threadRatio = totalMsgs > 0 ? totalThreads / totalMsgs : 0;
    let score = 50;
    // Low unread = good (+30 max)
    score += Math.round((1 - Math.min(unreadRatio * 10, 1)) * 30);
    // Has labels = organized (+10 max)
    score += Math.min(userLabels * 2, 10);
    // Uses stars = prioritizes (+5)
    if (starEst > 0) score += 5;
    // Good thread ratio = clean (+5)
    if (threadRatio > 0.3) score += 5;
    score = Math.min(100, Math.max(0, score));

    const emoji = score >= 90 ? '🏆' : score >= 70 ? '🎉' : score >= 50 ? '👍' : score >= 30 ? '😐' : '😱';
    const color = score >= 70 ? '#4ade80' : score >= 50 ? '#fbbf24' : '#ef4444';
    const tips = [];
    if (unreadEst > 50) tips.push('📬 Clear your unread emails — you have ~' + unreadEst);
    if (userLabels < 3) tips.push('🏷️ Create more labels to organize your inbox');
    if (starEst === 0) tips.push('⭐ Star important emails for quick access');

    if (container) container.innerHTML = `
      <div style="text-align:center;padding:20px 0">
        <div style="font-size:4rem">${emoji}</div>
        <div style="font-size:2.5rem;font-weight:800;color:${color};font-family:var(--font-h)">${score}/100</div>
        <div style="font-size:0.85rem;opacity:0.6;margin-top:4px">Inbox Health Score</div>
      </div>
      <div class="stats-overview">
        <div class="stats-card"><span class="stats-num">${Number(totalMsgs).toLocaleString()}</span><span class="stats-label">Emails</span></div>
        <div class="stats-card"><span class="stats-num">~${unreadEst}</span><span class="stats-label">Unread</span></div>
        <div class="stats-card"><span class="stats-num">${starEst}</span><span class="stats-label">Starred</span></div>
        <div class="stats-card"><span class="stats-num">${userLabels}</span><span class="stats-label">Labels</span></div>
      </div>
      ${tips.length ? `<div style="margin-top:12px"><h4 class="stats-section-title">💡 Tips to Improve</h4>${tips.map(t => `<p style="font-size:0.82rem;padding:4px 0">${t}</p>`).join('')}</div>` : ''}`;
    log(`🏆 Inbox Score: ${score}/100`, score >= 70 ? 'success' : 'info');
    playSound('success');
  } catch (e) { log('❌ ' + (e.message || ''), 'error'); if (container) container.innerHTML = ''; }
  if (btn) btn.disabled = false;
  insightDone();
}

/* ═══════ GMAIL SHORTCUTS TRAINER ═══════ */

const GMAIL_SHORTCUTS = [
  { key: 'c', action: 'Compose new email' },
  { key: 'r', action: 'Reply to email' },
  { key: 'a', action: 'Reply all' },
  { key: 'f', action: 'Forward email' },
  { key: 'e', action: 'Archive email' },
  { key: '#', action: 'Delete / move to trash' },
  { key: 'j', action: 'Move to next email' },
  { key: 'k', action: 'Move to previous email' },
  { key: 'o', action: 'Open email' },
  { key: 'u', action: 'Go back to inbox' },
  { key: 's', action: 'Star / unstar email' },
  { key: '/', action: 'Focus search bar' },
  { key: 'Shift+I', action: 'Mark as read' },
  { key: 'Shift+U', action: 'Mark as unread' },
  { key: '?', action: 'Show keyboard shortcuts help' },
  { key: 'g then i', action: 'Go to inbox' },
  { key: 'g then s', action: 'Go to starred' },
  { key: 'g then t', action: 'Go to sent' },
  { key: 'g then d', action: 'Go to drafts' },
  { key: 'Ctrl+Enter', action: 'Send email' },
];

let scCurrentIdx = 0, scCorrect = 0, scTotal = 0, scOrder = [];

function shuffleShortcuts() {
  scOrder = GMAIL_SHORTCUTS.map((_, i) => i).sort(() => Math.random() - 0.5);
  scCurrentIdx = 0; scCorrect = 0; scTotal = 0;
}

function nextShortcutChallenge() {
  if (!scOrder.length) shuffleShortcuts();
  if (scCurrentIdx >= scOrder.length) { shuffleShortcuts(); }
  const sc = GMAIL_SHORTCUTS[scOrder[scCurrentIdx]];
  const container = document.getElementById('shortcutChallenge');
  if (!container) return;
  // Generate 4 options (1 correct + 3 random)
  const wrongIdxs = scOrder.filter((_, i) => i !== scCurrentIdx).sort(() => Math.random() - 0.5).slice(0, 3);
  const options = [scOrder[scCurrentIdx], ...wrongIdxs].sort(() => Math.random() - 0.5);
  container.innerHTML = `
    <div class="sc-question">What does <kbd>${gmailEscHtml(sc.key)}</kbd> do in Gmail?</div>
    <div class="sc-options">${options.map(idx => {
      const opt = GMAIL_SHORTCUTS[idx];
      return `<button class="gmail-quiz-opt" onclick="checkShortcut(this,${idx},${scOrder[scCurrentIdx]})">${gmailEscHtml(opt.action)}</button>`;
    }).join('')}</div>`;
  updateShortcutScore();
}

function checkShortcut(btn, chosen, correct) {
  scTotal++;
  const isCorrect = chosen === correct;
  if (isCorrect) scCorrect++;
  btn.closest('.sc-options').querySelectorAll('.gmail-quiz-opt').forEach((b, i) => {
    b.disabled = true;
    const idx = parseInt(b.getAttribute('onclick').match(/checkShortcut\(this,(\d+)/)?.[1]);
    if (idx === correct) b.classList.add('correct');
    if (b === btn && !isCorrect) b.classList.add('wrong');
  });
  playSound(isCorrect ? 'success' : 'error');
  scCurrentIdx++;
  updateShortcutScore();
  setTimeout(nextShortcutChallenge, 1200);
}

function updateShortcutScore() {
  const el = document.getElementById('shortcutScore');
  if (el) el.textContent = `${scCorrect}/${scTotal} correct`;
}

/* ═══════ EXPORT ALL INBOX ═══════ */

async function gmailExportAllInbox(format) {
  if (!gmailAccessToken) return;
  if (!(await gmailEnsureToken())) return;

  const progressEl = document.getElementById('exportAllProgress');
  const fillEl = document.getElementById('exportAllFill');
  const textEl = document.getElementById('exportAllText');
  const infoEl = document.getElementById('exportAllInfo');
  if (progressEl) progressEl.style.display = 'flex';
  if (infoEl) infoEl.textContent = 'Starting…';

  const allIds = [];
  let pageToken = null;
  const maxEmails = 3000;

  log(`💾 Exporting entire inbox (max ${maxEmails})…`, 'info');

  try {
    // Step 1: Collect all message IDs
    do {
      const p = { userId: 'me', maxResults: 500 };
      if (pageToken) p.pageToken = pageToken;
      const r = await gapi.client.gmail.users.messages.list(p);
      allIds.push(...(r.result.messages || []).map(m => m.id));
      pageToken = r.result.nextPageToken;
      if (textEl) textEl.textContent = `IDs: ${allIds.length}`;
      if (infoEl) infoEl.textContent = `Collecting message IDs… ${allIds.length} so far`;
      if (allIds.length >= maxEmails) {
        log(`⚠️ Capped at ${maxEmails} emails`, 'info');
        break;
      }
    } while (pageToken);

    if (infoEl) infoEl.textContent = `Found ${allIds.length} emails. Fetching metadata…`;
    log(`📦 Fetching metadata for ${allIds.length} emails…`, 'info');

    // Step 2: Fetch metadata
    const allEmails = [];
    for (let i = 0; i < allIds.length; i++) {
      let retries = 2;
      while (retries > 0) {
        try {
          const d = await gapi.client.gmail.users.messages.get({
            userId: 'me', id: allIds[i], format: 'metadata',
            metadataHeaders: ['From', 'To', 'Subject', 'Date']
          });
          const h = d.result.payload.headers;
          const get = n => (h.find(x => x.name === n) || {}).value || '';
          allEmails.push({
            id: allIds[i], from: get('From'), to: get('To'),
            subject: get('Subject'), date: get('Date'),
            snippet: d.result.snippet,
            unread: (d.result.labelIds || []).includes('UNREAD'),
            labels: (d.result.labelIds || []).join('; '),
            size: d.result.sizeEstimate || 0
          });
          break;
        } catch {
          retries--;
          if (retries > 0) await new Promise(r => setTimeout(r, 2000));
          else allEmails.push({ id: allIds[i], from: '', to: '', subject: '(error)', date: '', snippet: '', unread: false, labels: '', size: 0 });
        }
      }

      const pct = Math.round(((i + 1) / allIds.length) * 100);
      if (fillEl) fillEl.style.width = pct + '%';
      if (textEl) textEl.textContent = `${i + 1} / ${allIds.length}`;
      if ((i + 1) % 25 === 0) {
        if (infoEl) infoEl.textContent = `${i + 1} of ${allIds.length} emails processed…`;
        await new Promise(r => setTimeout(r, 500));
      }
    }

    // Step 3: Download
    const ts = new Date().toISOString().slice(0, 10);
    const prefix = `gmail-INBOX-${ts}`;

    if (format === 'csv') {
      const csv = 'From,To,Subject,Date,Snippet,Unread,Labels,Size\n' + allEmails.map(e => {
        const esc = s => '"' + (s || '').replace(/"/g, '""').replace(/\n/g, ' ') + '"';
        return [esc(e.from), esc(e.to), esc(e.subject), esc(e.date), esc(e.snippet), e.unread ? 'Yes' : 'No', esc(e.labels), e.size].join(',');
      }).join('\n');
      downloadFile(csv, `${prefix}.csv`, 'text/csv');
    } else if (format === 'json') {
      downloadFile(JSON.stringify(allEmails, null, 2), `${prefix}.json`, 'application/json');
    } else {
      const txt = allEmails.map((e, i) => `--- Email ${i + 1} ---\nFrom: ${e.from}\nTo: ${e.to}\nSubject: ${e.subject}\nDate: ${e.date}\nLabels: ${e.labels}\nSize: ${e.size} bytes\n\n${e.snippet}\n`).join('\n');
      downloadFile(txt, `${prefix}.txt`, 'text/plain');
    }

    if (infoEl) infoEl.textContent = `Done! Exported ${allEmails.length} emails as ${format.toUpperCase()}`;
    log(`💾 Exported ${allEmails.length} inbox emails as ${format.toUpperCase()}`, 'success');
    playSound('success');
  } catch (e) {
    log('❌ Export failed: ' + (e.message || ''), 'error');
    if (infoEl) infoEl.textContent = 'Export failed: ' + (e.message || '');
  }

  if (progressEl) progressEl.style.display = 'none';
  if (fillEl) fillEl.style.width = '0%';
}

/* ═══════ EMAIL SUMMARIZER + SMART REPLY ═══════ */

function summarizeText(text, maxSentences) {
  maxSentences = maxSentences || 2;
  if (!text) return '(no content)';
  const sentences = text.replace(/\n+/g, '. ').split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 15);
  if (!sentences.length) return text.slice(0, 200);
  // Score sentences by position + length
  const scored = sentences.map((s, i) => ({ s, score: (1 / (i + 1)) + (s.length > 50 ? 0.5 : 0) }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, maxSentences).map(x => x.s).join('. ') + '.';
}

function generateSmartReplies(subject, from) {
  const name = (from || '').replace(/<.*>/, '').replace(/"/g, '').trim().split(' ')[0] || 'there';
  const subj = (subject || '').toLowerCase();
  const replies = [];

  if (subj.includes('meeting') || subj.includes('réunion') || subj.includes('اجتماع')) {
    replies.push(`Thank you ${name}, I'll be there.`, `Sorry ${name}, I have a conflict. Can we reschedule?`, `Noted, JazakAllahu khairan.`);
  } else if (subj.includes('invoice') || subj.includes('facture') || subj.includes('payment') || subj.includes('paiement')) {
    replies.push(`Received, thank you.`, `Could you please resend the invoice? I didn't receive the attachment.`, `Payment confirmed, JazakAllahu khairan.`);
  } else if (subj.includes('question') || subj.includes('help') || subj.includes('aide')) {
    replies.push(`Hi ${name}, thanks for reaching out. I'll look into this.`, `Good question! Let me get back to you shortly.`, `JazakAllahu khairan for asking. Here's what I think...`);
  } else {
    replies.push(`Thank you ${name}, noted.`, `JazakAllahu khairan, I'll get back to you soon.`, `Hi ${name}, thanks for the update!`);
  }
  return replies;
}

// Inject summarize + reply buttons into email full view
const _origShowFull = gmailShowEmailFull;
gmailShowEmailFull = function(email) {
  _origShowFull(email);
  const container = document.getElementById('resultsContainer');
  const body = container?.querySelector('.gmail-results-body');
  if (!body) return;

  const summary = summarizeText(email.body);
  const replies = generateSmartReplies(email.subject, email.from);

  const toolbar = document.createElement('div');
  toolbar.className = 'gmail-email-toolbar';
  toolbar.innerHTML = `
    <div class="gmail-email-actions">
      <button class="btn-sm" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'">📝 Summary</button>
      <div class="gmail-summary-box" style="display:none"><p>${gmailEscHtml(summary)}</p></div>
    </div>
    <div class="gmail-email-actions">
      <button class="btn-sm" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'">💬 Smart Replies</button>
      <div class="gmail-replies-box" style="display:none">
        ${replies.map(r => `<button class="gmail-reply-btn" onclick="navigator.clipboard.writeText('${r.replace(/'/g,"\\'")}');showToast('Copied!',1000);playSound('success')">${gmailEscHtml(r)}</button>`).join('')}
      </div>
    </div>
    <button class="btn-sm" onclick="printEmail()">🖨️ PDF</button>
    ${email._msgId ? `<a class="btn-sm gmail-open-in-gmail" href="https://mail.google.com/mail/u/0/#inbox/${email._msgId}" target="_blank" rel="noopener">📧 Open in Gmail</a>` : ''}
  `;
  body.insertBefore(toolbar, body.querySelector('.gmail-email-body'));

  // Store for PDF
  window._lastEmail = email;
};

/* ═══════ EMAIL TO PDF ═══════ */

function printEmail() {
  const email = window._lastEmail;
  if (!email) return;
  const win = window.open('', '_blank');
  if (!win) { showToast('Popup blocked — allow popups for PDF', 3000); return; }
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${gmailEscHtml(email.subject)}</title>
    <style>body{font-family:Arial,sans-serif;max-width:700px;margin:40px auto;padding:20px;color:#333}
    h1{font-size:1.3rem;border-bottom:2px solid #333;padding-bottom:8px}
    .meta{color:#666;font-size:0.85rem;margin:4px 0}.body{margin-top:20px;white-space:pre-wrap;line-height:1.6}
    @media print{body{margin:20px}}</style></head><body>
    <h1>${gmailEscHtml(email.subject || '(no subject)')}</h1>
    <div class="meta"><b>From:</b> ${gmailEscHtml(email.from)}</div>
    <div class="meta"><b>To:</b> ${gmailEscHtml(email.to)}</div>
    <div class="meta"><b>Date:</b> ${gmailEscHtml(email.date)}</div>
    <div class="body">${gmailEscHtml(email.body || '')}</div>
    </body></html>`);
  win.document.close();
  setTimeout(() => { win.print(); }, 500);
}

/* ═══════ EMAIL TIMELINE ═══════ */

async function gmailBuildTimeline() {
  if (!insightGuard()) return;
  if (!gmailAccessToken) return;
  if (!(await gmailEnsureToken())) return;
  const btn = document.getElementById('timelineBtn');
  const status = document.getElementById('timelineStatus');
  const container = document.getElementById('timelineContainer');
  if (btn) btn.disabled = true;
  if (status) status.textContent = 'Scanning…';

  const monthMap = {};
  let pageToken = null, total = 0;

  try {
    do {
      const p = { userId: 'me', maxResults: 250 };
      if (pageToken) p.pageToken = pageToken;
      const r = await gapi.client.gmail.users.messages.list(p);
      const msgs = r.result.messages || [];
      pageToken = r.result.nextPageToken;

      // Batch fetch dates
      const boundary = 'batch_tl_' + Date.now();
      let batchBody = '';
      msgs.forEach((m, i) => {
        batchBody += `--${boundary}\r\nContent-Type: application/http\r\nContent-ID: <t${i}>\r\n\r\nGET /gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=Date\r\n\r\n`;
      });
      batchBody += `--${boundary}--`;

      const resp = await fetch('https://www.googleapis.com/batch/gmail/v1', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + gmailAccessToken, 'Content-Type': 'multipart/mixed; boundary=' + boundary },
        body: batchBody
      });
      const text = await resp.text();
      const rb = text.match(/^--([^\r\n]+)/)?.[1];
      if (rb) {
        text.split('--' + rb).slice(1, -1).forEach(part => {
          try {
            const json = JSON.parse(part.match(/\{[\s\S]*\}/)?.[0]);
            const dateStr = (json.payload?.headers?.find(h => h.name === 'Date') || {}).value;
            if (dateStr) {
              const d = new Date(dateStr);
              const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
              monthMap[key] = (monthMap[key] || 0) + 1;
            }
          } catch {}
        });
      }

      total += msgs.length;
      if (status) status.textContent = `${total} emails…`;
      if (total >= 1000) break;
      await new Promise(r => setTimeout(r, 300));
    } while (pageToken);

    const months = Object.entries(monthMap).sort((a, b) => a[0].localeCompare(b[0]));
    const maxVal = Math.max(...months.map(m => m[1]), 1);

    if (container) {
      container.innerHTML = `<div class="timeline-chart">${months.map(([m, c]) => {
        const pct = (c / maxVal * 100).toFixed(0);
        const label = m.split('-');
        const nextMonth = Number(label[1]) === 12 ? `${Number(label[0])+1}/01` : `${label[0]}/${String(Number(label[1])+1).padStart(2,'0')}`;
        return `<div class="timeline-bar-wrap" onclick="gmailRunSearch('after:${label[0]}/${label[1]}/01 before:${nextMonth}/01','${m}')" title="${m}: ${c} emails">
          <div class="timeline-bar" style="height:${pct}%"></div>
          <span class="timeline-label">${label[1]}/${label[0].slice(2)}</span>
        </div>`;
      }).join('')}</div>`;
    }
    log(`📈 Timeline: ${months.length} months, ${total} emails`, 'success');
    playSound('success');
  } catch (e) { log('❌ ' + (e.message || ''), 'error'); }
  if (btn) btn.disabled = false;
  insightDone();
  if (status) status.textContent = '';
}

/* ═══════ SENDER NETWORK GRAPH ═══════ */

async function gmailBuildNetwork() {
  if (!insightGuard()) return;
  if (!gmailAccessToken) return;
  if (!(await gmailEnsureToken())) return;
  const btn = document.getElementById('networkBtn');
  const container = document.getElementById('networkContainer');
  if (btn) btn.disabled = true;

  const senderMap = {};
  let pageToken = null, total = 0;

  try {
    do {
      const p = { userId: 'me', maxResults: 200 };
      if (pageToken) p.pageToken = pageToken;
      const r = await gapi.client.gmail.users.messages.list(p);
      const msgs = r.result.messages || [];
      pageToken = r.result.nextPageToken;

      const boundary = 'batch_net_' + Date.now();
      let batchBody = '';
      msgs.forEach((m, i) => {
        batchBody += `--${boundary}\r\nContent-Type: application/http\r\nContent-ID: <n${i}>\r\n\r\nGET /gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=From\r\n\r\n`;
      });
      batchBody += `--${boundary}--`;

      const resp = await fetch('https://www.googleapis.com/batch/gmail/v1', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + gmailAccessToken, 'Content-Type': 'multipart/mixed; boundary=' + boundary },
        body: batchBody
      });
      const text = await resp.text();
      const rb = text.match(/^--([^\r\n]+)/)?.[1];
      if (rb) {
        text.split('--' + rb).slice(1, -1).forEach(part => {
          try {
            const json = JSON.parse(part.match(/\{[\s\S]*\}/)?.[0]);
            const from = (json.payload?.headers?.find(h => h.name === 'From') || {}).value || '';
            const emailMatch = from.match(/<([^>]+)>/);
            const email = emailMatch ? emailMatch[1].toLowerCase() : from.toLowerCase().trim();
            const nameMatch = from.match(/^"?([^"<]+)"?\s*</);
            const name = nameMatch ? nameMatch[1].trim() : email.split('@')[0];
            if (email && email.includes('@')) {
              if (!senderMap[email]) senderMap[email] = { name, count: 0 };
              senderMap[email].count++;
            }
          } catch {}
        });
      }

      total += msgs.length;
      if (total >= 500) break;
      await new Promise(r => setTimeout(r, 300));
    } while (pageToken);

    const senders = Object.entries(senderMap).sort((a, b) => b[1].count - a[1].count).slice(0, 20);
    const maxC = senders[0]?.[1].count || 1;
    const cx = 200, cy = 200, r = 150;

    if (container) {
      let svg = `<svg viewBox="0 0 400 400" style="width:100%;max-height:400px">`;
      svg += `<circle cx="${cx}" cy="${cy}" r="24" fill="var(--accent)" opacity="0.3"/>`;
      svg += `<text x="${cx}" y="${cy+4}" text-anchor="middle" fill="var(--text)" font-size="10" font-weight="700">YOU</text>`;

      senders.forEach(([email, data], i) => {
        const angle = (i / senders.length) * Math.PI * 2 - Math.PI / 2;
        const dist = r - (data.count / maxC) * 40;
        const x = cx + Math.cos(angle) * dist;
        const y = cy + Math.sin(angle) * dist;
        const size = 8 + (data.count / maxC) * 16;
        const opacity = 0.3 + (data.count / maxC) * 0.7;
        const lineW = 1 + (data.count / maxC) * 3;

        svg += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="var(--accent)" stroke-width="${lineW}" opacity="${opacity * 0.4}"/>`;
        svg += `<circle cx="${x}" cy="${y}" r="${size}" fill="var(--accent)" opacity="${opacity}" onclick="gmailRunSearch('from:${email}','From: ${data.name}')" style="cursor:pointer"><title>${data.name} (${data.count})</title></circle>`;
        svg += `<text x="${x}" y="${y + size + 12}" text-anchor="middle" fill="var(--text-muted)" font-size="7">${data.name.slice(0, 12)}</text>`;
      });

      svg += `</svg>`;
      container.innerHTML = svg;
    }
    log(`🕸️ Network: ${senders.length} top senders from ${total} emails`, 'success');
    playSound('success');
  } catch (e) { log('❌ ' + (e.message || ''), 'error'); }
  if (btn) btn.disabled = false;
  insightDone();
}

/* ═══════ DUPLICATE FINDER ═══════ */

async function gmailFindDuplicates() {
  if (!insightGuard()) return;
  if (!gmailAccessToken) return;
  if (!(await gmailEnsureToken())) return;
  const btn = document.getElementById('dupeBtn');
  const status = document.getElementById('dupeStatus');
  const container = document.getElementById('dupeContainer');
  if (btn) btn.disabled = true;
  if (status) status.textContent = 'Scanning…';

  const subjectMap = {};
  let pageToken = null, total = 0;

  try {
    do {
      const p = { userId: 'me', maxResults: 200 };
      if (pageToken) p.pageToken = pageToken;
      const r = await gapi.client.gmail.users.messages.list(p);
      const msgs = r.result.messages || [];
      pageToken = r.result.nextPageToken;

      const boundary = 'batch_dup_' + Date.now();
      let batchBody = '';
      msgs.forEach((m, i) => {
        batchBody += `--${boundary}\r\nContent-Type: application/http\r\nContent-ID: <d${i}>\r\n\r\nGET /gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date\r\n\r\n`;
      });
      batchBody += `--${boundary}--`;

      const resp = await fetch('https://www.googleapis.com/batch/gmail/v1', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + gmailAccessToken, 'Content-Type': 'multipart/mixed; boundary=' + boundary },
        body: batchBody
      });
      const text = await resp.text();
      const rb = text.match(/^--([^\r\n]+)/)?.[1];
      if (rb) {
        text.split('--' + rb).slice(1, -1).forEach(part => {
          try {
            const json = JSON.parse(part.match(/\{[\s\S]*\}/)?.[0]);
            const h = json.payload?.headers || [];
            const subj = (h.find(x => x.name === 'Subject') || {}).value || '';
            const from = (h.find(x => x.name === 'From') || {}).value || '';
            const key = subj.toLowerCase().replace(/^(re|fwd|fw):\s*/gi, '').trim();
            if (key.length > 3) {
              if (!subjectMap[key]) subjectMap[key] = [];
              subjectMap[key].push({ id: json.id, subject: subj, from: from.replace(/<.*>/, '').trim(), date: (h.find(x => x.name === 'Date') || {}).value });
            }
          } catch {}
        });
      }

      total += msgs.length;
      if (status) status.textContent = `${total} emails…`;
      if (total >= 500) break;
      await new Promise(r => setTimeout(r, 300));
    } while (pageToken);

    const dupes = Object.entries(subjectMap).filter(([, v]) => v.length > 2).sort((a, b) => b[1].length - a[1].length).slice(0, 20);

    if (container) {
      if (!dupes.length) {
        container.innerHTML = '<p style="text-align:center;opacity:0.5;padding:12px">No duplicates found</p>';
      } else {
        container.innerHTML = dupes.map(([subj, emails]) => `
          <div class="gmail-dupe-group">
            <div class="gmail-dupe-header" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'">
              <span class="gmail-dupe-count">${emails.length}x</span>
              <span class="gmail-dupe-subject">${gmailEscHtml(emails[0].subject || subj)}</span>
            </div>
            <div class="gmail-dupe-list" style="display:none">
              ${emails.map(e => `<div class="gmail-dupe-item" onclick="gmailHandleRead('${e.id}')"><span>${gmailEscHtml(e.from)}</span><span class="att-time">${gmailFormatDate(e.date)}</span></div>`).join('')}
            </div>
          </div>
        `).join('');
      }
    }
    log(`🔄 Duplicates: ${dupes.length} groups found in ${total} emails`, 'success');
    playSound('success');
  } catch (e) { log('❌ ' + (e.message || ''), 'error'); }
  if (btn) btn.disabled = false;
  insightDone();
  if (status) status.textContent = '';
}

/* ═══════ AUTO-CATEGORIZER ═══════ */

async function gmailAutoCategorize() {
  if (!insightGuard()) return;
  if (!gmailAccessToken) return;
  if (!(await gmailEnsureToken())) return;
  const btn = document.getElementById('catBtn');
  const status = document.getElementById('catStatus');
  const container = document.getElementById('catContainer');
  if (btn) btn.disabled = true;
  if (status) status.textContent = 'Analyzing…';

  const categories = {
    'Invoices & Payments': { keywords: ['invoice','facture','payment','paiement','receipt','reçu','billing','montant','total','€','$'], emails: [] },
    'Newsletters': { keywords: ['unsubscribe','désabonner','newsletter','mailing','digest','weekly','update'], emails: [] },
    'Social & Notifications': { keywords: ['notification','alert','liked','commented','shared','followed','invitation','invited'], emails: [] },
    'Meetings & Calendar': { keywords: ['meeting','réunion','calendar','agenda','schedule','invitation','join','zoom','meet','teams'], emails: [] },
    'Job & Career': { keywords: ['job','emploi','career','position','candidature','resume','cv','interview','entretien','hiring'], emails: [] },
    'Shopping & Orders': { keywords: ['order','commande','shipping','livraison','tracking','delivery','purchase','achat','cart','panier'], emails: [] },
  };

  let pageToken = null, total = 0;

  try {
    do {
      const p = { userId: 'me', maxResults: 200 };
      if (pageToken) p.pageToken = pageToken;
      const r = await gapi.client.gmail.users.messages.list(p);
      const msgs = r.result.messages || [];
      pageToken = r.result.nextPageToken;

      const boundary = 'batch_cat_' + Date.now();
      let batchBody = '';
      msgs.forEach((m, i) => {
        batchBody += `--${boundary}\r\nContent-Type: application/http\r\nContent-ID: <c${i}>\r\n\r\nGET /gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject\r\n\r\n`;
      });
      batchBody += `--${boundary}--`;

      const resp = await fetch('https://www.googleapis.com/batch/gmail/v1', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + gmailAccessToken, 'Content-Type': 'multipart/mixed; boundary=' + boundary },
        body: batchBody
      });
      const text = await resp.text();
      const rb = text.match(/^--([^\r\n]+)/)?.[1];
      if (rb) {
        text.split('--' + rb).slice(1, -1).forEach(part => {
          try {
            const json = JSON.parse(part.match(/\{[\s\S]*\}/)?.[0]);
            const h = json.payload?.headers || [];
            const subj = ((h.find(x => x.name === 'Subject') || {}).value || '').toLowerCase();
            const from = ((h.find(x => x.name === 'From') || {}).value || '').toLowerCase();
            const snippet = (json.snippet || '').toLowerCase();
            const combined = subj + ' ' + from + ' ' + snippet;

            for (const [cat, data] of Object.entries(categories)) {
              if (data.keywords.some(kw => combined.includes(kw))) {
                data.emails.push({ subject: (h.find(x => x.name === 'Subject') || {}).value, from: (h.find(x => x.name === 'From') || {}).value });
                break;
              }
            }
          } catch {}
        });
      }

      total += msgs.length;
      if (status) status.textContent = `${total} emails…`;
      if (total >= 500) break;
      await new Promise(r => setTimeout(r, 300));
    } while (pageToken);

    const results = Object.entries(categories).filter(([, d]) => d.emails.length > 0).sort((a, b) => b[1].emails.length - a[1].emails.length);

    if (container) {
      container.innerHTML = results.map(([cat, data]) => `
        <div class="gmail-cat-group">
          <div class="gmail-dupe-header" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'">
            <span class="gmail-dupe-count">${data.emails.length}</span>
            <span>${cat}</span>
          </div>
          <div class="gmail-dupe-list" style="display:none">
            ${data.emails.slice(0, 10).map(e => `<div class="gmail-dupe-item"><span>${gmailEscHtml((e.from || '').replace(/<.*>/, '').trim())}</span><span class="att-time">${gmailEscHtml(e.subject || '')}</span></div>`).join('')}
            ${data.emails.length > 10 ? `<p style="opacity:0.5;font-size:0.75rem;padding:4px">...and ${data.emails.length - 10} more</p>` : ''}
          </div>
        </div>
      `).join('');
    }
    log(`🏷️ Categorized ${total} emails into ${results.length} groups`, 'success');
    playSound('success');
  } catch (e) { log('❌ ' + (e.message || ''), 'error'); }
  if (btn) btn.disabled = false;
  insightDone();
  if (status) status.textContent = '';
}

/* ═══════ SHARE SEARCH + QR CODE ═══════ */

function generateShareLink() {
  const input = document.getElementById('shareSearchInput');
  const result = document.getElementById('shareResult');
  const query = (input?.value || gmailLastQuery || '').trim();
  if (!query) { showToast('Enter a search query', 1500); return; }
  const url = `${location.origin}${location.pathname}?q=${encodeURIComponent(query)}`;
  if (result) {
    result.innerHTML = `<input class="gmail-filter-input" value="${url}" style="width:100%" onclick="this.select()" readonly />`;
  }
  navigator.clipboard.writeText(url).then(() => showToast('Link copied!', 1200));
  playSound('success');
}

function generateQRCode() {
  const input = document.getElementById('shareSearchInput');
  const result = document.getElementById('shareResult');
  const query = (input?.value || gmailLastQuery || '').trim();
  if (!query) { showToast('Enter a search query', 1500); return; }
  const url = `${location.origin}${location.pathname}?q=${encodeURIComponent(query)}`;
  // Use Google Charts API for QR
  const qrUrl = `https://chart.googleapis.com/chart?cht=qr&chs=200x200&chl=${encodeURIComponent(url)}`;
  if (result) {
    result.innerHTML = `<div style="text-align:center"><img src="${qrUrl}" alt="QR Code" style="border-radius:8px;margin:8px 0" /><p style="font-size:0.72rem;opacity:0.5">Scan to open this search</p></div>`;
  }
  playSound('success');
}

// Auto-run search from URL query param
function checkUrlQuery() {
  const params = new URLSearchParams(location.search);
  const q = params.get('q');
  if (q && gmailAccessToken) {
    setTimeout(() => gmailRunSearch(q, q.slice(0, 40)), 1000);
  }
}

/* ═══════ DIFF VIEWER ═══════ */

async function gmailDiffEmails() {
  const id1 = document.getElementById('diffId1')?.value.trim();
  const id2 = document.getElementById('diffId2')?.value.trim();
  const container = document.getElementById('diffContainer');
  if (!id1 || !id2) { showToast('Enter two email IDs', 2000); return; }
  if (!gmailAccessToken) return;
  if (!(await gmailEnsureToken())) return;

  try {
    const [e1, e2] = await Promise.all([gmailReadMessage(id1), gmailReadMessage(id2)]);
    if (container) {
      container.innerHTML = `
        <div class="gmail-diff">
          <div class="gmail-diff-col">
            <h4>Email 1</h4>
            <div class="gmail-diff-meta"><b>From:</b> ${gmailEscHtml(e1.from)}</div>
            <div class="gmail-diff-meta"><b>Subject:</b> ${gmailEscHtml(e1.subject)}</div>
            <div class="gmail-diff-meta"><b>Date:</b> ${gmailFormatDate(e1.date)}</div>
            <pre class="gmail-diff-body">${gmailEscHtml(e1.body || '(empty)')}</pre>
          </div>
          <div class="gmail-diff-col">
            <h4>Email 2</h4>
            <div class="gmail-diff-meta"><b>From:</b> ${gmailEscHtml(e2.from)}</div>
            <div class="gmail-diff-meta"><b>Subject:</b> ${gmailEscHtml(e2.subject)}</div>
            <div class="gmail-diff-meta"><b>Date:</b> ${gmailFormatDate(e2.date)}</div>
            <pre class="gmail-diff-body">${gmailEscHtml(e2.body || '(empty)')}</pre>
          </div>
        </div>`;
    }
    playSound('success');
  } catch (e) { log('❌ Diff failed: ' + (e.message || ''), 'error'); }
}

/* ═══════ MBOX VIEWER ═══════ */

let mboxEmails = [];
let mboxFiltered = [];

async function mboxLoadFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  const status = document.getElementById('mboxStatus');
  const info = document.getElementById('mboxInfo');
  if (status) status.textContent = 'Loading…';
  if (info) info.textContent = `Reading ${file.name} (${(file.size / 1048576).toFixed(1)} MB)…`;
  log(`📦 Loading MBOX: ${file.name} (${(file.size / 1048576).toFixed(1)} MB)`, 'info');

  // Read in chunks for large files
  const CHUNK_SIZE = 50 * 1024 * 1024; // 50MB chunks
  if (file.size <= CHUNK_SIZE) {
    const reader = new FileReader();
    reader.onload = function(e) {
      mboxFinishLoad(e.target.result, file.name, status, info);
    };
    reader.onerror = () => mboxReadError(status, info);
    reader.readAsText(file);
  } else {
    // Large file: read as text with streaming
    if (info) info.textContent = `Large file (${(file.size / 1048576).toFixed(0)} MB) — reading…`;
    try {
      const text = await file.text();
      mboxFinishLoad(text, file.name, status, info);
    } catch (e) {
      mboxReadError(status, info);
    }
  }
  event.target.value = '';
}

function mboxFinishLoad(text, fileName, status, info) {
  mboxEmails = parseMbox(text);
  mboxFiltered = mboxEmails;
  if (status) status.textContent = '';
  if (info) info.textContent = `✅ ${mboxEmails.length} emails loaded from ${fileName}`;
  log(`📦 Parsed ${mboxEmails.length} emails from MBOX`, 'success');
  playSound('success');
  const searchBar = document.getElementById('mboxSearchBar');
  if (searchBar) searchBar.style.display = '';
  mboxDisplayed = 100;
  mboxRenderList(mboxEmails.slice(0, 100));
  mboxUpdateCount(mboxEmails.length);
}

function mboxReadError(status, info) {
  if (status) status.textContent = '';
  if (info) info.textContent = '❌ Failed to read file. Try a smaller file or different browser.';
  log('❌ Failed to read MBOX file', 'error');
}

function parseMbox(text) {
  const emails = [];
  // Split by "From " at start of line (MBOX format)
  const rawMessages = text.split(/\n(?=From )/);

  for (const raw of rawMessages) {
    if (!raw.trim()) continue;

    // Split headers from body (first blank line)
    const blankLineIdx = raw.search(/\n\n|\r\n\r\n/);
    if (blankLineIdx === -1) continue;

    const headerBlock = raw.substring(0, blankLineIdx);
    let body = raw.substring(blankLineIdx + 2).trim();

    // Parse headers
    const getHeader = (name) => {
      const regex = new RegExp(`^${name}:\\s*(.+)`, 'im');
      const match = headerBlock.match(regex);
      return match ? match[1].trim() : '';
    };

    const from = getHeader('From');
    const to = getHeader('To');
    const subject = getHeader('Subject');
    const date = getHeader('Date');
    const contentType = getHeader('Content-Type');

    // Decode quoted-printable subject
    let decodedSubject = subject;
    if (subject.includes('=?')) {
      try {
        decodedSubject = subject.replace(/=\?([^?]+)\?([BbQq])\?([^?]+)\?=/g, (_, charset, encoding, encoded) => {
          if (encoding.toUpperCase() === 'B') {
            return decodeBase64Utf8(encoded);
          } else {
            return encoded.replace(/=([0-9A-Fa-f]{2})/g, (__, hex) => String.fromCharCode(parseInt(hex, 16))).replace(/_/g, ' ');
          }
        });
      } catch { decodedSubject = subject; }
    }

    // Extract plain text body from multipart
    if (contentType.includes('multipart')) {
      const boundaryMatch = contentType.match(/boundary="?([^";\s]+)"?/);
      if (boundaryMatch) {
        const boundary = boundaryMatch[1];
        const parts = body.split('--' + boundary);
        for (const part of parts) {
          if (part.includes('Content-Type: text/plain') || part.includes('content-type: text/plain')) {
            const partBody = part.split(/\n\n|\r\n\r\n/).slice(1).join('\n\n');
            if (partBody.trim()) {
              body = partBody.trim();
              break;
            }
          }
        }
      }
    }

    // Decode quoted-printable body
    if (body.includes('=\n') || body.includes('=0D') || body.includes('=20')) {
      body = body.replace(/=\r?\n/g, '').replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
    }

    // Decode base64 body
    if (headerBlock.toLowerCase().includes('content-transfer-encoding: base64') || body.match(/^[A-Za-z0-9+/=\s]+$/)) {
      try {
        const cleaned = body.replace(/\s/g, '');
        if (cleaned.length > 20 && /^[A-Za-z0-9+/=]+$/.test(cleaned)) {
          body = decodeBase64Utf8(cleaned);
        }
      } catch {}
    }

    // Clean up body
    body = body.replace(/\r\n/g, '\n').trim();
    if (body.length > 10000) body = body.substring(0, 10000) + '\n...(truncated)';

    const snippet = body.replace(/\n+/g, ' ').substring(0, 200);

    emails.push({
      from, to, subject: decodedSubject, date, body, snippet,
      labels: getHeader('X-Gmail-Labels'),
      id: 'mbox-' + emails.length
    });
  }

  return emails;
}

function mboxRunSearch() {
  const raw = (document.getElementById('mboxSearch')?.value || '').trim();
  if (!raw) { mboxShowAll(); return; }

  const useRegex = document.getElementById('mboxRegex')?.checked;
  const caseSensitive = document.getElementById('mboxCaseSensitive')?.checked;
  const query = caseSensitive ? raw : raw.toLowerCase();

  if (useRegex) {
    // Regex mode: also support /pattern/flags syntax
    let regex;
    try {
      const regexMatch = raw.match(/^\/(.+)\/([gimsuy]*)$/);
      if (regexMatch) {
        regex = new RegExp(regexMatch[1], regexMatch[2]);
      } else {
        regex = new RegExp(raw, caseSensitive ? '' : 'i');
      }
    } catch (e) {
      showToast('Invalid regex: ' + e.message, 3000);
      log(`❌ Invalid regex: ${e.message}`, 'error');
      return;
    }

    mboxFiltered = mboxEmails.filter(e => {
      const haystack = `${e.from} ${e.to} ${e.subject} ${e.snippet} ${e.labels} ${e.body}`;
      return regex.test(haystack);
    });
    log(`📦 MBOX regex /${raw}/: ${mboxFiltered.length} results`, 'info');
  } else {
    // Keyword mode: comma-separated multi-search
    const terms = query.includes(',') ? query.split(',').map(t => t.trim()).filter(Boolean) : [query];

    mboxFiltered = mboxEmails.filter(e => {
      const haystack = caseSensitive
        ? `${e.from} ${e.to} ${e.subject} ${e.snippet} ${e.labels}`
        : `${e.from} ${e.to} ${e.subject} ${e.snippet} ${e.labels}`.toLowerCase();
      return terms.some(term => haystack.includes(term));
    });
    log(`📦 MBOX search "${query}": ${mboxFiltered.length} results`, 'info');
  }

  mboxDisplayed = 100;
  mboxRenderList(mboxFiltered.slice(0, 100));
  mboxUpdateCount(mboxFiltered.length);
}

function mboxShowAll() {
  mboxFiltered = mboxEmails;
  mboxRenderList(mboxEmails.slice(0, 100));
  mboxUpdateCount(mboxEmails.length);
}

function mboxUpdateCount(n) {
  const el = document.getElementById('mboxCount');
  if (el) el.textContent = `${n} email${n !== 1 ? 's' : ''}`;
}

function mboxRenderList(emails) {
  const container = document.getElementById('mboxResults');
  if (!container) return;
  if (!emails.length) {
    container.innerHTML = '<p style="text-align:center;opacity:0.4;padding:12px">No emails found</p>';
    return;
  }
  container.innerHTML = emails.map((e, i) => {
    const from = gmailEscHtml((e.from || '').replace(/<.*>/, '').trim());
    return `<div class="gmail-email" onclick="mboxReadEmail(${i})" style="cursor:pointer">
      <div class="gmail-email-from">${from}</div>
      <div class="gmail-email-subject">${gmailEscHtml(e.subject || '(no subject)')}</div>
      <div class="gmail-email-snippet">${gmailEscHtml(e.snippet)}</div>
      <div class="gmail-email-date">${gmailFormatDate(e.date)}${e.labels ? ' · <span style="opacity:0.5">' + gmailEscHtml(e.labels) + '</span>' : ''}</div>
    </div>`;
  }).join('');

  if (emails.length < mboxFiltered.length) {
    container.insertAdjacentHTML('beforeend', `<button class="gmail-load-more" onclick="mboxLoadMore()">Show more (${mboxFiltered.length - emails.length} remaining)…</button>`);
  }
}

let mboxDisplayed = 100;

function mboxLoadMore() {
  mboxDisplayed += 100;
  mboxRenderList(mboxFiltered.slice(0, mboxDisplayed));
}

function mboxReadEmail(idx) {
  const email = mboxFiltered[idx];
  if (!email) return;
  const container = document.getElementById('mboxResults');
  if (!container) return;

  const summary = summarizeText(email.body);
  const replies = generateSmartReplies(email.subject, email.from);

  container.innerHTML = `
    <div class="gmail-results" style="border:none;box-shadow:none">
      <div class="gmail-results-header">
        <span class="gmail-results-title">📖 ${gmailEscHtml(email.subject || '(no subject)')}</span>
        <button class="gmail-results-close" onclick="mboxRenderList(mboxFiltered.slice(0,${mboxDisplayed}))">✕</button>
      </div>
      <div class="gmail-results-body">
        <div><b>From:</b> ${gmailEscHtml(email.from)}</div>
        <div><b>To:</b> ${gmailEscHtml(email.to)}</div>
        <div><b>Date:</b> ${gmailFormatDate(email.date)}</div>
        ${email.labels ? `<div><b>Labels:</b> ${gmailEscHtml(email.labels)}</div>` : ''}
        <div class="gmail-email-toolbar">
          <div class="gmail-email-actions">
            <button class="btn-sm" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'">📝 Summary</button>
            <div class="gmail-summary-box" style="display:none"><p>${gmailEscHtml(summary)}</p></div>
          </div>
          <div class="gmail-email-actions">
            <button class="btn-sm" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'">💬 Smart Replies</button>
            <div class="gmail-replies-box" style="display:none">
              ${replies.map(r => `<button class="gmail-reply-btn" onclick="navigator.clipboard.writeText('${r.replace(/'/g,"\\'")}');showToast('Copied!',1000)">${gmailEscHtml(r)}</button>`).join('')}
            </div>
          </div>
          <button class="btn-sm" onclick="window._lastEmail={from:'${gmailEscHtml(email.from).replace(/'/g,"\\'")}',to:'${gmailEscHtml(email.to).replace(/'/g,"\\'")}',subject:'${gmailEscHtml(email.subject).replace(/'/g,"\\'")}',date:'${email.date}',body:mboxFiltered[${idx}].body};printEmail()">🖨️ PDF</button>
        </div>
        <div class="gmail-email-body">${gmailEscHtml(email.body)}</div>
      </div>
    </div>
  `;
}

function mboxExport(format) {
  if (!mboxFiltered.length) { showToast('No emails to export', 1500); return; }
  const ts = new Date().toISOString().slice(0, 10);
  const prefix = `mbox-export-${ts}`;

  if (format === 'csv') {
    const csv = 'From,To,Subject,Date,Labels,Snippet\n' + mboxFiltered.map(e => {
      const esc = s => '"' + (s || '').replace(/"/g, '""').replace(/\n/g, ' ') + '"';
      return [esc(e.from), esc(e.to), esc(e.subject), esc(e.date), esc(e.labels), esc(e.snippet)].join(',');
    }).join('\n');
    downloadFile(csv, `${prefix}.csv`, 'text/csv');
  } else if (format === 'json') {
    downloadFile(JSON.stringify(mboxFiltered.map(e => ({
      from: e.from, to: e.to, subject: e.subject, date: e.date, labels: e.labels, body: e.body
    })), null, 2), `${prefix}.json`, 'application/json');
  } else {
    const txt = mboxFiltered.map((e, i) =>
      `════ Email ${i + 1} ════\nFrom: ${e.from}\nTo: ${e.to}\nSubject: ${e.subject}\nDate: ${e.date}\nLabels: ${e.labels}\n────\n${e.body}\n`
    ).join('\n\n');
    downloadFile(txt, `${prefix}.txt`, 'text/plain');
  }
  log(`📦 MBOX exported ${mboxFiltered.length} emails as ${format.toUpperCase()}`, 'success');
}

/* ═══════ TOOLS PANEL ═══════ */

function initToolsResize() {
  const handle = document.getElementById('toolsResizeHandle');
  const panel = document.getElementById('toolsPanel');
  if (!handle || !panel) return;
  let dragging = false, startX, startW;
  const isRtl = () => document.documentElement.dir === 'rtl';

  handle.addEventListener('mousedown', e => {
    dragging = true; startX = e.clientX; startW = panel.offsetWidth;
    handle.classList.add('active');
    document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none';
    e.preventDefault();
  });
  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    const dx = isRtl() ? (e.clientX - startX) : (startX - e.clientX);
    const newW = Math.max(250, Math.min(startW + dx, window.innerWidth * 0.85));
    panel.style.width = newW + 'px';
  });
  document.addEventListener('mouseup', () => {
    if (!dragging) return; dragging = false;
    handle.classList.remove('active');
    document.body.style.cursor = ''; document.body.style.userSelect = '';
    try { localStorage.setItem('gmail-tools-width', panel.style.width); } catch {}
  });

  // Touch support
  handle.addEventListener('touchstart', e => {
    dragging = true; startX = e.touches[0].clientX; startW = panel.offsetWidth;
    handle.classList.add('active');
  }, { passive: true });
  document.addEventListener('touchmove', e => {
    if (!dragging) return;
    const dx = isRtl() ? (e.touches[0].clientX - startX) : (startX - e.touches[0].clientX);
    const newW = Math.max(250, Math.min(startW + dx, window.innerWidth * 0.85));
    panel.style.width = newW + 'px';
  }, { passive: true });
  document.addEventListener('touchend', () => {
    if (!dragging) return; dragging = false; handle.classList.remove('active');
    try { localStorage.setItem('gmail-tools-width', panel.style.width); } catch {}
  });

  // Restore saved width
  try {
    const saved = localStorage.getItem('gmail-tools-width');
    if (saved) panel.style.width = saved;
  } catch {}
}

function openTools() {
  const sb = document.getElementById('toolsPanel');
  const ov = document.getElementById('toolsOverlay');
  if (sb) sb.classList.add('open');
  if (ov) ov.classList.add('open');
  playSound('click');
}

function closeTools() {
  const sb = document.getElementById('toolsPanel');
  const ov = document.getElementById('toolsOverlay');
  if (sb) sb.classList.remove('open');
  if (ov) ov.classList.remove('open');
}

function showToolsTab(tab) {
  document.querySelectorAll('[data-tooltab]').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tools-content').forEach(c => c.classList.remove('active'));
  const btn = document.querySelector(`[data-tooltab="${tab}"]`);
  const content = document.getElementById('tools' + tab.charAt(0).toUpperCase() + tab.slice(1));
  if (btn) btn.classList.add('active');
  if (content) content.classList.add('active');
}

// Show setup guide only on first visit (no client ID)
function checkFirstVisit() {
  const clientId = localStorage.getItem('gmail-lab-client-id');
  const guide = document.getElementById('setupGuide');
  if (guide) guide.style.display = clientId ? 'none' : 'block';
}

/* ═══════ OFFLINE HANDLING ═══════ */

function gmailCheckOnline() {
  const container = document.getElementById('resultsContainer');
  if (!navigator.onLine) {
    if (container) container.innerHTML = '<div class="gmail-offline-banner">📡 You are offline. Gmail features require an internet connection.</div>';
    gmailEnableButtons(false);
    setStatus(false);
    log('📡 Offline — no internet connection', 'error');
    return false;
  }
  return true;
}

window.addEventListener('online', () => {
  log('📡 Back online!', 'success');
  gmailEnableButtons(!!gmailAccessToken);
  if (gmailAccessToken) setStatus(true);
  const banner = document.querySelector('.gmail-offline-banner');
  if (banner) banner.remove();
});

window.addEventListener('offline', () => {
  gmailCheckOnline();
});

/* ═══════ INIT ═══════ */

gmailBuildExamples();
loadSearchHistory();
renderHistory();
renderGmailQuiz();
loadTemplates();
renderTemplates();
showRandomTip();
shuffleShortcuts();
nextShortcutChallenge();
checkFirstVisit();

// Tools panel
const toolsCloseBtn = document.getElementById('toolsCloseBtn');
const toolsOverlay = document.getElementById('toolsOverlay');
if (toolsCloseBtn) toolsCloseBtn.onclick = closeTools;
if (toolsOverlay) toolsOverlay.onclick = closeTools;
initToolsResize();

gmailRenderAuth();
checkUrlQuery();
if (gmailCheckOnline()) {
  log('📧 Gmail Lab ready — connect your Google account!', 'success');
}
