'use strict
process.on('uncaughtException', (e) => { console.error('CRASH:', e && e.stack || e); process.exit(1); });
process.on('unhandledRejection', (e) => { console.error('REJECT:', e && e.stack || e); process.exit(1); });
// ============================================================
//  BLOCKY SHOOTER — server.js
//  Same structure as the Island Reels server, adapted to the
//  shooter game. Serves index.html + accounts + scores.
//  Run: node server.js  →  http://localhost:3000
// ============================================================

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');
const CLIENT_DIR = __dirname;
const ADMIN_NAME = process.env.ADMIN_USER || 'Just_12yrs_old';

// ---------- persistence ----------
let DB = { users: {}, sessions: {} };
let savePending = null;

function loadDB() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      DB = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      DB.users = DB.users || {};
      DB.sessions = DB.sessions || {};
    }
  } catch (e) { console.error('load failed:', e.message); }
}

function saveDB() {
  clearTimeout(savePending);
  savePending = setTimeout(saveDBNow, 300);
}

function saveDBNow() {
  clearTimeout(savePending);
  try {
    const tmp = DATA_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(DB));
    fs.renameSync(tmp, DATA_FILE);
  } catch (e) { console.error('save failed:', e.message); }
}

// ---------- auth ----------
function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function makeUser(username, password) {
  const salt = crypto.randomBytes(16).toString('hex');
  return {
    username,
    salt,
    hash: hashPassword(password, salt),
    createdAt: Date.now(),
    lastSeen: Date.now(),
    lastSave: null,
    // ---- shooter stats ----
    highScore: 0,
    totalKills: 0,
    gamesPlayed: 0,
    // -------------------------
    rank: 'Recruit',
    isBanned: false,
    isAdmin: username === ADMIN_NAME,
  };
}

function publicUser(u) {
  return {
    username: u.username,
    highScore: u.highScore || 0,
    totalKills: u.totalKills || 0,
    gamesPlayed: u.gamesPlayed || 0,
    rank: u.rank || 'Recruit',
    last_save: u.lastSave,
    isAdmin: !!u.isAdmin,
  };
}

function authUser(req) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return null;
  const username = DB.sessions[token];
  if (!username) return null;
  const user = DB.users[username];
  if (!user || user.isBanned) return null;
  user.lastSeen = Date.now();
  return user;
}

// ---------- http helpers ----------
function sendJSON(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    let size = 0;
    req.on('data', c => {
      size += c.length;
      if (size > 256 * 1024) { reject(new Error('too large')); req.destroy(); return; }
      raw += c;
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch { reject(new Error('bad json')); }
    });
    req.on('error', reject);
  });
}

