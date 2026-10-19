'use strict';
process.on('uncaughtException', (e) => { console.error('CRASH:', e && e.stack || e); });
process.on('unhandledRejection', (e) => { console.error('REJECT:', e && e.stack || e); });

// ============================================================
//  BLOCKY SHOOTER — server.js
//  Modes: Survival, Frontline, Extraction
//  Storage: Upstash Redis
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

// ---------- CATALOGS ----------
const WEAPON_CATALOG = {
  m16:     { price: 0,    name: 'M16' },
  ak47:    { price: 800,  name: 'AK47' },
  m1916:   { price: 1200, name: 'M1916' },
  mp5:     { price: 1500, name: 'MP5' },
  scar:    { price: 2000, name: 'SCAR-H' },
  minigun: { price: 3000, name: 'Minigun' },
  awp:     { price: 3500, name: 'AWP' },
  grenade: { price: 0,    name: 'Grenade' },
};

const VALID_PACKS = ['rifleman', 'breacher', 'scout', 'combat_medic', 'sharpshooter', 'phantom', 'juggernaut'];
const ALL_PACKS_STRING = VALID_PACKS.join(',');

// Armor catalog
const ARMOR_CATALOG = {
  none:  { name: 'None',        absorb: 0,   price: 0 },
  light: { name: 'Light Armor', absorb: 50,  price: 0 },
  heavy: { name: 'Heavy Armor', absorb: 120, price: 0 },
};

// ---------- auth ----------
function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function makeUser(username, password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const isAdmin = username === ADMIN_NAME;
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
    coins: isAdmin ? 9999999 : 0,
    ownedWeapons: isAdmin ? Object.keys(WEAPON_CATALOG).join(',') : 'm16,grenade',
    loadout: isAdmin ? 'ak47,awp,grenade' : 'm16,grenade',
    ownedPacks: isAdmin ? ALL_PACKS_STRING : 'rifleman',
    // Extraction mode fields
    stash: isAdmin ? Object.keys(WEAPON_CATALOG).join(',') : '',    // comma-separated weapon ids
    safeBox: '',                                                      // comma-separated, max 2
    equippedArmor: isAdmin ? 'heavy' : 'none',                        // none | light | heavy
    ownedArmor: isAdmin ? 'light,heavy' : '',                         // armor ids you've extracted
    extractionWins: isAdmin ? 100 : 0,
    extractionLosses: 0,
    rank: 'Recruit',
    isBanned: 'false',
    isAdmin: isAdmin ? 'true' : 'false',
  };
}

