# ascii-buddy

Export your [Claude Code](https://claude.ai/code) companion buddy as an SVG card.

```
npx ascii-buddy
```

That's it. One command. No permissions, no screenshots, no extra sessions.

## What it does

Claude Code has a built-in `/buddy` command that hatches a coding companion tied to your account. Each buddy has a unique rarity, species, stats, and personality — all deterministically generated from your account ID.

`ascii-buddy` reads your `~/.claude.json`, runs the same algorithm Claude Code uses internally, and renders your buddy as a shareable SVG card.

## Output

The SVG card includes:
- **Rarity** — Common, Uncommon, Rare, Epic, or Legendary (with star rating)
- **Species** — one of 18 types (chonk, cat, duck, ghost, robot, etc.)
- **ASCII art** — the exact face from Claude Code, with hat and eye style
- **Name & personality** — from your companion config
- **Stats** — DEBUGGING, PATIENCE, CHAOS, WISDOM, SNARK

Saved to `~/ascii_buddy.svg` and automatically submitted to the **[Buddy Rolodex](https://asciibuddy.dev)** — a live gallery of every companion found in the wild.

## Rolodex

Every time someone runs `npx ascii-buddy`, their buddy is submitted to a public gallery at [asciibuddy.dev](https://asciibuddy.dev). No account needed — your buddy is keyed by a privacy-safe hash of your account ID.

Browse all buddies, filter by rarity, and see the global stats.

## Privacy & transparency

This tool reads your `~/.claude.json` file and maintains a small sidecar file with a per-user secret. Here's exactly what it accesses and what it doesn't:

**What it reads (locally only):**
- `~/.claude.json` → `companion.name`, `companion.personality`, `companion.hatchedAt`
- `~/.config/ascii-buddy/secret` (`%APPDATA%\ascii-buddy\secret` on Windows) — a 64-hex random secret created on first run, mode `0600`. This is the sole source of your buddy identity.

**What it sends to the [rolodex API](https://buddy-api.hello-7b8.workers.dev):**
- Your buddy's generated attributes (name, personality, species, rarity, eye, hat, shiny, stats)
- A `user_hash` = `"u_" + first 24 hex of SHA-256("v2:" + secret)` — a public commitment to your secret
- `Authorization: Bearer <secret>` — over HTTPS only. The server verifies `user_hash` matches the bearer and stores `HMAC-SHA256(AUTH_PEPPER, secret)` keyed by a server-side Wrangler secret.

**What it does NOT read or send:**
- Your Claude account UUID (v2+ is entirely decoupled from your account)
- Email, API keys, auth tokens, or session data
- Conversation history or Claude Code usage data
- System information (OS, hostname, etc.)

**Upgrade note (v2.0.0):** earlier versions derived the auth token from your Claude account UUID with a hardcoded salt, which let anyone who knew your UUID impersonate you. v2 breaks that link entirely — see [security changelog](#v20-auth-rework) below.

The API is a Cloudflare Worker backed by a D1 database. All source code (CLI, worker, and site) is in this repo.

## Requirements

- [Claude Code](https://claude.ai/code) installed with a companion already hatched (run `/buddy` once first)
- Node.js 16+
- [Bun](https://bun.sh) (optional) — if installed, uses `Bun.hash()` for exact stat matching with Claude Code. Falls back to FNV-1a if unavailable, which may produce slightly different stats.

## How it works

Your buddy's stats aren't stored anywhere on disk. Claude Code generates them on the fly each time you run `/buddy`. Only three fields are persisted in `~/.claude.json`:

```json
{
  "companion": {
    "name": "Souptuft",
    "personality": "A rotund, googly-eyed disaster who'll...",
    "hatchedAt": 1775131144343
  }
}
```

Everything else — rarity, species, eye style, hat, shiny status, and all five stats — is computed at render time from a seeded PRNG. This tool reverse-engineered that pipeline from the Claude Code v2.1.90 binary to reproduce it exactly.

### The algorithm

**Step 1 — Seed**

```
key = sidecarSecret + "friend-2026-401"
hash = Bun.hash(key) & 0xFFFFFFFF    // wyhash, truncated to 32 bits
```

As of v2.0.0, the seed comes from the sidecar secret (`~/.config/ascii-buddy/secret`), not from your Claude account UUID. The salt `"friend-2026-401"` is unchanged. This means your buddy's look is stable across runs on the same machine but intentionally differs from the in-Claude-Code `/buddy` render (which still uses the account UUID).

**Step 2 — PRNG**

The hash seeds a [Mulberry32](https://gist.github.com/tommyettinger/46a874533244883189143505d203312c) pseudo-random number generator:

```js
function mulberry32(seed) {
  let s = seed >>> 0;
  return function () {
    s |= 0;
    s = (s + 1831565813) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

**Step 3 — Sequential rolls**

Each call to `rng()` produces the next number in the sequence. The order matters:

| Roll | What it determines | How |
|------|-------------------|-----|
| 1 | **Rarity** | Weighted: common 60%, uncommon 25%, rare 10%, epic 4%, legendary 1% |
| 2 | **Species** | Uniform pick from 18 species |
| 3 | **Eye style** | Uniform pick from `· ✦ × ◉ @ °` |
| 4 | **Hat** | Uniform pick (skipped if common rarity) |
| 5 | **Shiny** | 1% chance |
| 6 | **High stat** | Random stat gets boosted (+50 base + up to 30 random) |
| 7+ | **Low stat** | Random different stat gets nerfed (-10 base + up to 15 random) |
| 8-12 | **Remaining stats** | Each stat = base + up to 40 random |

Base stat values per rarity: common=5, uncommon=15, rare=25, epic=35, legendary=50.

### Species list

duck, goose, blob, cat, dragon, octopus, owl, penguin, turtle, snail, ghost, axolotl, capybara, cactus, robot, rabbit, mushroom, chonk

### Rarity odds

| Rarity | Weight | Chance | ~Users needed for one to exist |
|--------|--------|--------|-------------------------------|
| Common | 60 | 60% | 1 |
| Uncommon | 25 | 25% | 3 |
| Rare | 10 | 10% | 7 |
| Epic | 4 | 4% | 25 |
| Legendary | 1 | 1% | 100 |
| Shiny (any) | — | 1% | 100 |
| **Shiny + Legendary** | — | **0.01%** | **~10,000** |

Shiny is an independent 1% roll — any rarity can be shiny. A shiny buddy displays "✨ SHINY ✨" on its card. Getting both shiny AND legendary is the rarest possible combination.

### Uniqueness and collisions

**Will buddies repeat?** Yes and no.

The visual appearance (rarity + species + eye) draws from only **540 combinations** (5 × 18 × 6), so many users will share the same look. Two people can both have an uncommon chonk with @ eyes.

However, the full stat spread has billions of possible combinations, so exact stat-for-stat matches are unlikely in practice.

**The 32-bit wall.** The hash is truncated to 32 bits (~4.3 billion possible seeds). By the [birthday paradox](https://en.wikipedia.org/wiki/Birthday_problem), the first hash collision — two different accounts producing a *pixel-perfect identical* buddy (same rarity, species, eye, hat, shiny, and all 5 stats) — is expected around **~65,000 users**. Even then, their names will still differ since names are LLM-generated.

### What's NOT deterministic

The **name** and **personality** are generated by Claude (the LLM) during the hatching animation and stored in `~/.claude.json`. They are not derived from the seed.

### Version note

This was reverse-engineered from Claude Code **v2.1.90**. If Anthropic changes the salt, PRNG, or species list in a future version, the output may differ from `/buddy`. The core algorithm (hash → mulberry32 → sequential rolls) is unlikely to change.

## v2.0 auth rework

**Breaking change.** v1.x auth was derived from your Claude account UUID with a hardcoded salt, which meant anyone who learned your UUID could forge your bearer token and squat your `user_hash`. v2.0.0 replaces this with a per-user random secret stored in `~/.config/ascii-buddy/secret`.

All v1 buddies were wiped in the cutover — re-run `npx ascii-buddy` to claim a fresh one. The CLI auto-creates your sidecar on first run.

**Deploying the worker:**

```
cd worker
wrangler d1 migrations apply buddy-db          # applies 0002_v2_auth_cutover.sql
wrangler secret put AUTH_PEPPER                # any 32+ byte random value
wrangler deploy
```

Without `AUTH_PEPPER` set, the worker refuses to accept submits.

## Known limitations

- The HTML content filter is best-effort regex only and is trivially bypassable; it's not a security control.
- CSP `style-src` currently requires `'unsafe-inline'` because the card renderer injects inline `width:` styles; refactoring that is tracked separately.

## License

MIT
