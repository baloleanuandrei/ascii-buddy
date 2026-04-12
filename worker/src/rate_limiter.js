// Durable Object holding global POST rate-limit state keyed by IP.
// Tier 0: 5 req / 60s. Tier 1: 1 req / 60s (30 min cooldown). Tier 2: 1 req / 5 min (1 hr cooldown).

const TIERS = [
  { max: 5, window: 60_000,  cooldown: 0 },
  { max: 1, window: 60_000,  cooldown: 30 * 60_000 },
  { max: 1, window: 300_000, cooldown: 60 * 60_000 },
];

export class RateLimiter {
  constructor(state) {
    this.state = state;
    this.map = new Map();
  }

  async fetch(request) {
    const url = new URL(request.url);
    const ip = url.searchParams.get('ip') || 'unknown';
    const now = Date.now();
    const limited = this.check(ip, now);
    this.evict(now);
    return new Response(JSON.stringify({ limited }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  check(ip, now) {
    let entry = this.map.get(ip);
    if (!entry) {
      this.map.set(ip, { tier: 0, tierStart: now, windowStart: now, count: 1, escalated: false });
      return false;
    }

    const tierConfig = TIERS[entry.tier];

    if (entry.tier > 0 && now - entry.tierStart > tierConfig.cooldown) {
      entry.tier = 0;
      entry.tierStart = now;
      entry.windowStart = now;
      entry.count = 1;
      entry.escalated = false;
      return false;
    }

    if (now - entry.windowStart > tierConfig.window) {
      entry.windowStart = now;
      entry.count = 1;
      entry.escalated = false;
      return false;
    }

    entry.count++;
    if (entry.count > tierConfig.max) {
      if (!entry.escalated) {
        const nextTier = Math.min(entry.tier + 1, TIERS.length - 1);
        if (nextTier > entry.tier) {
          entry.tier = nextTier;
          entry.tierStart = now;
          entry.windowStart = now;
        }
        entry.escalated = true;
      }
      return true;
    }

    return false;
  }

  evict(now) {
    for (const [ip, entry] of this.map) {
      const tier = TIERS[entry.tier];
      const maxAge = Math.max(tier.cooldown, tier.window) + 60_000;
      if (now - entry.tierStart > maxAge) this.map.delete(ip);
    }
  }
}