function publicUser(u) {
  const owned = (u.ownedWeapons || 'm16,grenade').split(',').filter(Boolean);
  const loadout = (u.loadout || 'm16,grenade').split(',').filter(Boolean);
  const ownedPacks = (u.ownedPacks || 'rifleman').split(',').filter(Boolean);
  const stash = (u.stash || '').split(',').filter(Boolean);
  const safeBox = (u.safeBox || '').split(',').filter(Boolean);
  const ownedArmor = (u.ownedArmor || '').split(',').filter(Boolean);
  return {
    username: u.username,
    highScore: Number(u.highScore) || 0,
    totalKills: Number(u.totalKills) || 0,
    gamesPlayed: Number(u.gamesPlayed) || 0,
    coins: Number(u.coins) || 0,
    ownedWeapons: owned,
    loadout: loadout,
    ownedPacks: ownedPacks,
    stash: stash,
    safeBox: safeBox,
    equippedArmor: u.equippedArmor || 'none',
    ownedArmor: ownedArmor,
    extractionWins: Number(u.extractionWins) || 0,
    extractionLosses: Number(u.extractionLosses) || 0,
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
  // Fill in missing fields for older accounts
  if (data.coins === undefined) data.coins = '0';
  if (data.ownedWeapons === undefined) data.ownedWeapons = 'm16,grenade';
  if (data.loadout === undefined) data.loadout = 'm16,grenade';
  if (data.ownedPacks === undefined) data.ownedPacks = 'rifleman';
  if (data.stash === undefined) data.stash = '';
  if (data.safeBox === undefined) data.safeBox = '';
  if (data.equippedArmor === undefined) data.equippedArmor = 'none';
  if (data.ownedArmor === undefined) data.ownedArmor = '';
  if (data.extractionWins === undefined) data.extractionWins = '0';
  if (data.extractionLosses === undefined) data.extractionLosses = '0';
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

  'GET /api/weapons': (req, res) => {
    sendJSON(res, 200, { weapons: WEAPON_CATALOG, armor: ARMOR_CATALOG });
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

  // ---- buy a weapon ----
  'POST /api/buy-weapon': async (req, res) => {
    const user = await authUser(req);
    if (!user) return sendJSON(res, 401, { success: false, error: 'Not logged in' });

    const body = await readBody(req);
    const weaponId = String(body.weaponId || '').toLowerCase();
    const def = WEAPON_CATALOG[weaponId];
    if (!def) return sendJSON(res, 400, { success: false, error: 'Unknown weapon' });

    const owned = (user.ownedWeapons || 'm16,grenade').split(',').filter(Boolean);
    if (owned.includes(weaponId)) {
      return sendJSON(res, 400, { success: false, error: 'You already own this weapon' });
    }

    const isAdmin = user.isAdmin === 'true' || user.isAdmin === true;
    const coins = Number(user.coins) || 0;

    if (!isAdmin) {
      if (coins < def.price) {
        return sendJSON(res, 400, { success: false, error: 'Not enough coins' });
      }
      user.coins = String(coins - def.price);
    }

    owned.push(weaponId);
    user.ownedWeapons = owned.join(',');
    user.lastSeen = String(Date.now());
    await saveUser(user);

    sendJSON(res, 200, {
      success: true,
      message: 'Bought ' + def.name + '!',
      user: publicUser(user),
    });
  },
    // ---- sell a weapon ----
  'POST /api/sell-weapon': async (req, res) => {
    const user = await authUser(req);
    if (!user) return sendJSON(res, 401, { success: false, error: 'Not logged in' });

    const body = await readBody(req);
    const weaponId = String(body.weaponId || '').toLowerCase();
    const def = WEAPON_CATALOG[weaponId];
    if (!def) return sendJSON(res, 400, { success: false, error: 'Unknown weapon' });

    // Same prices as client — keep in sync
    const SELL_PRICES = {
      m16: 0, ak47: 400, m1916: 600, mp5: 750,
      scar: 1000, minigun: 1500, awp: 1750, grenade: 0,
    };
    const price = SELL_PRICES[weaponId] || 0;
    if (price <= 0) return sendJSON(res, 400, { success: false, error: 'This weapon cannot be sold' });

    // Check ownership: either in ownedWeapons (shop) or in stash
    let owned = (user.ownedWeapons || 'm16,grenade').split(',').filter(Boolean);
    let stash = (user.stash || '').split(',').filter(Boolean);

    const inOwned = owned.includes(weaponId);
    const inStash = stash.includes(weaponId);
    if (!inOwned && !inStash) {
      return sendJSON(res, 400, { success: false, error: 'You do not own this weapon' });
    }

    // Prefer removing from stash first, else from owned (unless equipped in loadout)
    if (inStash) {
      stash.splice(stash.indexOf(weaponId), 1);
      user.stash = stash.join(',');
    } else if (inOwned) {
      const loadout = (user.loadout || '').split(',').filter(Boolean);
      if (loadout.includes(weaponId)) {
        return sendJSON(res, 400, { success: false, error: 'Unequip this weapon from your loadout first' });
      }
      owned.splice(owned.indexOf(weaponId), 1);
      user.ownedWeapons = owned.join(',');
    }

    user.coins = String((Number(user.coins) || 0) + price);
    user.lastSeen = String(Date.now());
    await saveUser(user);

    sendJSON(res, 200, {
      success: true,
      message: 'Sold ' + def.name + ' for ' + price,
      user: publicUser(user),
    });
  },


  // ---- save loadout ----
  'POST /api/save-loadout': async (req, res) => {
    const user = await authUser(req);
    if (!user) return sendJSON(res, 401, { success: false, error: 'Not logged in' });

    const body = await readBody(req);
    const loadout = Array.isArray(body.loadout) ? body.loadout : [];
    if (loadout.length < 1 || loadout.length > 3) {
      return sendJSON(res, 400, { success: false, error: 'Bring 1 to 3 weapons' });
    }

    const owned = (user.ownedWeapons || 'm16,grenade').split(',').filter(Boolean);
    for (let i = 0; i < loadout.length; i++) {
      const id = String(loadout[i] || '').toLowerCase();
      if (!WEAPON_CATALOG[id]) return sendJSON(res, 400, { success: false, error: 'Unknown weapon: ' + id });
      if (!owned.includes(id)) return sendJSON(res, 400, { success: false, error: 'You do not own: ' + id });
    }

    const unique = [];
    for (let i = 0; i < loadout.length; i++) {
      const id = String(loadout[i]).toLowerCase();
      if (!unique.includes(id)) unique.push(id);
    }
    user.loadout = unique.join(',');
    user.lastSeen = String(Date.now());
    await saveUser(user);

    sendJSON(res, 200, { success: true, loadout: unique });
  },

  // ---- save coins ----
  'POST /api/save-coins': async (req, res) => {
    const user = await authUser(req);
    if (!user) return sendJSON(res, 401, { success: false, error: 'Not authenticated' });

    const body = await readBody(req);
    const coins = Number(body.coins);
    if (!isFinite(coins) || coins < 0 || coins > 1e12) {
      return sendJSON(res, 400, { success: false, error: 'Invalid coin value' });
    }

    user.coins = String(Math.floor(coins));
    user.lastSeen = String(Date.now());
    await saveUser(user);
    sendJSON(res, 200, { success: true, coins: Number(user.coins) });
  },

  // ---- save owned packs ----
  'POST /api/save-packs': async (req, res) => {
    const user = await authUser(req);
    if (!user) return sendJSON(res, 401, { success: false, error: 'Not authenticated' });

    const body = await readBody(req);
    const packs = Array.isArray(body.packs) ? body.packs : [];
    const filtered = packs.filter(function(p) { return VALID_PACKS.includes(p); });
    if (!filtered.includes('rifleman')) filtered.push('rifleman');

    user.ownedPacks = filtered.join(',');
    user.lastSeen = String(Date.now());
    await saveUser(user);
    sendJSON(res, 200, { success: true, ownedPacks: filtered });
  },

  // ---- save safe box (2 slots) ----
  'POST /api/save-safe-box': async (req, res) => {
    const user = await authUser(req);
    if (!user) return sendJSON(res, 401, { success: false, error: 'Not authenticated' });

    const body = await readBody(req);
    const box = Array.isArray(body.safeBox) ? body.safeBox : [];
    const filtered = box.slice(0, 2).filter(function(v) { return typeof v === 'string' && v.length > 0; });

    user.safeBox = filtered.join(',');
    user.lastSeen = String(Date.now());
    await saveUser(user);
    sendJSON(res, 200, { success: true, safeBox: filtered });
  },

  // ---- equip armor ----
  'POST /api/equip-armor': async (req, res) => {
    const user = await authUser(req);
    if (!user) return sendJSON(res, 401, { success: false, error: 'Not authenticated' });

    const body = await readBody(req);
    const armorId = String(body.armor || 'none').toLowerCase();
    if (!ARMOR_CATALOG[armorId]) return sendJSON(res, 400, { success: false, error: 'Unknown armor' });

    const ownedArmor = (user.ownedArmor || '').split(',').filter(Boolean);
    const isAdmin = user.isAdmin === 'true' || user.isAdmin === true;
    if (armorId !== 'none' && !ownedArmor.includes(armorId) && !isAdmin) {
      return sendJSON(res, 400, { success: false, error: 'You do not own this armor' });
    }

    user.equippedArmor = armorId;
    user.lastSeen = String(Date.now());
    await saveUser(user);
    sendJSON(res, 200, { success: true, equippedArmor: armorId });
  },

  // ---- extraction result ----
  // Client sends: { success: true/false, lootedWeapons: [...], lootedArmor: [...], coinsCollected: N }
  // On success: looted items go to stash + ownedArmor, coins added.
  // On death: looted items are lost (except items in safeBox — but safeBox holds weapons you configured BEFORE the match)
  'POST /api/extraction-result': async (req, res) => {
    const user = await authUser(req);
    if (!user) return sendJSON(res, 401, { success: false, error: 'Not authenticated' });

    const body = await readBody(req);
    const success = body.success === true;
    const lootedWeapons = Array.isArray(body.lootedWeapons) ? body.lootedWeapons : [];
    const lootedArmor = Array.isArray(body.lootedArmor) ? body.lootedArmor : [];
    const coinsCollected = Math.max(0, Math.min(50000, Number(body.coinsCollected) || 0));

    user.lastSeen = String(Date.now());

    if (success) {
      // Add looted weapons to stash
      const stash = (user.stash || '').split(',').filter(Boolean);
      lootedWeapons.forEach(function(w) {
        const id = String(w || '').toLowerCase();
        if (WEAPON_CATALOG[id]) stash.push(id);
      });
      user.stash = stash.join(',');

      // Add looted armor to owned armor
      const ownedArmor = (user.ownedArmor || '').split(',').filter(Boolean);
      lootedArmor.forEach(function(a) {
        const id = String(a || '').toLowerCase();
        if (ARMOR_CATALOG[id] && id !== 'none' && !ownedArmor.includes(id)) ownedArmor.push(id);
      });
      user.ownedArmor = ownedArmor.join(',');

      // Add coins
      user.coins = String((Number(user.coins) || 0) + coinsCollected);
      user.extractionWins = String((Number(user.extractionWins) || 0) + 1);
    } else {
      // Death — lose looted items, keep whatever's in safeBox
      user.extractionLosses = String((Number(user.extractionLosses) || 0) + 1);
      // Still gain whatever coins were banked before dying (coins are safe)
      user.coins = String((Number(user.coins) || 0) + Math.floor(coinsCollected * 0.5)); // half coins on death
    }

    await saveUser(user);
    sendJSON(res, 200, {
      success: true,
      extracted: success,
      user: publicUser(user),
    });
  },

  // ---- submit score ----
  'POST /api/score': async (req, res) => {
    const user = await authUser(req);
    if (!user) return sendJSON(res, 401, { success: false, error: 'Not logged in' });

    const body = await readBody(req);
    if (typeof body.score !== 'number' || !isFinite(body.score) || body.score < 0 || body.score > 1e9) {
      return sendJSON(res, 400, { success: false, error: 'Invalid score' });
    }

    let coinsEarned = 0;
    if (typeof body.coinsEarned === 'number' && isFinite(body.coinsEarned)) {
      coinsEarned = Math.max(0, Math.min(50000, Math.floor(body.coinsEarned)));
    }

    user.gamesPlayed = String((Number(user.gamesPlayed) || 0) + 1);
    user.totalKills = String((Number(user.totalKills) || 0) + (typeof body.kills === 'number' ? Math.max(0, Math.floor(body.kills)) : 0));
    const newHigh = Math.floor(body.score);
    if (newHigh > (Number(user.highScore) || 0)) user.highScore = String(newHigh);
    user.coins = String((Number(user.coins) || 0) + coinsEarned);
    user.lastSave = String(Date.now());
    user.lastSeen = String(Date.now());
    await saveUser(user);

    sendJSON(res, 200, {
      success: true,
      highScore: Number(user.highScore),
      totalKills: Number(user.totalKills),
      gamesPlayed: Number(user.gamesPlayed),
      coins: Number(user.coins),
      coinsEarned: coinsEarned,
      message: 'Score saved!',
    });
  },

  // ---- leaderboard ----
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
        coins: Number(data.coins) || 0,
        extractionWins: Number(data.extractionWins) || 0,
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
      user.coins = '9999999';
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

  // Top up admin on every boot
  try {
    const adm = await getUser(ADMIN_NAME);
    if (adm && (adm.isAdmin === 'true' || adm.isAdmin === true)) {
      let dirty = false;
      if (Number(adm.coins) < 9999999) { adm.coins = '9999999'; dirty = true; }
      if (Number(adm.highScore) < 999999) { adm.highScore = '999999'; dirty = true; }

      const admPacks = (adm.ownedPacks || '').split(',').filter(Boolean);
      if (admPacks.length < VALID_PACKS.length) { adm.ownedPacks = ALL_PACKS_STRING; dirty = true; }

      const admArmor = (adm.ownedArmor || '').split(',').filter(Boolean);
      if (!admArmor.includes('light') || !admArmor.includes('heavy')) {
        adm.ownedArmor = 'light,heavy'; dirty = true;
      }

      const admStash = (adm.stash || '').split(',').filter(Boolean);
      if (admStash.length < Object.keys(WEAPON_CATALOG).length) {
        adm.stash = Object.keys(WEAPON_CATALOG).join(','); dirty = true;
      }

      if (dirty) {
        adm.lastSeen = String(Date.now());
        await saveUser(adm);
        console.log('Admin topped up: 9,999,999 coins + all packs + all armor + all weapons in stash 🪙');
      }
    }
  } catch (e) {
    console.error('Admin top-up failed:', e.message);
  }

  console.log('');
});
