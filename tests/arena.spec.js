const { test, expect } = require('@playwright/test');

const API_BASE = 'http://localhost:8787';
const PROD_API = 'https://buddy-api.hello-7b8.workers.dev';

// Helper: intercept production API calls and proxy to local worker
async function routeApiToLocal(page) {
  await page.route(`${PROD_API}/**`, async (route) => {
    const url = route.request().url().replace(PROD_API, API_BASE);
    const response = await route.fetch({ url });
    await route.fulfill({ response });
  });
}

// ============================================================
// API Tests — verify backend battle logic, leaderboard, records
// ============================================================

test.describe('Arena API', () => {

  test('GET /api/arena/battles returns battle data with matches', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/arena/battles`);
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.battles).toBeDefined();
    expect(data.battles.length).toBeGreaterThan(0);

    const battle = data.battles[0];
    expect(battle.round_name).toMatch(/^\d{4}-\d{2}-\d{2}-R\d$/);
    expect(['DEBUGGING', 'PATIENCE', 'CHAOS', 'WISDOM', 'SNARK']).toContain(battle.trump_stat);
    expect(battle.total_matches).toBeGreaterThan(0);
    expect(battle.fought_at).toBeTruthy();
    expect(battle.matches).toBeDefined();
    expect(battle.matches.length).toBe(battle.total_matches);
  });

  test('battle matches have correct structure and valid winners', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/arena/battles?limit=1`);
    const data = await res.json();
    const battle = data.battles[0];

    for (const match of battle.matches) {
      expect(match.buddy_a).toBeTruthy();
      expect(match.buddy_b).toBeTruthy();
      expect(match.name_a).toBeTruthy();
      expect(match.name_b).toBeTruthy();
      expect(typeof match.stat_a).toBe('number');
      expect(typeof match.stat_b).toBe('number');
      expect(match.stat_a).toBeGreaterThanOrEqual(0);
      expect(match.stat_b).toBeGreaterThanOrEqual(0);
      // Winner must be one of the two participants
      expect([match.buddy_a, match.buddy_b]).toContain(match.winner);
    }
  });

  test('winners have higher or equal trump stat values', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/arena/battles?limit=1`);
    const data = await res.json();
    const battle = data.battles[0];

    for (const match of battle.matches) {
      const winnerStatVal = match.winner === match.buddy_a ? match.stat_a : match.stat_b;
      const loserStatVal = match.winner === match.buddy_a ? match.stat_b : match.stat_a;
      // Winner's trump stat should be >= loser's (ties resolved by secondary stat or coin flip)
      expect(winnerStatVal).toBeGreaterThanOrEqual(loserStatVal);
    }
  });

  test('GET /api/arena/leaderboard returns ranked records with buddy info', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/arena/leaderboard`);
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.records).toBeDefined();
    expect(data.total).toBeGreaterThan(0);
    expect(data.records.length).toBe(data.total);

    const first = data.records[0];
    expect(first.buddy_id).toBeTruthy();
    expect(first.name).toBeTruthy();
    expect(first.species).toBeTruthy();
    expect(first.rarity).toBeTruthy();
    expect(typeof first.wins).toBe('number');
    expect(typeof first.losses).toBe('number');
    expect(typeof first.streak).toBe('number');
    expect(typeof first.best_streak).toBe('number');
  });

  test('leaderboard is sorted by wins descending by default', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/arena/leaderboard`);
    const data = await res.json();

    for (let i = 1; i < data.records.length; i++) {
      expect(data.records[i - 1].wins).toBeGreaterThanOrEqual(data.records[i].wins);
    }
  });

  test('leaderboard sort=winrate works', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/arena/leaderboard?sort=winrate`);
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.records.length).toBeGreaterThan(0);

    // All winners should appear before all losers (since winrate is 100% vs 0%)
    const first = data.records[0];
    expect(first.wins).toBeGreaterThan(0);
  });

  test('leaderboard sort=streak works', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/arena/leaderboard?sort=streak`);
    expect(res.status()).toBe(200);
    const data = await res.json();

    for (let i = 1; i < data.records.length; i++) {
      expect(data.records[i - 1].streak).toBeGreaterThanOrEqual(data.records[i].streak);
    }
  });

  test('leaderboard limit and offset work', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/arena/leaderboard?limit=2&offset=0`);
    const data = await res.json();
    expect(data.records.length).toBe(2);
    expect(data.total).toBe(6); // 6 test buddies

    const res2 = await request.get(`${API_BASE}/api/arena/leaderboard?limit=2&offset=2`);
    const data2 = await res2.json();
    expect(data2.records.length).toBe(2);
    // Should be different buddies
    expect(data2.records[0].buddy_id).not.toBe(data.records[0].buddy_id);
  });

  test('GET /api/arena/record/:buddy_id returns correct record', async ({ request }) => {
    // Get a known winner from the leaderboard
    const lbRes = await request.get(`${API_BASE}/api/arena/leaderboard?limit=1`);
    const lbData = await lbRes.json();
    const winnerId = lbData.records[0].buddy_id;

    const res = await request.get(`${API_BASE}/api/arena/record/${winnerId}`);
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.buddy_id).toBe(winnerId);
    expect(data.wins).toBe(1);
    expect(data.losses).toBe(0);
    expect(data.streak).toBe(1);
  });

  test('GET /api/arena/record for unknown buddy returns zeroes', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/arena/record/ZZZZ-0000`);
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.wins).toBe(0);
    expect(data.losses).toBe(0);
  });

  test('GET /api/arena/battle/:id returns single battle detail', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/arena/battle/1`);
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.round_name).toBeTruthy();
    expect(data.trump_stat).toBeTruthy();
    expect(data.matches).toBeDefined();
    expect(data.matches.length).toBe(3); // 6 buddies = 3 pairs
  });

  test('GET /api/arena/battle with invalid id returns 400', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/arena/battle/abc`);
    expect(res.status()).toBe(400);
  });

  test('GET /api/arena/battle with nonexistent id returns 404', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/arena/battle/99999`);
    expect(res.status()).toBe(404);
  });

  test('double-execution guard prevents duplicate battles', async ({ request }) => {
    // Trigger scheduled again
    await request.get(`${API_BASE}/__scheduled`);

    // Should still have exactly 1 battle
    const res = await request.get(`${API_BASE}/api/arena/battles`);
    const data = await res.json();
    expect(data.battles.length).toBe(1);
  });

  test('wins + losses across all buddies is consistent', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/arena/leaderboard?limit=100`);
    const data = await res.json();

    const totalWins = data.records.reduce((sum, r) => sum + r.wins, 0);
    const totalLosses = data.records.reduce((sum, r) => sum + r.losses, 0);
    // Total wins must equal total losses (every match has one winner and one loser)
    expect(totalWins).toBe(totalLosses);
  });

  test('every buddy in the battle appears in battle_records', async ({ request }) => {
    const battlesRes = await request.get(`${API_BASE}/api/arena/battles`);
    expect(battlesRes.status()).toBe(200);
    const battlesData = await battlesRes.json();
    expect(battlesData.battles).toBeDefined();
    expect(battlesData.battles.length).toBeGreaterThan(0);
    const battle = battlesData.battles[0];

    const participantIds = new Set();
    for (const m of battle.matches) {
      participantIds.add(m.buddy_a);
      participantIds.add(m.buddy_b);
    }

    const lbRes = await request.get(`${API_BASE}/api/arena/leaderboard?limit=100`);
    expect(lbRes.status()).toBe(200);
    const lbData = await lbRes.json();
    expect(lbData.records).toBeDefined();
    const recordIds = new Set(lbData.records.map(r => r.buddy_id));

    for (const id of participantIds) {
      expect(recordIds.has(id)).toBe(true);
    }
  });
});

// ============================================================
// Frontend Tests — arena page, homepage injection
// ============================================================

test.describe('Arena Page UI', () => {

  test.beforeEach(async ({ page }) => {
    await routeApiToLocal(page);
  });

  test('arena page loads and shows title', async ({ page }) => {
    await page.goto('/arena.html');
    await expect(page.locator('.arena-title')).toHaveText('ARENA');
  });

  test('arena page shows countdown timer', async ({ page }) => {
    await page.goto('/arena.html');
    const countdown = page.locator('#countdown');
    await expect(countdown).toBeVisible();
    // Should show a time format HH:MM:SS
    await expect(countdown).toHaveText(/\d{2}:\d{2}:\d{2}/);
  });

  test('arena page shows battle schedule info', async ({ page }) => {
    await page.goto('/arena.html');
    await expect(page.locator('.arena-subtitle')).toContainText('3 rounds daily');
    await expect(page.locator('.arena-subtitle')).toContainText('00:00');
    await expect(page.locator('.arena-subtitle')).toContainText('08:00');
    await expect(page.locator('.arena-subtitle')).toContainText('16:00');
  });

  test('arena page has gallery link', async ({ page }) => {
    await page.goto('/arena.html');
    const link = page.locator('.arena-nav a');
    await expect(link).toHaveText('GALLERY');
    await expect(link).toHaveAttribute('href', 'index.html');
  });

  test('leaderboard loads with buddy records', async ({ page }) => {
    await page.goto('/arena.html', { waitUntil: 'networkidle' });
    await page.waitForSelector('.lb-row:not(.header)', { timeout: 15000 });

    const rows = page.locator('.lb-row:not(.header)');
    await expect(rows).toHaveCount(6); // 6 test buddies

    // First row should have a buddy name
    const firstName = await rows.first().locator('.lb-buddy-name').textContent();
    expect(firstName.length).toBeGreaterThan(0);
  });

  test('leaderboard shows rank numbers', async ({ page }) => {
    await page.goto('/arena.html');
    await page.waitForSelector('.lb-row:not(.header)');

    const ranks = page.locator('.lb-row:not(.header) .lb-rank');
    const firstRank = await ranks.first().textContent();
    expect(firstRank.trim()).toBe('1');
  });

  test('leaderboard shows W/L records', async ({ page }) => {
    await page.goto('/arena.html');
    await page.waitForSelector('.lb-row:not(.header)');

    const records = page.locator('.lb-row:not(.header) .lb-record');
    const firstRecord = await records.first().textContent();
    // Should contain numbers with W/L format like "1 / 0"
    expect(firstRecord).toMatch(/\d+\s*\/\s*\d+/);
  });

  test('leaderboard shows win rates', async ({ page }) => {
    await page.goto('/arena.html');
    await page.waitForSelector('.lb-row:not(.header)');

    const winrates = page.locator('.lb-row:not(.header) .lb-winrate');
    const firstWinrate = await winrates.first().textContent();
    expect(firstWinrate).toMatch(/\d+%/);
  });

  test('leaderboard shows species and rarity metadata', async ({ page }) => {
    await page.goto('/arena.html');
    await page.waitForSelector('.lb-row:not(.header)');

    const meta = page.locator('.lb-row:not(.header) .lb-buddy-meta');
    const firstMeta = await meta.first().textContent();
    // Should contain rarity and species like "rare cactus"
    expect(firstMeta.length).toBeGreaterThan(3);
  });

  test('sort buttons change leaderboard order', async ({ page }) => {
    await page.goto('/arena.html');
    await page.waitForSelector('.lb-row:not(.header)');

    // Click WIN RATE sort
    await page.click('.sort-btn[data-sort="winrate"]');
    await page.waitForTimeout(500);

    // Verify the active class moved
    await expect(page.locator('.sort-btn[data-sort="winrate"]')).toHaveClass(/active/);
    await expect(page.locator('.sort-btn[data-sort="wins"]')).not.toHaveClass(/active/);

    // Click STREAK sort
    await page.click('.sort-btn[data-sort="streak"]');
    await page.waitForTimeout(500);
    await expect(page.locator('.sort-btn[data-sort="streak"]')).toHaveClass(/active/);
  });

  test('recent battles section loads with battle cards', async ({ page }) => {
    await page.goto('/arena.html');
    await page.waitForSelector('.battle-card', { timeout: 10000 });

    const battleCards = page.locator('.battle-card');
    await expect(battleCards).toHaveCount(1); // We only ran 1 battle

    // Check battle has round name
    const roundName = await page.locator('.battle-round').first().textContent();
    expect(roundName).toMatch(/\d{4}-\d{2}-\d{2}-R\d/);
  });

  test('battle card shows trump stat', async ({ page }) => {
    await page.goto('/arena.html');
    await page.waitForSelector('.battle-trump', { timeout: 10000 });

    const trump = await page.locator('.battle-trump').first().textContent();
    expect(trump).toContain('TRUMP:');
    expect(trump).toMatch(/DEBUGGING|PATIENCE|CHAOS|WISDOM|SNARK/);
  });

  test('battle card shows match rows with VS', async ({ page }) => {
    await page.goto('/arena.html');
    await page.waitForSelector('.match-row', { timeout: 10000 });

    const matchRows = page.locator('.match-row');
    await expect(matchRows).toHaveCount(3); // 3 matches from 6 buddies

    // Each row should have a VS element
    const vsElements = page.locator('.match-vs');
    await expect(vsElements).toHaveCount(3);

    const firstVs = await vsElements.first().textContent();
    expect(firstVs).toBe('VS');
  });

  test('winners are highlighted in match rows', async ({ page }) => {
    await page.goto('/arena.html');
    await page.waitForSelector('.battle-card');

    // At least one match-name should have the 'winner' class
    const winners = page.locator('.match-name.winner');
    const count = await winners.count();
    expect(count).toBe(3); // 3 matches = 3 winners
  });

  test('match rows show stat scores', async ({ page }) => {
    await page.goto('/arena.html');
    await page.waitForSelector('.battle-card');

    const scores = page.locator('.match-score');
    const count = await scores.count();
    expect(count).toBe(6); // 2 scores per match * 3 matches

    // Each score should be a number
    const firstScore = await scores.first().textContent();
    expect(parseInt(firstScore)).toBeGreaterThanOrEqual(0);
  });

  test('battle card shows timestamp', async ({ page }) => {
    await page.goto('/arena.html');
    await page.waitForSelector('.battle-card');

    const time = await page.locator('.battle-time').first().textContent();
    expect(time.length).toBeGreaterThan(0);
  });
});

test.describe('Homepage Arena Integration', () => {

  test.beforeEach(async ({ page }) => {
    await routeApiToLocal(page);
  });

  test('homepage has arena link', async ({ page }) => {
    await page.goto('/index.html');
    const arenaLink = page.locator('a.arena-link');
    await expect(arenaLink).toBeVisible();
    await expect(arenaLink).toHaveText('ARENA');
    await expect(arenaLink).toHaveAttribute('href', 'arena.html');
  });

  test('arena link navigates to arena page', async ({ page }) => {
    await page.goto('/index.html');
    await page.click('a.arena-link');
    await page.waitForURL('**/arena.html');
    await expect(page.locator('.arena-title')).toHaveText('ARENA');
  });

  test('homepage buddy cards get W/L badges injected', async ({ page }) => {
    await page.goto('/index.html', { waitUntil: 'networkidle' });
    // Wait for cards to load
    await page.waitForSelector('.card', { timeout: 15000 });
    // Wait for arena-inject to run
    await page.waitForTimeout(2000);

    // At least some cards should have arena-record badges
    const badges = page.locator('.arena-record');
    const count = await badges.count();
    expect(count).toBeGreaterThan(0);
  });

  test('W/L badges show correct win/loss format', async ({ page }) => {
    await page.goto('/index.html');
    await page.waitForSelector('.card', { timeout: 10000 });
    await page.waitForTimeout(2000);

    const badge = page.locator('.arena-record').first();
    await expect(badge).toBeVisible();

    // Check it has W and L spans
    const wSpan = badge.locator('.ar-w');
    const lSpan = badge.locator('.ar-l');
    await expect(wSpan).toBeVisible();
    await expect(lSpan).toBeVisible();

    const wText = await wSpan.textContent();
    const lText = await lSpan.textContent();
    expect(wText).toMatch(/\d+W/);
    expect(lText).toMatch(/\d+L/);
  });

  test('W/L badge numbers match API data', async ({ page, request }) => {
    // Get leaderboard data from API
    const apiRes = await request.get(`${API_BASE}/api/arena/leaderboard?limit=100`);
    const apiData = await apiRes.json();
    const recordMap = {};
    for (const r of apiData.records) recordMap[r.buddy_id] = r;

    await page.goto('/index.html');
    await page.waitForSelector('.card', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Check at least one card's badge matches API data
    const cards = page.locator('.card[id]');
    const cardCount = await cards.count();

    let verified = 0;
    for (let i = 0; i < cardCount; i++) {
      const card = cards.nth(i);
      const id = await card.getAttribute('id');
      const buddyId = id?.replace('buddy-', '');
      const rec = recordMap[buddyId];
      if (!rec || (rec.wins === 0 && rec.losses === 0)) continue;

      const badge = card.locator('.arena-record');
      if (await badge.count() === 0) continue;

      const wText = await badge.locator('.ar-w').textContent();
      const lText = await badge.locator('.ar-l').textContent();
      expect(wText).toBe(`${rec.wins}W`);
      expect(lText).toBe(`${rec.losses}L`);
      verified++;
    }

    expect(verified).toBeGreaterThan(0);
  });
});
