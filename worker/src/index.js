// --- [ARENA] battle system ---
import { arenaRoute, runBattle } from './arena.js';
// --- [/ARENA] ---

export { RateLimiter } from './rate_limiter.js';

// --- Rate limiting ---
// GET: in-memory 60/min per isolate (lenient, non-mutating traffic).
// POST: global via RateLimiter Durable Object.

const getRateMap = new Map();

async function isPostRateLimited(ip, env) {
  try {
    const id = env.RATE_LIMITER.idFromName('global');
    const stub = env.RATE_LIMITER.get(id);
    const res = await stub.fetch('https://rl/check?ip=' + encodeURIComponent(ip));
    const data = await res.json();
    return !!data.limited;
  } catch {
    return false;
  }
}

function isGetRateLimited(ip) {
  const now = Date.now();
  const entry = getRateMap.get(ip);
  if (!entry || now - entry.start > 60_000) {
    getRateMap.set(ip, { start: now, count: 1 });
    return false;
  }
  entry.count++;
  return entry.count > 60;
}

function evictStaleGetEntries() {
  const now = Date.now();
  for (const [key, entry] of getRateMap) {
    if (now - entry.start > 120_000) getRateMap.delete(key);
  }
}

function isAllowedOrigin(origin, env) {
  if (!origin) return false;
  const origins = (env?.ALLOWED_ORIGINS || 'https://ascii-buddy.pages.dev').split(',');
  for (const allowed of origins) {
    if (origin === allowed.trim()) return true;
  }
  return false;
}

function corsHeaders(request, env) {
  const origin = request?.headers?.get('Origin') || '';
  const allowed = isAllowedOrigin(origin, env) ? origin : '';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Vary': 'Origin',
  };
}

function json(data, status = 200, env = null, request = null) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(request, env),
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'no-referrer',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    },
  });
}

// --- Crypto helpers ---

