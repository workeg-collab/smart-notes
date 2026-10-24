/**
 * Smart Notes (نوتتي الذكية) - Unified Cloud Sync & Auth API Server
 * Built with native Node.js (Zero external dependencies, ultra-fast & resilient)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = 3000; // Always use internal port 3000 for Node API to prevent collision with Coolify PORT=80
const DATA_DIR = process.env.DATA_DIR || (fs.existsSync('/app/data') ? '/app/data' : path.join(__dirname, 'data'));

if (!fs.existsSync(DATA_DIR)) {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) {}
}

const DB_FILE = path.join(DATA_DIR, 'db.json');
const VALID_ADMIN_KEYS = ['admin2026', '2026', 'admin', '9988', process.env.ADMIN_PIN].filter(Boolean);

// Default initial state
let db = {
  users: {},
  items: {},
  deleted_items: {}
};

// Seed demo users if empty
function seedDemoUsers() {
  if (Object.keys(db.users).length === 0) {
    const now = Date.now();
    const demo = [
      { id: 'u_owner', name: 'المدير العام (المؤسس)', email: 'admin@pom-hosting.online', phone: '01000000000', tier: 'vip_yearly', status: 'active', joined_at: now - 30 * 864e5, expires_at: now + 335 * 864e5 },
      { id: 'u_karim', name: 'م. كريم عبد العزيز', email: 'karim@workeg.com', phone: '01012345678', tier: 'pro_monthly', status: 'active', joined_at: now - 20 * 864e5, expires_at: now + 24 * 864e5 },
      { id: 'u_sara', name: 'د. سارة إبراهيم', email: 'sara.ibrahim@gmail.com', phone: '01198765432', tier: 'vip_yearly', status: 'active', joined_at: now - 45 * 864e5, expires_at: now + 310 * 864e5 },
      { id: 'u_hoda', name: 'أ. هدى منصور', email: 'hoda.mansour@yahoo.com', phone: '01555554321', tier: 'pro_monthly', status: 'active', joined_at: now - 27 * 864e5, expires_at: now + 3 * 864e5 },
      { id: 'u_marwan', name: 'مروان طارق', email: 'marwan99@hotmail.com', phone: '01234567890', tier: 'beta_free', status: 'suspended', joined_at: now - 60 * 864e5, expires_at: now - 10 * 864e5 },
      { id: 'u_tamer', name: 'تامر الشريف', email: 'tamer@startup.eg', phone: '01088899911', tier: 'beta_free', status: 'active', joined_at: now - 12 * 864e5, expires_at: now + 18 * 864e5 }
    ];
    for (const u of demo) {
      const salt = crypto.randomBytes(16).toString('hex');
      db.users[u.id] = { ...u, pw_salt: salt, pw_hash: hashPw('123456', salt), pin_salt: '', pin_chk: null };
      db.items[u.id] = [
        { id: 'demo_' + u.id + '_1', ts: now - 100000, type: 'money', kind: 'out', amount: 150, text: 'كشف دكتور', who: 'دكتور', cat: 'صحة' },
        { id: 'demo_' + u.id + '_2', ts: now - 50000, type: 'note', text: 'أفكار لتطوير مشروع نوتتي الذكية' }
      ];
    }
    saveDb();
    console.log('[DB] Pre-seeded demo users and items.');
  }
}

// Load database from disk
function loadDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf8');
      db = JSON.parse(content);
      db.users = db.users || {};
      db.items = db.items || {};
      db.deleted_items = db.deleted_items || {};
      console.log(`[DB] Loaded ${Object.keys(db.users).length} users and ${Object.keys(db.items).length} items from ${DB_FILE}`);
    } else {
      seedDemoUsers();
    }
  } catch (err) {
    console.error('[DB] Error loading DB:', err);
    seedDemoUsers();
  }
}

// Atomic save to prevent corruption
function saveDb() {
  try {
    const tmp = DB_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2), 'utf8');
    fs.renameSync(tmp, DB_FILE);
  } catch (err) {
    console.error('[DB] Error saving DB:', err);
  }
}

// Hash helper
function hashPw(pw, salt) {
  return crypto.pbkdf2Sync(pw, salt, 10000, 32, 'sha256').toString('hex');
}

// Generate secure token
function genToken(userId) {
  const payload = Buffer.from(JSON.stringify({ uid: userId, exp: Date.now() + 365 * 864e5 })).toString('base64url');
  const sig = crypto.createHmac('sha256', 'smartnotes-secret-key-2026').update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

// Verify secure token
function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', 'smartnotes-secret-key-2026').update(payload).digest('base64url');
  if (sig !== expectedSig) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (data.exp && data.exp < Date.now()) return null;
    return data.uid;
  } catch (e) {
    return null;
  }
}

function checkAdminKey(req, url) {
  const key = req.headers['x-admin-key'] || url.searchParams.get('key');
  if (!key) return false;
  if (key.startsWith('adm_')) return true;
  return VALID_ADMIN_KEYS.includes(key);
}

// Read JSON Body
function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > 10 * 1024 * 1024) { // 10MB limit
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

// Send JSON response
function json(res, data, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-id, x-admin-key',
    'Cache-Control': 'no-cache, no-store, must-revalidate'
  });
  res.end(JSON.stringify(data));
}

loadDb();

// Server handler
const server = http.createServer(async (req, res) => {
  // Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-id, x-admin-key'
    });
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  // Extract Auth Token or User ID
  let authUserId = null;
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    authUserId = verifyToken(authHeader.slice(7));
  }
  if (!authUserId && req.headers['x-user-id']) {
    authUserId = req.headers['x-user-id'];
  }

  try {
    // 1. Health check
    if (pathname === '/api/health') {
      return json(res, { ok: true, status: 'healthy', time: Date.now(), usersCount: Object.keys(db.users).length });
    }

    // 2. Auth: Register
    if (pathname === '/api/auth/register' && req.method === 'POST') {
      const body = await readBody(req);
      const name = (body.name || '').trim();
      const email = (body.email || '').trim().toLowerCase();
      const phone = (body.phone || '').trim();
      const password = body.password || '';
      const pin_salt = body.pin_salt || '';
      const pin_chk = body.pin_chk || null;
      const tier = body.tier || 'beta_free';

      if (!name) return json(res, { ok: false, error: 'الاسم مطلوب' }, 400);
      if (!email && !phone) return json(res, { ok: false, error: 'البريد أو رقم الهاتف مطلوب' }, 400);
      if (!password || password.length < 6) return json(res, { ok: false, error: 'كلمة المرور يجب أن تكون ٦ خانات على الأقل' }, 400);

      // Check if email or phone already registered
      for (const u of Object.values(db.users)) {
        if (email && u.email && u.email === email) return json(res, { ok: false, error: 'هذا البريد مسجل مسبقاً، يمكنك تسجيل الدخول به مباشرة' }, 409);
        if (phone && u.phone && u.phone === phone) return json(res, { ok: false, error: 'رقم الهاتف مسجل مسبقاً، يمكنك تسجيل الدخول به مباشرة' }, 409);
      }

      const uid = 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      const salt = crypto.randomBytes(16).toString('hex');
      const pwHash = hashPw(password, salt);

      const newUser = {
        id: uid,
        name,
        email,
        phone,
        pw_hash: pwHash,
        pw_salt: salt,
        pin_salt,
        pin_chk,
        tier,
        status: 'active',
        joined_at: Date.now(),
        expires_at: Date.now() + 30 * 864e5
      };

      db.users[uid] = newUser;
      db.items[uid] = db.items[uid] || [];
      saveDb();

      const token = genToken(uid);
      const { pw_hash, pw_salt, ...safeUser } = newUser;
      return json(res, { ok: true, user: safeUser, token });
    }

    // 3. Auth: Login
    if (pathname === '/api/auth/login' && req.method === 'POST') {
      const body = await readBody(req);
      const identifier = (body.email || body.phone || body.username || '').trim().toLowerCase();
      const password = body.password || '';

      if (!identifier) return json(res, { ok: false, error: 'البريد أو رقم الهاتف مطلوب' }, 400);
      if (!password) return json(res, { ok: false, error: 'كلمة المرور مطلوبة' }, 400);

      // Find user by email or phone
      const user = Object.values(db.users).find(u => 
        (u.email && u.email.toLowerCase() === identifier) || 
        (u.phone && u.phone === identifier)
      );

      if (!user) {
        return json(res, { ok: false, error: 'بيانات الدخول غير صحيحة، يرجى التأكد أو إنشاء حساب جديد.' }, 401);
      }

      // Check password
      const expectedHash = hashPw(password, user.pw_salt);
      if (user.pw_hash !== expectedHash) {
        return json(res, { ok: false, error: 'كلمة المرور غير صحيحة' }, 401);
      }

      // Get user items
      const userItems = (db.items[user.id] || []).filter(i => !i.deleted);
      const token = genToken(user.id);
      const { pw_hash, pw_salt, ...safeUser } = user;

      return json(res, { ok: true, user: safeUser, items: userItems, token });
    }

    // 4. Items: Get (Sync Down)
    if (pathname === '/api/items' && req.method === 'GET') {
      if (!authUserId || !db.users[authUserId]) {
        return json(res, { ok: false, error: 'Unauthorized' }, 401);
      }

      const since = parseInt(url.searchParams.get('since') || '0', 10);
      const allItems = db.items[authUserId] || [];
      const filtered = since > 0 ? allItems.filter(i => (i.updated_at || i.ts || 0) >= since) : allItems;
      const deletedIds = (db.deleted_items[authUserId] || []).filter(d => since === 0 || d.deleted_at >= since).map(d => d.id);

      return json(res, { ok: true, items: filtered, deleted_ids: deletedIds });
    }

    // 5. Items: Upsert (Sync Up)
    if (pathname === '/api/items' && req.method === 'POST') {
      if (!authUserId || !db.users[authUserId]) {
        return json(res, { ok: false, error: 'Unauthorized' }, 401);
      }

      const body = await readBody(req);
      const incoming = Array.isArray(body.items) ? body.items : (body.item ? [body.item] : []);

      if (!incoming.length) return json(res, { ok: true, count: 0 });

      let list = db.items[authUserId] || [];
      const map = new Map(list.map(i => [i.id, i]));

      for (const item of incoming) {
        if (!item || !item.id) continue;
        item.updated_at = Date.now();
        map.set(item.id, item);
      }

      db.items[authUserId] = Array.from(map.values());
      saveDb();

      return json(res, { ok: true, count: incoming.length });
    }

    // 6. Items: Delete
    if (pathname.startsWith('/api/items/') && req.method === 'DELETE') {
      if (!authUserId || !db.users[authUserId]) {
        return json(res, { ok: false, error: 'Unauthorized' }, 401);
      }

      const itemId = pathname.replace('/api/items/', '').trim();
      if (!itemId) return json(res, { ok: false, error: 'Item ID required' }, 400);

      let list = db.items[authUserId] || [];
      db.items[authUserId] = list.filter(i => i.id !== itemId);

      db.deleted_items[authUserId] = db.deleted_items[authUserId] || [];
      db.deleted_items[authUserId].push({ id: itemId, deleted_at: Date.now() });

      saveDb();
      return json(res, { ok: true, deleted: itemId });
    }

    // 7. Admin: Login
    if (pathname === '/api/admin/login' && req.method === 'POST') {
      const body = await readBody(req);
      const key = body.pin || body.password || '';
      if (VALID_ADMIN_KEYS.includes(key)) {
        return json(res, { ok: true, token: 'adm_' + crypto.randomBytes(16).toString('hex') });
      }
      return json(res, { ok: false, error: 'رمز الإدارة غير صحيح' }, 401);
    }

    // 8. Admin: Get all users & stats
    if (pathname === '/api/admin/users' && req.method === 'GET') {
      if (!checkAdminKey(req, url)) {
        return json(res, { ok: false, error: 'Forbidden' }, 403);
      }

      const usersList = Object.values(db.users).map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        tier: u.tier || 'beta_free',
        status: u.status || 'active',
        created_at: u.joined_at || Date.now(),
        expires_at: u.expires_at || (Date.now() + 30 * 864e5),
        items_count: (db.items[u.id] || []).length
      }));

      return json(res, { ok: true, users: usersList });
    }

    // 9. Admin: Add User
    if (pathname === '/api/admin/users' && req.method === 'POST') {
      if (!checkAdminKey(req, url)) {
        return json(res, { ok: false, error: 'Forbidden' }, 403);
      }

      const body = await readBody(req);
      const name = (body.name || '').trim();
      const email = (body.email || '').trim().toLowerCase();
      const phone = (body.phone || '').trim();
      const tier = body.tier || 'beta_free';
      const status = body.status || 'active';
      const durationDays = parseInt(body.duration_days || '30', 10);

      if (!name) return json(res, { ok: false, error: 'الاسم مطلوب' }, 400);

      const uid = 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      const salt = crypto.randomBytes(16).toString('hex');
      const newUser = {
        id: uid,
        name,
        email,
        phone,
        pw_salt: salt,
        pw_hash: hashPw('123456', salt),
        pin_salt: '',
        pin_chk: null,
        tier,
        status,
        joined_at: Date.now(),
        expires_at: Date.now() + durationDays * 864e5
      };

      db.users[uid] = newUser;
      db.items[uid] = [];
      saveDb();

      const { pw_hash, pw_salt, ...safeUser } = newUser;
      return json(res, { ok: true, user: safeUser });
    }

    // 10. Admin: Update User
    if (pathname.startsWith('/api/admin/users/') && req.method === 'POST') {
      if (!checkAdminKey(req, url)) {
        return json(res, { ok: false, error: 'Forbidden' }, 403);
      }

      const uid = pathname.replace('/api/admin/users/', '').trim();
      const user = db.users[uid];
      if (!user) return json(res, { ok: false, error: 'User not found' }, 404);

      const body = await readBody(req);
      if (body.status) user.status = body.status;
      if (body.tier) user.tier = body.tier;
      if (body.extend_days) {
        const base = Math.max(user.expires_at || Date.now(), Date.now());
        user.expires_at = base + (body.extend_days * 864e5);
      }

      saveDb();
      const { pw_hash, pw_salt, ...safeUser } = user;
      return json(res, { ok: true, user: safeUser });
    }

    // 11. Admin: Delete User
    if (pathname.startsWith('/api/admin/users/') && req.method === 'DELETE') {
      if (!checkAdminKey(req, url)) {
        return json(res, { ok: false, error: 'Forbidden' }, 403);
      }

      const uid = pathname.replace('/api/admin/users/', '').trim();
      delete db.users[uid];
      delete db.items[uid];
      delete db.deleted_items[uid];
      saveDb();
      return json(res, { ok: true, deleted: uid });
    }

    // 404 for unknown API routes
    return json(res, { ok: false, error: 'Endpoint not found' }, 404);

  } catch (err) {
    console.error('[API Error]:', err);
    return json(res, { ok: false, error: err.message || 'Internal Server Error' }, 500);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[SmartNotes API Server] Running on http://0.0.0.0:${PORT}`);
});
