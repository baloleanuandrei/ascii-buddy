// Durable Object holding global POST rate-limit state keyed by IP.
// Tier 0: 5 req / 60s. Tier 1: 1 req / 60s (30 min cooldown). Tier 2: 1 req / 5 min (1 hr cooldown).

const TIERS = [
  { max: 5, window: 60_000,  cooldown: 0 },
  { max: 1, window: 60_000,  cooldown: 30 * 60_000 },
  { max: 1, window: 300_000, cooldown: 60 * 60_000 },
];

const MAX_ENTRIES = 10_000;
const ALARM_INTERVAL_MS = 5 * 60_000;

export class RateLimiter {
  constructor(state) {
    this.state = state;
    this.map = null;
    this.state.blockConcurrencyWhile(async () => {
      const stored = (await this.state.storage.get('map')) || {};
      this.map = new Map(Object.entries(stored));
      const alarm = await this.state.storage.getAlarm();
      if (alarm == null) {
        await this.state.storage.setAlarm(Date.now() + ALARM_INTERVAL_MS);
      }
    });
  }

  async fetch(request) {
    const url = new URL(request.url);
    const ip = url.searchParams.get('ip') || 'unknown';
    const now = Date.now();
    const limited = this.check(ip, now);
    this.evict(now);
    await this.persist();
    return new Response(JSON.stringify({ limited }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async alarm() {
    this.evict(Date.now());
    await this.persist();
    await this.state.storage.setAlarm(Date.now() + ALARM_INTERVAL_MS);
  }

  async persist() {
    await this.state.storage.put('map', Object.fromEntries(this.map));
  }

  check(ip, now) {
    let entry = this.map.get(ip);
    if (!entry) {
      if (this.map.size >= MAX_ENTRIES) this.dropOldest();
      this.map.set(ip, { tier: 0, tierStart: now, windowStart: now, count: 1, escalated: false, lastSeen: now });
      return false;
    }
    entry.lastSeen = now;

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

  dropOldest() {
    let oldestIp = null;
    let oldestSeen = Infinity;
    for (const [ip, entry] of this.map) {
      const seen = entry.lastSeen ?? entry.tierStart ?? 0;
      if (seen < oldestSeen) {
        oldestSeen = seen;
        oldestIp = ip;
      }
    }
    if (oldestIp != null) this.map.delete(oldestIp);
  }
}
