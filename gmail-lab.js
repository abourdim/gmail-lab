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
  if (ci) ci.disabled = !enabled;
  if (cs) cs.disabled = !enabled;
}

function gmailEscHtml(s) {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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
      <div class="gmail-profile-row">
        ${gmailUserProfile.picture
          ? `<img class="gmail-avatar" src="${gmailUserProfile.picture}" alt="avatar"/>`
          : `<div class="gmail-avatar-placeholder">${initial}</div>`}
        <div class="gmail-profile-info">
          <div class="gmail-profile-name">${gmailEscHtml(gmailUserProfile.name || 'Gmail User')}</div>
          <div class="gmail-profile-email">${gmailEscHtml(gmailUserProfile.email)}</div>
          <div class="gmail-profile-stats" id="gmailStats">Loading stats…</div>
        </div>
      </div>
      <div style="margin-top:0.6rem;text-align:right">
        <button class="gmail-signout-btn" onclick="gmailSignOut()">Sign Out</button>
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
    log('🟢 Ready — click "Sign in with Google"', 'info');
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
  } catch (e) {
    log('⚠️ Could not load stats: ' + (e.message || ''), 'error');
  }
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
  log('📥 Found ' + messages.length + ' messages', 'rx');

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
  return { emails: detailed, nextPageToken };
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

function gmailShowEmailList(title, emails, query, nextPageToken) {
  const container = document.getElementById('resultsContainer');
  gmailTotalLoaded = emails.length;
  const unreadCount = emails.filter(e => e.unread).length;
  const statsText = `${emails.length} result${emails.length !== 1 ? 's' : ''}${unreadCount ? ` · ${unreadCount} unread` : ''}`;

  let html = `<div class="gmail-results">
    <div class="gmail-results-header">
      <span class="gmail-results-title">📨 ${gmailEscHtml(title)}</span>
      <span class="gmail-results-stats" id="resultsStats">${statsText}</span>
      <button class="gmail-results-close" onclick="this.closest('.gmail-results').remove()">✕</button>
    </div><div class="gmail-results-body">`;

  if (!emails.length) {
    html += '<p style="text-align:center;opacity:0.5;padding:1rem">No emails found.</p>';
  } else {
    for (const e of emails) {
      const from = gmailEscHtml(e.from.replace(/<.*>/, '').trim() || e.from);
      html += `<div class="gmail-email ${e.unread ? 'unread' : ''}" onclick="gmailHandleRead('${e.id}')">
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
      for (const e of result.emails) {
        const from = gmailEscHtml(e.from.replace(/<.*>/, '').trim() || e.from);
        body.insertAdjacentHTML('beforeend', `<div class="gmail-email ${e.unread ? 'unread' : ''}" onclick="gmailHandleRead('${e.id}')">
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
    const statsEl = document.getElementById('resultsStats');
    if (statsEl) statsEl.textContent = `${gmailTotalLoaded} results loaded`;
    log(`📊 +${result.emails.length} loaded (${gmailTotalLoaded} total)`, 'info');
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
    gmailShowEmailList(title, result.emails, query, result.nextPageToken);
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
  const val = (input && input.value || '').trim();
  if (!val || gmailIsLoading || !gmailAccessToken) return;
  gmailRunSearch(val, val.slice(0, 40) + (val.length > 40 ? '…' : ''));
  input.value = '';
}

/* ═══════ EXAMPLE BUTTONS ═══════ */

const GMAIL_EXAMPLES = [
  { icon: '📬', label: 'Show my unread emails', query: 'is:unread', tip: 'is:unread' },
  { icon: '🔍', label: 'Find emails from someone', query: null, tip: 'from:email', askInput: true, askPrompt: 'Enter email address or name:' },
  { icon: '📖', label: 'Read my latest email', query: null, tip: 'Reads newest message', special: 'latest' },
  { icon: '📋', label: 'Search by subject', query: null, tip: 'subject:keyword', askInput: true, askPrompt: 'Enter subject keyword:', prefix: 'subject:' },
  { icon: '📎', label: 'Emails with attachments', query: 'has:attachment newer_than:7d', tip: 'has:attachment' },
  { icon: '⭐', label: 'Starred emails', query: 'is:starred', tip: 'is:starred' },
  { icon: '✉️', label: 'Sent emails', query: 'in:sent', tip: 'in:sent' },
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

      if (ex.askInput) {
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
gmailRenderAuth();
if (gmailCheckOnline()) {
  log('📧 Gmail Lab ready — connect your Google account!', 'success');
}