// ---------- routes ----------
const routes = {

  'GET /api/health': (req, res) => {
    sendJSON(res, 200, { ok: true, users: Object.keys(DB.users).length });
  },

  'POST /api/register': async (req, res) => {
    const { username, password } = await readBody(req);
    if (!username || !password) return sendJSON(res, 400, { success: false, error: 'Missing fields' });
    if (username.length < 3 || username.length > 20) return sendJSON(res, 400, { success: false, error: 'Username must be 3-20 characters' });
    if (!/^[A-Za-z0-9_]+$/.test(username)) return sendJSON(res, 400, { success: false, error: 'Letters, numbers, underscores only' });
    if (password.length < 4) return sendJSON(res, 400, { success: false, error: 'Password must be at least 4 characters' });
    if (DB.users[username]) return sendJSON(res, 409, { success: false, error: 'Username already taken' });

    const user = makeUser(username, password);
    DB.users[username] = user;
    const token = crypto.randomBytes(32).toString('hex');
    DB.sessions[token] = username;
    saveDB();
    sendJSON(res, 200, { success: true, token, user: publicUser(user) });
  },

  'POST /api/login': async (req, res) => {
    const { username, password } = await readBody(req);
    const user = DB.users[username];
    if (!user) return sendJSON(res, 401, { success: false, error: 'User not found' });
    if (user.isBanned) return sendJSON(res, 403, { success: false, error: 'This account is banned' });

    const attempt = hashPassword(password || '', user.salt);
    const stored = user.hash;
    if (attempt.length !== stored.length ||
        !crypto.timingSafeEqual(Buffer.from(attempt, 'hex'), Buffer.from(stored, 'hex'))) {
      return sendJSON(res, 401, { success: false, error: 'Incorrect password' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    DB.sessions[token] = username;
    user.lastSeen = Date.now();
    saveDB();
    sendJSON(res, 200, { success: true, token, user: publicUser(user) });
  },

  'POST /api/logout': async (req, res) => {
    const h = req.headers.authorization || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : null;
    if (token && DB.sessions[token]) {
      delete DB.sessions[token];
      saveDB();
    }
    sendJSON(res, 200, { success: true });
  },

  'GET /api/load': (req, res) => {
    const user = authUser(req);
    if (!user) return sendJSON(res, 401, { success: false, error: 'Not authenticated' });
    sendJSON(res, 200, { success: true, user: publicUser(user) });
  },

  'POST /api/score': async (req, res) => {
    const user = authUser(req);
    if (!user) return sendJSON(res, 401, { success: false, error: 'Not authenticated' });

    const body = await readBody(req);

    // sanity limits — stops obvious devtools tampering
    if (typeof body.score !== 'number' || !isFinite(body.score) || body.score < 0 || body.score > 1e9) {
      return sendJSON(res, 400, { success: false, error: 'Invalid score' });
    }

    user.gamesPlayed = (user.gamesPlayed || 0) + 1;
    user.totalKills = (user.totalKills || 0) + (typeof body.kills === 'number' ? Math.max(0, Math.floor(body.kills)) : 0);
    if (body.score > (user.highScore || 0)) user.highScore = Math.floor(body.score);
    user.lastSave = Date.now();
    user.lastSeen = Date.now();

    saveDB();
    sendJSON(res, 200, {
      success: true,
      highScore: user.highScore,
      totalKills: user.totalKills,
      gamesPlayed: user.gamesPlayed,
      message: 'Score saved!',
    });
  },

  'GET /api/leaderboard': (req, res) => {
    const board = Object.values(DB.users)
      .map(u => ({
        username: u.username,
        highScore: u.highScore || 0,
        totalKills: u.totalKills || 0,
        gamesPlayed: u.gamesPlayed || 0,
        rank: u.rank || 'Recruit',
        is_admin: u.isAdmin ? 1 : 0,
        last_save: u.lastSave,
      }))
      .sort((a, b) => b.highScore - a.highScore)
      .slice(0, 100);
    sendJSON(res, 200, { leaderboard: board });
  },

};

// ---------- static files ----------
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
};

function serveStatic(req, res, pathname) {
  let rel = pathname === '/' ? '/index.html' : pathname;
  rel = path.normalize(rel).replace(/^[/\\]+/, '');
  if (rel.startsWith('..')) { res.writeHead(403); return res.end('Forbidden'); }

  const filePath = path.join(CLIENT_DIR, rel);
  if (!filePath.startsWith(CLIENT_DIR)) { res.writeHead(403); return res.end('Forbidden'); }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('Not found');
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

// ---------- server ----------
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const key = `${req.method} ${url.pathname}`;

  if (routes[key]) {
    try {
      await routes[key](req, res);
    } catch (e) {
      console.error(key, e.message);
      if (!res.headersSent) sendJSON(res, 500, { success: false, error: 'Server error' });
    }
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    return sendJSON(res, 404, { success: false, error: 'Not found' });
  }

  serveStatic(req, res, url.pathname);
});

// ---------- boot ----------
loadDB();

if (!DB.users[ADMIN_NAME]) {
  const pw = crypto.randomBytes(9).toString('base64url');
  DB.users[ADMIN_NAME] = makeUser(ADMIN_NAME, pw);
  DB.users[ADMIN_NAME].highScore = 999999;
  DB.users[ADMIN_NAME].isAdmin = true;
  saveDBNow();
  console.log('');
  console.log('='.repeat(56));
  console.log('  ADMIN ACCOUNT CREATED');
  console.log('  username: ' + ADMIN_NAME);
  console.log('  password: ' + pw);
  console.log('  (save this — it will NOT be shown again)');
  console.log('='.repeat(56));
  console.log('');
}

// clean up stale sessions (7 days inactive)
setInterval(() => {
  const cutoff = Date.now() - 1000 * 60 * 60 * 24 * 7;
  for (const [token, username] of Object.entries(DB.sessions)) {
    const u = DB.users[username];
    if (!u || (u.lastSeen || 0) < cutoff) delete DB.sessions[token];
  }
  saveDB();
}, 1000 * 60 * 30);

process.on('SIGINT', () => {
  console.log('\nShutting down — saving...');
  saveDBNow();
  process.exit(0);
});

server.listen(PORT, () => {
  console.log('');
  console.log('🔫 Blocky Shooter server running');
  console.log('   → http://localhost:' + PORT);
  console.log('   users loaded: ' + Object.keys(DB.users).length);
  console.log('');
});
