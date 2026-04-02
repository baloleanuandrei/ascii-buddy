// --- Rate limiting ---
// GET: simple 60/min
// POST: escalating tiers — tier 0: 5/min, tier 1: 1/min (30min), tier 2: 1/5min (1hr)

const getRateMap = new Map();
const postRateMap = new Map();   // ip → { tier, tierStart, windowStart, count }

const TIERS = [
  { max: 5,  window: 60_000,  cooldown: 0 },           // tier 0: 5 per minute
  { max: 1,  window: 60_000,  cooldown: 30 * 60_000 }, // tier 1: 1 per minute, 30min cooldown
  { max: 1,  window: 300_000, cooldown: 60 * 60_000 }, // tier 2: 1 per 5min, 1hr cooldown
];

function isPostRateLimited(ip) {
  const now = Date.now();
  let entry = postRateMap.get(ip);

  if (!entry) {
    postRateMap.set(ip, { tier: 0, tierStart: now, windowStart: now, count: 1 });
    return false;
  }

  const tier = TIERS[entry.tier];

  // Check if cooldown has expired → drop back to tier 0
  if (entry.tier > 0 && now - entry.tierStart > tier.cooldown) {
    entry.tier = 0;
    entry.tierStart = now;
    entry.windowStart = now;
    entry.count = 1;
    return false;
  }

  // Check if current window has expired → reset count
  if (now - entry.windowStart > tier.window) {
    entry.windowStart = now;
    entry.count = 1;
    return false;
  }

  entry.count++;
  if (entry.count > tier.max) {
    // Escalate to next tier
    const nextTier = Math.min(entry.tier + 1, TIERS.length - 1);
    if (nextTier > entry.tier) {
      entry.tier = nextTier;
      entry.tierStart = now;
    }
    return true;
  }

  return false;
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

function isRateLimited(ip, method) {
  return method === 'POST' ? isPostRateLimited(ip) : isGetRateLimited(ip);
}

// Evict stale entries periodically (prevent memory leak)
function evictStaleEntries() {
  const now = Date.now();
  for (const [key, entry] of getRateMap) {
    if (now - entry.start > 120_000) getRateMap.delete(key);
  }
  for (const [ip, entry] of postRateMap) {
    const tier = TIERS[entry.tier];
    const maxAge = Math.max(tier.cooldown, tier.window) + 60_000;
    if (now - entry.tierStart > maxAge) postRateMap.delete(ip);
  }
}

function isAllowedOrigin(origin, env) {
  if (!origin) return false;
  const origins = (env?.ALLOWED_ORIGINS || 'https://ascii-buddy.pages.dev').split(',');
  for (const allowed of origins) {
    if (origin === allowed) return true;
    // Allow Cloudflare Pages preview deployments (e.g. https://abc123.ascii-buddy.pages.dev)
    try {
      const host = new URL(allowed).hostname;
      if (origin.endsWith('.' + host) && origin.startsWith('https://')) return true;
    } catch {}
  }
  return false;
}

function corsHeaders(request, env) {
  const origin = request?.headers?.get('Origin') || '';
  const allowed = isAllowedOrigin(origin, env) ? origin : '';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
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
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    },
  });
}

// Allowed values (must match CLI)
const VALID_SPECIES = new Set([
  'duck', 'goose', 'blob', 'cat', 'dragon', 'octopus', 'owl', 'penguin',
  'turtle', 'snail', 'ghost', 'axolotl', 'capybara', 'cactus', 'robot',
  'rabbit', 'mushroom', 'chonk',
]);
const VALID_RARITY = new Set(['common', 'uncommon', 'rare', 'epic', 'legendary']);
const VALID_EYES = new Set(['·', '✦', '×', '◉', '@', '°']);
const VALID_HATS = new Set(['none', 'crown', 'tophat', 'propeller', 'halo', 'wizard', 'beanie', 'tinyduck']);
const VALID_STATS = new Set(['DEBUGGING', 'PATIENCE', 'CHAOS', 'WISDOM', 'SNARK']);

// --- Content filter ---
// Block profanity, slurs, URLs, and other garbage in free-text fields

const BLOCKED_PATTERNS = [
  // URLs and domains
  /https?:\/\//i,
  /www\./i,
  /\.com\b/i, /\.net\b/i, /\.org\b/i, /\.io\b/i, /\.dev\b/i, /\.gg\b/i, /\.xyz\b/i, /\.ru\b/i, /\.cn\b/i, /\.tk\b/i, /\.xxx\b/i,
  // Profanity / slurs (keeping patterns broad enough to catch variations)
  /\bf+u+c+k/i, /\bs+h+i+t/i, /\ba+s+s+h+o+l+e/i, /\bb+i+t+c+h/i, /\bc+u+n+t/i, /\bd+i+c+k/i,
  /\bn+i+g+g/i, /\bf+a+g+g?/i, /\br+e+t+a+r+d/i, /\bk+i+k+e/i, /\bs+p+i+c+k?\b/i, /\bc+h+i+n+k/i,
  /\bwh+o+r+e/i, /\bs+l+u+t/i, /\bp+o+r+n/i, /\bhentai/i, /\bx+v+i+d/i, /\bx+h+a+m/i,
  /\bp+e+n+i+s/i, /\bv+a+g+i+n+a/i, /\bc+o+c+k\b/i, /\bp+u+s+s+y/i, /\bb+o+o+b/i, /\bt+i+t+s\b/i,
  /\bk+i+l+l\s*(y+o+u+r+)?s+e+l+f/i, /\bkys\b/i, /\bs+u+i+c+i+d+e/i,
  /\bn+a+z+i/i, /\bh+i+t+l+e+r/i, /\bh+o+l+o+c+a+u+s+t/i,
  /\b(s+e+x+|r+a+p+e+|m+o+l+e+s+t)/i,
];