async function sha256Hex(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function extractBearer(request) {
  const raw = request.headers.get('Authorization') || '';
  const m = /^Bearer\s+([A-Za-z0-9._-]{16,256})$/.exec(raw);
  return m ? m[1] : null;
}

function safeParseStats(s) {
  try {
    const v = typeof s === 'string' ? JSON.parse(s) : s;
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
}

// --- Allowed values (must match CLI) ---
const VALID_SPECIES = new Set([
  'duck', 'goose', 'blob', 'cat', 'dragon', 'octopus', 'owl', 'penguin',
  'turtle', 'snail', 'ghost', 'axolotl', 'capybara', 'cactus', 'robot',
  'rabbit', 'mushroom', 'chonk',
]);
const VALID_RARITY = new Set(['common', 'uncommon', 'rare', 'epic', 'legendary']);
const VALID_EYES = new Set(['·', '✦', '×', '◉', '@', '°']);
const VALID_HATS = new Set(['none', 'crown', 'tophat', 'propeller', 'halo', 'wizard', 'beanie', 'tinyduck']);
const VALID_STATS = new Set(['DEBUGGING', 'PATIENCE', 'CHAOS', 'WISDOM', 'SNARK']);

// Public columns — never include user_hash or auth_token_hash.
const BUDDY_PUBLIC_COLS = 'buddy_id, name, personality, species, rarity, eye, hat, shiny, stats, hatched_at, submitted_at';

// --- Content filter ---

// Confusable fold map (common Cyrillic / Greek / fullwidth → Latin).
const CONFUSABLES = {
  'а': 'a', 'е': 'e', 'о': 'o', 'р': 'p', 'с': 'c', 'у': 'y', 'х': 'x',
  'А': 'A', 'Е': 'E', 'О': 'O', 'Р': 'P', 'С': 'C', 'У': 'Y', 'Х': 'X',
  'і': 'i', 'І': 'I', 'ѕ': 's', 'Ѕ': 'S', 'ԁ': 'd', 'ԛ': 'q',
  'α': 'a', 'ο': 'o', 'ρ': 'p', 'ν': 'v', 'τ': 't', 'κ': 'k', 'ι': 'i', 'ϲ': 'c', 'υ': 'u',
  'Α': 'A', 'Ο': 'O', 'Ρ': 'P', 'Ν': 'N', 'Τ': 'T', 'Κ': 'K', 'Ι': 'I',
};
const LEET = { '4': 'a', '@': 'a', '3': 'e', '1': 'i', '!': 'i', '0': 'o', '5': 's', '$': 's', '7': 't', '8': 'b' };

function canonicalize(text) {
  if (!text) return '';
  let t = text.normalize('NFKD').replace(/\p{M}/gu, '');
  // Fullwidth ASCII to regular
  t = t.replace(/[\uFF21-\uFF5A]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0));
  // Confusables fold
  t = t.split('').map(ch => CONFUSABLES[ch] || ch).join('');
  // Leet fold
  t = t.split('').map(ch => LEET[ch] || ch).join('').toLowerCase();
  // Strip separators that split letters
  return t.replace(/[_\-.\s·•*+~^|\\/]+/g, '');
}

const BLOCKED_PATTERNS = [
  // URLs / domains
  /https?:\/\//,
  /www\./,
  /\.(com|net|org|io|dev|gg|xyz|ru|cn|tk|xxx|biz|info|co|uk|de)(\b|$)/,
  // Profanity / slurs
  /f+u+c+k/, /s+h+i+t/, /a+s+s+h+o+l+e/, /b+i+t+c+h/, /c+u+n+t/,
  /n+i+g+g/, /f+a+g+g?/, /r+e+t+a+r+d/, /k+i+k+e/, /s+p+i+c+k?/, /c+h+i+n+k/,
  /wh+o+r+e/, /s+l+u+t/, /p+o+r+n/, /hentai/, /x+v+i+d/, /x+h+a+m/,
  /p+e+n+i+s/, /v+a+g+i+n+a/, /p+u+s+s+y/, /d+i+c+k\b/,
  /k+i+l+l\s*(y+o+u+r+)?s+e+l+f/, /\bkys\b/, /s+u+i+c+i+d+e/,
  /n+a+z+i/, /h+i+t+l+e+r/, /h+o+l+o+c+a+u+s+t/,
  /r+a+p+e/, /m+o+l+e+s+t/,
];

function containsBlockedContent(text) {
  if (!text) return false;
  const raw = String(text).toLowerCase();
  const canon = canonicalize(text);
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(raw) || pattern.test(canon)) return true;
  }
  return false;
}

// --- Validation ---

function validateBuddy(body) {
  if (!body || typeof body !== 'object') return 'invalid body';
  if (!body.buddy_id || typeof body.buddy_id !== 'string') return 'missing buddy_id';
  if (!body.user_hash || typeof body.user_hash !== 'string') return 'missing user_hash';
  if (!body.name || typeof body.name !== 'string') return 'missing name';
  if (!body.species || typeof body.species !== 'string') return 'missing species';
  if (!body.rarity || typeof body.rarity !== 'string') return 'missing rarity';
  if (!body.eye || typeof body.eye !== 'string') return 'missing eye';
  if (!body.hat || typeof body.hat !== 'string') return 'missing hat';
  if (!body.stats || typeof body.stats !== 'object') return 'missing stats';

  if (body.buddy_id.length > 20) return 'buddy_id too long';
  if (body.user_hash.length > 64) return 'user_hash too long';
  if (body.name.length > 100) return 'name too long';
  if (body.personality && body.personality.length > 500) return 'personality too long';

  if (containsBlockedContent(body.name)) return 'name contains blocked content';
  if (containsBlockedContent(body.personality)) return 'personality contains blocked content';
  if (body.hatched_at != null && typeof body.hatched_at !== 'string' && typeof body.hatched_at !== 'number') return 'invalid hatched_at';
  if (typeof body.hatched_at === 'string' && body.hatched_at.length > 30) return 'invalid hatched_at';

  if (!VALID_SPECIES.has(body.species)) return 'invalid species';
  if (!VALID_RARITY.has(body.rarity)) return 'invalid rarity';
  if (!VALID_EYES.has(body.eye)) return 'invalid eye';
  if (!VALID_HATS.has(body.hat)) return 'invalid hat';

  const statKeys = Object.keys(body.stats);
  if (statKeys.length !== 5) return 'invalid stats';
  for (const key of statKeys) {
    if (!VALID_STATS.has(key)) return 'invalid stat name';
    const val = body.stats[key];
    if (typeof val !== 'number' || !Number.isInteger(val) || val < 0 || val > 100) return 'invalid stat value';
  }

  if (body.shiny !== undefined && typeof body.shiny !== 'boolean') return 'invalid shiny';

  return null;
}

