'use strict';
process.on('uncaughtException', (e) => { console.error('CRASH:', e && e.stack || e); });
process.on('unhandledRejection', (e) => { console.error('REJECT:', e && e.stack || e); });

// ============================================================
//  BLOCKY SHOOTER — server.js (Upstash Redis)
//  Accounts survive redeploys.
// ============================================================

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Redis } = require('@upstash/redis');

const PORT = process.env.PORT || 3000;
const CLIENT_DIR = __dirname;
const ADMIN_NAME = process.env.ADMIN_USER || 'Just_12yrs_old';

const redis = Redis.fromEnv();

// ---------- auth ----------
function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}
function makeUser(username, password) {
  const salt = crypto.randomBytes(16).toString('hex');
  return {
    username: username,
    salt: salt,
    hash: hashPassword(password, salt),
    createdAt: Date.now(),
    lastSeen: Date.now(),
    lastSave: '',
    highScore: 0,
    totalKills: 0,
    gamesPlayed: 0,
    rank: 'Recruit',
    isBanned: 'false',
    isAdmin: username === ADMIN_NAME ? 'true' : 'false',
  };
}
function publicUser(u) {
  return {
    username: u.username,
    highScore: Number(u.highScore) || 0,
    totalKills: Number(u.totalKills) || 0,
    gamesPlayed: Number(u.gamesPlayed) || 0,
    rank: u.rank || 'Recruit',
    last_save: u.lastSave ? Number(u.lastSave) : null,
    isAdmin: u.isAdmin === 'true' || u.isAdmin === true,
  };
}

