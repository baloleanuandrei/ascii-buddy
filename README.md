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

Saved to `~/ascii_buddy.svg` and automatically submitted to the **[Buddy Rolodex](https://buddy.pages.dev)** — a live gallery of every companion found in the wild.

## Rolodex

Every time someone runs `npx ascii-buddy`, their buddy is submitted to a public gallery at [buddy.pages.dev](https://buddy.pages.dev). No account needed — your buddy is keyed by a privacy-safe hash of your account ID.

Browse all buddies, filter by rarity, and see the global stats.

## Requirements

- [Claude Code](https://claude.ai/code) installed with a companion already hatched (run `/buddy` once first)
- [Bun](https://bun.sh) for exact hash matching (falls back to FNV-1a if unavailable, which may produce different results)
- Node.js 16+

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
key = accountUuid + "friend-2026-401"
hash = Bun.hash(key) & 0xFFFFFFFF    // wyhash, truncated to 32 bits
```

`accountUuid` comes from `~/.claude.json` → `oauthAccount.accountUuid`. The salt `"friend-2026-401"` is hardcoded in the binary.

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

## License

MIT