// --- Handlers ---

async function handleSubmit(request, env) {
  const token = extractBearer(request);
  if (!token) return json({ error: 'missing or malformed Authorization header' }, 401, env, request);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'invalid JSON' }, 400, env, request);
  }
  const err = validateBuddy(body);
  if (err) return json({ error: err }, 400, env, request);

  const { buddy_id, user_hash, name, personality, species, rarity, eye, hat, shiny, stats, hatched_at } = body;
  const tokenHash = await sha256Hex(token);

  const existing = await env.DB.prepare(
    'SELECT auth_token_hash FROM buddies WHERE user_hash = ?'
  ).bind(user_hash).first();

  if (existing && existing.auth_token_hash && existing.auth_token_hash !== tokenHash) {
    return json({ error: 'forbidden' }, 403, env, request);
  }

  if (!existing) {
    try {
      await env.DB.prepare(`
        INSERT INTO buddies (buddy_id, user_hash, name, personality, species, rarity, eye, hat, shiny, stats, hatched_at, auth_token_hash)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        buddy_id,
        user_hash,
        name.slice(0, 100),
        personality ? personality.slice(0, 500) : null,
        species,
        rarity,
        eye,
        hat,
        shiny ? 1 : 0,
        JSON.stringify(stats),
        hatched_at || null,
        tokenHash,
      ).run();
    } catch {
      // Unique-conflict race on buddy_id — treat as forbidden.
      return json({ error: 'conflict' }, 409, env, request);
    }
  } else {
    await env.DB.prepare(`
      UPDATE buddies SET
        buddy_id = ?,
        name = ?,
        personality = ?,
        species = ?,
        rarity = ?,
        eye = ?,
        hat = ?,
        shiny = ?,
        stats = ?,
        hatched_at = ?,
        auth_token_hash = ?,
        submitted_at = datetime('now')
      WHERE user_hash = ?
    `).bind(
      buddy_id,
      name.slice(0, 100),
      personality ? personality.slice(0, 500) : null,
      species,
      rarity,
      eye,
      hat,
      shiny ? 1 : 0,
      JSON.stringify(stats),
      hatched_at || null,
      tokenHash,
      user_hash,
    ).run();
  }

  return json({ ok: true, buddy_id }, 200, env, request);
}

async function handleList(request, env) {
  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '100') || 100, 100);
  const offset = Math.max(parseInt(url.searchParams.get('offset') || '0') || 0, 0);
  const rarity = url.searchParams.get('rarity');
  const species = url.searchParams.get('species');

  let query = `SELECT ${BUDDY_PUBLIC_COLS} FROM buddies`;
  const conditions = [];
  const params = [];

  if (rarity) {
    if (!VALID_RARITY.has(rarity)) return json({ error: 'invalid rarity filter' }, 400, env, request);
    conditions.push('rarity = ?');
    params.push(rarity);
  }
  if (species) {
    if (!VALID_SPECIES.has(species)) return json({ error: 'invalid species filter' }, 400, env, request);
    conditions.push('species = ?');
    params.push(species);
  }

  if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
  query += ' ORDER BY submitted_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const { results } = await env.DB.prepare(query).bind(...params).all();

  let countQuery = 'SELECT COUNT(*) as total FROM buddies';
  if (conditions.length) countQuery += ' WHERE ' + conditions.join(' AND ');
  const countParams = params.slice(0, -2);
  const { results: countResults } = await env.DB.prepare(countQuery).bind(...countParams).all();
  const total = countResults[0]?.total || 0;

  const buddies = results.map(b => ({
    ...b,
    shiny: !!b.shiny,
    stats: safeParseStats(b.stats),
  }));

  return json({ buddies, total, limit, offset }, 200, env, request);
}

async function handleGetBuddy(request, env) {
  const url = new URL(request.url);
  const id = url.pathname.split('/').pop();
  if (!id || id.length > 20) return json({ error: 'invalid id' }, 400, env, request);

  const { results } = await env.DB.prepare(
    `SELECT ${BUDDY_PUBLIC_COLS} FROM buddies WHERE buddy_id = ?`
  ).bind(id).all();

  if (!results.length) return json({ error: 'not found' }, 404, env, request);

  const b = results[0];
  return json({ ...b, shiny: !!b.shiny, stats: safeParseStats(b.stats) }, 200, env, request);
}

async function handleSearch(request, env) {
  const url = new URL(request.url);
  const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
  if (!q) return json({ buddies: [] }, 200, env, request);

  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20') || 20, 50);
  const pattern = `%${q}%`;

  const { results } = await env.DB.prepare(
    `SELECT ${BUDDY_PUBLIC_COLS} FROM buddies WHERE name LIKE ? OR buddy_id LIKE ? ORDER BY submitted_at DESC LIMIT ?`
  ).bind(pattern, pattern, limit).all();

  const buddies = results.map(b => ({
    ...b,
    shiny: !!b.shiny,
    stats: safeParseStats(b.stats),
  }));

  return json({ buddies }, 200, env, request);
}

async function handleStats(request, env) {
  const { results } = await env.DB.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN rarity = 'common' THEN 1 ELSE 0 END) as common,
      SUM(CASE WHEN rarity = 'uncommon' THEN 1 ELSE 0 END) as uncommon,
      SUM(CASE WHEN rarity = 'rare' THEN 1 ELSE 0 END) as rare,
      SUM(CASE WHEN rarity = 'epic' THEN 1 ELSE 0 END) as epic,
      SUM(CASE WHEN rarity = 'legendary' THEN 1 ELSE 0 END) as legendary,
      SUM(CASE WHEN shiny = 1 THEN 1 ELSE 0 END) as shiny,
      COUNT(DISTINCT species || '|' || rarity || '|' || eye || '|' || hat || '|' || shiny) as unique_combos
    FROM buddies
  `).all();

  return json(results[0] || {}, 200, env, request);
}

export default {
  // --- [ARENA] cron battle handler ---
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runBattle(env));
  },
  // --- [/ARENA] ---

  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    }

    // Only trust cf-connecting-ip. No x-forwarded-for fallback.
    const ip = request.headers.get('cf-connecting-ip');
    if (!ip) {
      return json({ error: 'missing client ip' }, 400, env, request);
    }

    if (request.method === 'POST') {
      if (await isPostRateLimited(ip, env)) {
        return json({ error: 'rate limit exceeded' }, 429, env, request);
      }
    } else {
      if (isGetRateLimited(ip)) {
        evictStaleGetEntries();
        return json({ error: 'rate limit exceeded' }, 429, env, request);
      }
      evictStaleGetEntries();
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path === '/api/buddy' && request.method === 'POST') {
        return handleSubmit(request, env);
      }
      if (path.startsWith('/api/buddy/') && request.method === 'GET') {
        return handleGetBuddy(request, env);
      }
      if (path === '/api/buddies' && request.method === 'GET') {
        return handleList(request, env);
      }
      if (path === '/api/search' && request.method === 'GET') {
        return handleSearch(request, env);
      }
      if (path === '/api/stats' && request.method === 'GET') {
        return handleStats(request, env);
      }
      // --- [ARENA] battle system routes ---
      const arenaRes = await arenaRoute(path, request, env);
      if (arenaRes) return arenaRes;
      // --- [/ARENA] ---

      return json({ error: 'not found' }, 404, env, request);
    } catch (e) {
      return json({ error: 'internal error' }, 500, env, request);
    }
  },
};