// ---------- redis data access ----------
async function getUser(username) {
  if (!username) return null;
  const data = await redis.hgetall('user:' + username);
  if (!data || Object.keys(data).length === 0) return null;
  return data;
}
async function saveUser(user) {
  await redis.hset('user:' + user.username, user);
}
async function authUser(req) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return null;
  const username = await redis.get('session:' + token);
  if (!username) return null;
  const user = await getUser(username);
  if (!user) return null;
  if (user.isBanned === 'true' || user.isBanned === true) return null;
  await redis.expire('session:' + token, 60 * 60 * 24 * 7);
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

  'GET /api/health': async (req, res) => {
    try {
      await redis.ping();
      sendJSON(res, 200, { ok: true, redis: 'connected' });
    } catch (e) {
      sendJSON(res, 500, { ok: false, error: String(e) });
    }
  },

  'POST /api/register': async (req, res) => {
    const body = await readBody(req);
    const username = body.username;
    const password = body.password;
    if (!username || !password) return sendJSON(res, 400, { success: false, error: 'Missing fields' });
    if (username.length < 3 || username.length > 20) return sendJSON(res, 400, { success: false, error: 'Username 3-20 chars' });
    if (!/^[A-Za-z0-9_]+$/.test(username)) return sendJSON(res, 400, { success: false, error: 'Letters, numbers, underscores only' });
    if (password.length < 4) return sendJSON(res, 400, { success: false, error: 'Password min 4 chars' });

    const existing = await getUser(username);
    if (existing) return sendJSON(res, 409, { success: false, error: 'Username taken' });

    const user = makeUser(username, password);
    await saveUser(user);
    const token = crypto.randomBytes(32).toString('hex');
    await redis.set('session:' + token, username, { ex: 60 * 60 * 24 * 7 });
    sendJSON(res, 200, { success: true, token: token, user: publicUser(user) });
  },

  'POST /api/login': async (req, res) => {
    const body = await readBody(req);
    const username = body.username;
    const password = body.password;
    const user = await getUser(username);
    if (!user) return sendJSON(res, 401, { success: false, error: 'User not found' });
    if (user.isBanned === 'true') return sendJSON(res, 403, { success: false, error: 'Banned' });

    const attempt = hashPassword(password || '', user.salt);
    const stored = user.hash;
    if (!stored || attempt.length !== stored.length ||
        !crypto.timingSafeEqual(Buffer.from(attempt, 'hex'), Buffer.from(stored, 'hex'))) {
      return sendJSON(res, 401, { success: false, error: 'Wrong password' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    await redis.set('session:' + token, username, { ex: 60 * 60 * 24 * 7 });
    user.lastSeen = String(Date.now());
    await saveUser(user);
    sendJSON(res, 200, { success: true, token: token, user: publicUser(user) });
  },

  'POST /api/logout': async (req, res) => {
    const h = req.headers.authorization || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : null;
    if (token) await redis.del('session:' + token);
    sendJSON(res, 200, { success: true });
  },

  'GET /api/load': async (req, res) => {
    const user = await authUser(req);
    if (!user) return sendJSON(res, 401, { success: false, error: 'Not logged in' });
    sendJSON(res, 200, { success: true, user: publicUser(user) });
  },

  'POST /api/score': async (req, res) => {
    const user = await authUser(req);
    if (!user) return sendJSON(res, 401, { success: false, error: 'Not logged in' });

    const body = await readBody(req);
    if (typeof body.score !== 'number' || !isFinite(body.score) || body.score < 0 || body.score > 1e9) {
      return sendJSON(res, 400, { success: false, error: 'Invalid score' });
    }

    user.gamesPlayed = String((Number(user.gamesPlayed) || 0) + 1);
    user.totalKills = String((Number(user.totalKills) || 0) + (typeof body.kills === 'number' ? Math.max(0, Math.floor(body.kills)) : 0));
    const newHigh = Math.floor(body.score);
    if (newHigh > (Number(user.highScore) || 0)) user.highScore = String(newHigh);
    user.lastSave = String(Date.now());
    user.lastSeen = String(Date.now());
    await saveUser(user);

    sendJSON(res, 200, {
      success: true,
      highScore: Number(user.highScore),
      totalKills: Number(user.totalKills),
      gamesPlayed: Number(user.gamesPlayed),
      message: 'Score saved!',
    });
  },

  'GET /api/leaderboard': async (req, res) => {
    const keys = await redis.keys('user:*');
    const users = [];
    for (let i = 0; i < keys.length; i++) {
      const data = await redis.hgetall(keys[i]);
      if (!data || !data.username) continue;
      users.push({
        username: data.username,
        highScore: Number(data.highScore) || 0,
        totalKills: Number(data.totalKills) || 0,
        gamesPlayed: Number(data.gamesPlayed) || 0,
        rank: data.rank || 'Recruit',
        is_admin: (data.isAdmin === 'true' || data.isAdmin === true) ? 1 : 0,
        last_save: data.lastSave ? Number(data.lastSave) : null,
      });
    }
    users.sort(function(a, b) { return b.highScore - a.highScore; });
    sendJSON(res, 200, { leaderboard: users.slice(0, 100) });
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
  fs.readFile(filePath, function(err, data) {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found'); }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

// ---------- server ----------
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));
  const key = req.method + ' ' + url.pathname;

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
server.listen(PORT, async function() {
  console.log('');
  console.log('🔫 Blocky Shooter server running');
  console.log('   → http://localhost:' + PORT);

  try {
    const admin = await getUser(ADMIN_NAME);
    if (!admin) {
      const pw = crypto.randomBytes(9).toString('base64url');
      const user = makeUser(ADMIN_NAME, pw);
      user.highScore = '999999';
      user.isAdmin = 'true';
      await saveUser(user);
      console.log('');
      console.log('='.repeat(56));
      console.log('  ADMIN ACCOUNT CREATED');
      console.log('  username: ' + ADMIN_NAME);
      console.log('  password: ' + pw);
      console.log('  (save this — it will NOT be shown again)');
      console.log('='.repeat(56));
      console.log('');
    }
  } catch (e) {
    console.error('Admin setup failed:', e.message);
  }
});
