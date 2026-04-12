// --- Arena Battle System ---
// Trump-card style auto-battles, 3 rounds per day (00:00, 08:00, 16:00 UTC)
// Delete this file to remove the arena feature.

const STATS = ['DEBUGGING', 'PATIENCE', 'CHAOS', 'WISDOM', 'SNARK'];
const ROUND_HOURS = { 0: 'R1', 8: 'R2', 16: 'R3' };

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function resolveMatch(a, b, trumpStat) {
  const valA = a.stats[trumpStat] || 0;
  const valB = b.stats[trumpStat] || 0;

  if (valA !== valB) {
    return valA > valB
      ? { winner: a, loser: b, statA: valA, statB: valB }
      : { winner: b, loser: a, statA: valA, statB: valB };
  }

  // Tiebreaker: random secondary stat
  const others = STATS.filter(s => s !== trumpStat);
  const tiebreak = others[Math.floor(Math.random() * others.length)];
  const tA = a.stats[tiebreak] || 0;
  const tB = b.stats[tiebreak] || 0;

  if (tA !== tB) {
    return tA > tB
      ? { winner: a, loser: b, statA: valA, statB: valB }
      : { winner: b, loser: a, statA: valA, statB: valB };
  }

  // Coin flip
  const coinWinner = Math.random() < 0.5 ? a : b;
  const coinLoser = coinWinner === a ? b : a;
  return { winner: coinWinner, loser: coinLoser, statA: valA, statB: valB };
}

export async function runBattle(env) {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const hour = now.getUTCHours();

  // Determine which round this is
  let roundLabel = null;
  for (const [h, label] of Object.entries(ROUND_HOURS)) {
    if (hour >= parseInt(h) && (roundLabel === null || parseInt(h) > parseInt(Object.entries(ROUND_HOURS).find(([, l]) => l === roundLabel)?.[0] || -1))) {
      roundLabel = label;
    }
  }
  if (!roundLabel) roundLabel = 'R1';

  const roundName = `${dateStr}-${roundLabel}`;

  // Guard double-execution
  const existing = await env.DB.prepare('SELECT id FROM battles WHERE round_name = ?').bind(roundName).first();
  if (existing) return;

  // Pick trump stat
  const trumpStat = STATS[Math.floor(Math.random() * STATS.length)];

  // Fetch all buddies
  const { results: buddies } = await env.DB.prepare('SELECT buddy_id, name, stats FROM buddies').all();
  if (!buddies || buddies.length < 2) return;

  // Parse stats (tolerate malformed rows)
  const parsed = buddies.map(b => {
    let stats = {};
    try {
      stats = typeof b.stats === 'string' ? JSON.parse(b.stats) : (b.stats || {});
    } catch { stats = {}; }
    return { buddy_id: b.buddy_id, name: b.name, stats };
  });

  // Shuffle and pair
  shuffle(parsed);
  const pairs = [];
  for (let i = 0; i + 1 < parsed.length; i += 2) {
    pairs.push([parsed[i], parsed[i + 1]]);
  }

  // Resolve matches
  const results = pairs.map(([a, b]) => {
    const result = resolveMatch(a, b, trumpStat);
    return { a, b, ...result };
  });

  // Build batch statements
  const stmts = [];

  // Insert battle
  stmts.push(
    env.DB.prepare('INSERT INTO battles (round_name, trump_stat, total_matches) VALUES (?, ?, ?)')
      .bind(roundName, trumpStat, results.length)
  );

  // We need the battle ID — use a subquery since D1 batch doesn't return lastRowId across statements
  // Insert match rows referencing the battle by round_name lookup
  for (const r of results) {
    stmts.push(
      env.DB.prepare(
        `INSERT INTO battle_rounds (battle_id, buddy_a, buddy_b, name_a, name_b, stat_a, stat_b, winner)
         VALUES ((SELECT id FROM battles WHERE round_name = ?), ?, ?, ?, ?, ?, ?, ?)`
      ).bind(roundName, r.a.buddy_id, r.b.buddy_id, r.a.name, r.b.name, r.statA, r.statB, r.winner.buddy_id)
    );
  }

  // Upsert battle records for each participant
  const winnerIds = new Set(results.map(r => r.winner.buddy_id));
  const loserIds = new Set(results.map(r => r.loser.buddy_id));
  const allParticipants = new Set([...winnerIds, ...loserIds]);

  for (const id of allParticipants) {
    const won = winnerIds.has(id);
    // Initialize record if not exists
    stmts.push(
      env.DB.prepare(
        'INSERT INTO battle_records (buddy_id, wins, losses, streak, best_streak) VALUES (?, 0, 0, 0, 0) ON CONFLICT(buddy_id) DO NOTHING'
      ).bind(id)
    );

    if (won) {
      stmts.push(
        env.DB.prepare(
          `UPDATE battle_records SET
            wins = wins + 1,
            streak = streak + 1,
            best_streak = MAX(best_streak, streak + 1)
          WHERE buddy_id = ?`
        ).bind(id)
      );
    } else {
      stmts.push(
        env.DB.prepare(
          'UPDATE battle_records SET losses = losses + 1, streak = 0 WHERE buddy_id = ?'
        ).bind(id)
      );
    }
  }

  await env.DB.batch(stmts);
}

// --- API Handlers ---

function json(data, status, request, env) {
  const origin = request?.headers?.get('Origin') || '';
  const origins = (env?.ALLOWED_ORIGINS || 'https://ascii-buddy.pages.dev').split(',');
  let allowed = '';
  for (const a of origins) {
    if (origin === a.trim()) { allowed = origin; break; }
  }

  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': allowed,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Vary': 'Origin',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'no-referrer',
    },
  });
}