function containsBlockedContent(text) {
  if (!text) return false;
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(text)) return true;
  }
  return false;
}

// Validate buddy payload
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

  // Length limits
  if (body.buddy_id.length > 20) return 'buddy_id too long';
  if (body.user_hash.length > 30) return 'user_hash too long';
  if (body.name.length > 100) return 'name too long';
  if (body.personality && body.personality.length > 500) return 'personality too long';

  // Content filter on free-text fields
  if (containsBlockedContent(body.name)) return 'name contains blocked content';
  if (containsBlockedContent(body.personality)) return 'personality contains blocked content';
  if (body.hatched_at != null && typeof body.hatched_at !== 'string' && typeof body.hatched_at !== 'number') return 'invalid hatched_at';
  if (typeof body.hatched_at === 'string' && body.hatched_at.length > 30) return 'invalid hatched_at';

  // Whitelist validation
  if (!VALID_SPECIES.has(body.species)) return 'invalid species';
  if (!VALID_RARITY.has(body.rarity)) return 'invalid rarity';
  if (!VALID_EYES.has(body.eye)) return 'invalid eye';
  if (!VALID_HATS.has(body.hat)) return 'invalid hat';

  // Stats validation
  const statKeys = Object.keys(body.stats);
  if (statKeys.length !== 5) return 'invalid stats';
  for (const key of statKeys) {
    if (!VALID_STATS.has(key)) return 'invalid stat name';
    const val = body.stats[key];
    if (typeof val !== 'number' || !Number.isInteger(val) || val < 0 || val > 100) return 'invalid stat value';
  }

  // Boolean check
  if (body.shiny !== undefined && typeof body.shiny !== 'boolean') return 'invalid shiny';

  return null;
}

async function handleSubmit(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'invalid JSON' }, 400, env, request);
  }
  const err = validateBuddy(body);
  if (err) return json({ error: err }, 400, env, request);

  const { buddy_id, user_hash, name, personality, species, rarity, eye, hat, shiny, stats, hatched_at } = body;

  await env.DB.prepare(`
    INSERT INTO buddies (buddy_id, user_hash, name, personality, species, rarity, eye, hat, shiny, stats, hatched_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_hash) DO UPDATE SET
      buddy_id = excluded.buddy_id,
      name = excluded.name,
      personality = excluded.personality,
      species = excluded.species,
      rarity = excluded.rarity,
      eye = excluded.eye,
      hat = excluded.hat,
      shiny = excluded.shiny,
      stats = excluded.stats,
      hatched_at = excluded.hatched_at,
      submitted_at = datetime('now')
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
  ).run();

  return json({ ok: true, buddy_id }, 200, env, request);
}

async function handleList(request, env) {
  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '100') || 100, 100);
  const offset = Math.max(parseInt(url.searchParams.get('offset') || '0') || 0, 0);
  const rarity = url.searchParams.get('rarity');
  const species = url.searchParams.get('species');

  let query = 'SELECT * FROM buddies';
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

  if (conditions.length) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  query += ' ORDER BY submitted_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const { results } = await env.DB.prepare(query).bind(...params).all();

  // Get total count
  let countQuery = 'SELECT COUNT(*) as total FROM buddies';
  if (conditions.length) {
    countQuery += ' WHERE ' + conditions.join(' AND ');
  }
  const countParams = params.slice(0, -2); // remove limit/offset
  const { results: countResults } = await env.DB.prepare(countQuery).bind(...countParams).all();
  const total = countResults[0]?.total || 0;

  // Parse stats JSON for each buddy
  const buddies = results.map(b => ({
    ...b,
    shiny: !!b.shiny,
    stats: JSON.parse(b.stats),
  }));

  return json({ buddies, total, limit, offset }, 200, env, request);
}

async function handleGetBuddy(request, env) {
  const url = new URL(request.url);
  const id = url.pathname.split('/').pop();
  if (!id || id.length > 20) return json({ error: 'invalid id' }, 400, env, request);

  const { results } = await env.DB.prepare(
    'SELECT * FROM buddies WHERE buddy_id = ?'
  ).bind(id).all();

  if (!results.length) return json({ error: 'not found' }, 404, env, request);

  const b = results[0];
  return json({ ...b, shiny: !!b.shiny, stats: JSON.parse(b.stats) }, 200, env, request);
}

async function handleSearch(request, env) {
  const url = new URL(request.url);
  const q = (url.searchParams.get('q') || '').trim().slice(0, 100); // cap search length
  if (!q) return json({ buddies: [] }, 200, env, request);

  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20') || 20, 50);
  const pattern = `%${q}%`;

  const { results } = await env.DB.prepare(
    'SELECT * FROM buddies WHERE name LIKE ? OR buddy_id LIKE ? ORDER BY submitted_at DESC LIMIT ?'
  ).bind(pattern, pattern, limit).all();

  const buddies = results.map(b => ({
    ...b,
    shiny: !!b.shiny,
    stats: JSON.parse(b.stats),
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
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    }

    // Rate limiting
    const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown';
    if (isRateLimited(ip, request.method)) {
      evictStaleEntries();
      return json({ error: 'rate limit exceeded' }, 429, env, request);
    }
    evictStaleEntries();

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
      return json({ error: 'not found' }, 404, env, request);
    } catch (e) {
      return json({ error: 'internal error' }, 500, env, request);
    }
  },
};