async function handleLeaderboard(request, env) {
  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50') || 50, 500);
  const offset = Math.max(parseInt(url.searchParams.get('offset') || '0') || 0, 0);
  const sort = url.searchParams.get('sort') || 'wins';

  let orderBy = 'r.wins DESC';
  if (sort === 'winrate') orderBy = 'CAST(r.wins AS REAL) / MAX(r.wins + r.losses, 1) DESC, r.wins DESC';
  else if (sort === 'streak') orderBy = 'r.streak DESC, r.wins DESC';

  const { results } = await env.DB.prepare(`
    SELECT r.buddy_id, r.wins, r.losses, r.streak, r.best_streak,
           b.name, b.species, b.rarity, b.eye, b.hat, b.shiny
    FROM battle_records r
    JOIN buddies b ON b.buddy_id = r.buddy_id
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `).bind(limit, offset).all();

  const { results: countRes } = await env.DB.prepare('SELECT COUNT(*) as total FROM battle_records').all();
  const total = countRes[0]?.total || 0;

  return json({ records: results.map(r => ({ ...r, shiny: !!r.shiny })), total }, 200, request, env);
}

async function handleRecentBattles(request, env) {
  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '10') || 10, 50);

  const { results: battles } = await env.DB.prepare(
    'SELECT * FROM battles ORDER BY fought_at DESC LIMIT ?'
  ).bind(limit).all();

  if (!battles.length) return json({ battles: [] }, 200, request, env);

  // Fetch matches for each battle
  const battleIds = battles.map(b => b.id);
  const placeholders = battleIds.map(() => '?').join(',');
  const { results: rounds } = await env.DB.prepare(
    `SELECT * FROM battle_rounds WHERE battle_id IN (${placeholders}) ORDER BY id`
  ).bind(...battleIds).all();

  const roundsByBattle = {};
  for (const r of rounds) {
    if (!roundsByBattle[r.battle_id]) roundsByBattle[r.battle_id] = [];
    roundsByBattle[r.battle_id].push(r);
  }

  const result = battles.map(b => ({
    ...b,
    matches: roundsByBattle[b.id] || [],
  }));

  return json({ battles: result }, 200, request, env);
}

async function handleBattleDetail(request, env) {
  const url = new URL(request.url);
  const raw = url.pathname.split('/').pop();
  const id = Number(raw);
  if (!raw || !Number.isInteger(id) || id <= 0) return json({ error: 'invalid id' }, 400, request, env);

  const battle = await env.DB.prepare('SELECT * FROM battles WHERE id = ?').bind(id).first();
  if (!battle) return json({ error: 'not found' }, 404, request, env);

  const { results: matches } = await env.DB.prepare(
    'SELECT * FROM battle_rounds WHERE battle_id = ? ORDER BY id'
  ).bind(id).all();

  return json({ ...battle, matches }, 200, request, env);
}

async function handleBuddyRecord(request, env) {
  const url = new URL(request.url);
  const buddyId = url.pathname.split('/').pop();
  if (!buddyId || buddyId.length > 20) return json({ error: 'invalid id' }, 400, request, env);

  const record = await env.DB.prepare(
    'SELECT * FROM battle_records WHERE buddy_id = ?'
  ).bind(buddyId).first();

  if (!record) return json({ buddy_id: buddyId, wins: 0, losses: 0, streak: 0, best_streak: 0 }, 200, request, env);
  return json(record, 200, request, env);
}

async function handleBuddyProfile(request, env) {
  const url = new URL(request.url);
  const buddyId = url.pathname.split('/').pop();
  if (!buddyId || buddyId.length > 20) return json({ error: 'invalid id' }, 400, request, env);

  // Get buddy info
  const buddy = await env.DB.prepare(
    'SELECT buddy_id, name, species, rarity, eye, hat, shiny, stats FROM buddies WHERE buddy_id = ?'
  ).bind(buddyId).first();
  if (!buddy) return json({ error: 'not found' }, 404, request, env);

  // Get record
  const record = await env.DB.prepare(
    'SELECT wins, losses, streak, best_streak FROM battle_records WHERE buddy_id = ?'
  ).bind(buddyId).first() || { wins: 0, losses: 0, streak: 0, best_streak: 0 };

  // Get all battles this buddy was in, with full match + battle context
  const { results: matches } = await env.DB.prepare(`
    SELECT br.*, b.round_name, b.trump_stat, b.fought_at
    FROM battle_rounds br
    JOIN battles b ON b.id = br.battle_id
    WHERE br.buddy_a = ? OR br.buddy_b = ?
    ORDER BY b.fought_at DESC
    LIMIT 50
  `).bind(buddyId, buddyId).all();

  let parsedStats = {};
  try { parsedStats = JSON.parse(buddy.stats) || {}; } catch {}

  return json({
    buddy: { ...buddy, shiny: !!buddy.shiny, stats: parsedStats },
    record,
    battles: matches,
  }, 200, request, env);
}

// Route dispatcher — returns Response if matched, null otherwise
export async function arenaRoute(path, request, env) {
  if (!path.startsWith('/api/arena')) return null;

  if (path === '/api/arena/leaderboard' && request.method === 'GET') {
    return handleLeaderboard(request, env);
  }
  if (path === '/api/arena/battles' && request.method === 'GET') {
    return handleRecentBattles(request, env);
  }
  if (path.startsWith('/api/arena/battle/') && request.method === 'GET') {
    return handleBattleDetail(request, env);
  }
  if (path.startsWith('/api/arena/record/') && request.method === 'GET') {
    return handleBuddyRecord(request, env);
  }
  if (path.startsWith('/api/arena/profile/') && request.method === 'GET') {
    return handleBuddyProfile(request, env);
  }

  return null;
}
