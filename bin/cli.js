#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const OUTPUT_PATH = path.join(os.homedir(), 'ascii_buddy.svg');

// --- Companion data extraction ---

const SALT = 'friend-2026-401';
const RARITY_WEIGHTS = { common: 60, uncommon: 25, rare: 10, epic: 4, legendary: 1 };
const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
const RARITY_DISPLAY = {
  common:    { stars: 1, color: '#888888', label: 'COMMON' },
  uncommon:  { stars: 2, color: '#4ade80', label: 'UNCOMMON' },
  rare:      { stars: 3, color: '#60a5fa', label: 'RARE' },
  epic:      { stars: 4, color: '#c084fc', label: 'EPIC' },
  legendary: { stars: 5, color: '#facc15', label: 'LEGENDARY' },
};
const SPECIES = [
  'duck', 'goose', 'blob', 'cat', 'dragon', 'octopus', 'owl', 'penguin',
  'turtle', 'snail', 'ghost', 'axolotl', 'capybara', 'cactus', 'robot',
  'rabbit', 'mushroom', 'chonk',
];
const EYES = ['·', '✦', '×', '◉', '@', '°'];
const HATS = ['none', 'crown', 'tophat', 'propeller', 'halo', 'wizard', 'beanie', 'tinyduck'];
const STAT_NAMES = ['DEBUGGING', 'PATIENCE', 'CHAOS', 'WISDOM', 'SNARK'];
const BASE_STATS = { common: 5, uncommon: 15, rare: 25, epic: 35, legendary: 50 };

// ASCII faces per species — extracted from Claude Code binary (frame 0 for each)
// {E} placeholder is replaced with the eye character
const FACE_TEMPLATES = {
  duck:     ['            ', '    __      ', '  <({E} )___  ', '   (  ._>   ', "    `--\xB4    "],
  goose:    ['            ', '     ({E}>    ', '     ||     ', '   _(__)_   ', '    ^^^^    '],
  blob:     ['            ', '   .----.   ', '  ( {E}  {E} )  ', '  (      )  ', "   `----\xB4   "],
  cat:      ['            ', '   /\\_/\\    ', '  ( {E}   {E})  ', '  (  \u03C9  )   ', '  (")_(")   '],
  dragon:   ['            ', '  /^\\  /^\\  ', ' <  {E}  {E}  > ', ' (   ~~   ) ', "  `-vvvv-\xB4  "],
  octopus:  ['            ', '   .----.   ', '  ( {E}  {E} )  ', '  (______)  ', '  /\\/\\/\\/\\  '],
  owl:      ['            ', '   /\\  /\\   ', '  (({E})({E}))  ', '  (  ><  )  ', "   `----\xB4   "],
  penguin:  ['            ', '  .---.     ', '  ({E}>{E})     ', ' /(   )\\    ', "  `---\xB4     "],
  turtle:   ['            ', '   _,--._   ', '  ( {E}  {E} )  ', ' /[______]\\ ', '  ``    ``  '],
  snail:    ['            ', ' {E}    .--.  ', '  \\  ( @ )  ', "   \\_`--\xB4   ", '  ~~~~~~~   '],
  ghost:    ['            ', '   .----.   ', '  / {E}  {E} \\  ', '  |      |  ', '  ~`~``~`~  '],
  axolotl:  ['            ', '}~(______)~{', '}~({E} .. {E})~{', '  ( .--. )  ', '  (_/  \\_)  '],
  capybara: ['            ', '  n______n  ', ' ( {E}    {E} ) ', ' (   oo   ) ', "  `------\xB4  "],
  cactus:   ['            ', ' n  ____  n ', ' | |{E}  {E}| | ', ' |_|    |_| ', '   |    |   '],
  robot:    ['            ', '   .[||].   ', '  [ {E}  {E} ]  ', '  [ ==== ]  ', "  `------\xB4  "],
  rabbit:   ['            ', '   (\\__/)   ', '  ( {E}  {E} )  ', ' =(  ..  )= ', '  (")__(")  '],
  mushroom: ['            ', ' .-o-OO-o-. ', '(__________)', '   |{E}  {E}|   ', '   |____|   '],
  chonk:    ['            ', '  /\\    /\\  ', ' ( {E}    {E} ) ', ' (   ..   ) ', "  `------\xB4  "],
};

const HAT_ART = {
  none: '',
  crown: '   \\^^^/    ',
  tophat: '   [___]    ',
  propeller: '    -+-     ',
  halo: '   (   )    ',
  wizard: '    /^\\     ',
  beanie: '   (___)    ',
  tinyduck: '    ,>      ',
};

function buildFace(species, eye, hat) {
  const template = FACE_TEMPLATES[species] || FACE_TEMPLATES.chonk;
  const lines = template.map(l => l.replaceAll('{E}', eye));
  // If hat is not none and the first line is blank, replace it with hat art
  if (hat !== 'none' && !lines[0].trim()) {
    lines[0] = HAT_ART[hat] || lines[0];
  }
  // Remove leading blank line if first line is still empty
  if (!lines[0].trim()) lines.shift();
  return lines;
}

// Mulberry32 PRNG (from Claude Code binary)
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

// FNV-1a hash (fallback when Bun not available)
function fnv1a(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Bun is used ONLY if already installed on your system — we never auto-install it.
// It provides Bun.hash() which matches Claude Code's internal hash for exact stat
// generation. If Bun isn't found, we fall back to FNV-1a (stats may differ slightly).
function findBun() {
  const places = [
    path.join(os.homedir(), '.bun', 'bin', 'bun'),
    '/usr/local/bin/bun',
    '/opt/homebrew/bin/bun',
  ];
  for (const p of places) {
    if (fs.existsSync(p)) return p;
  }
  // Check PATH
  try {
    const which = require('child_process').execSync('which bun 2>/dev/null', { encoding: 'utf-8' }).trim();
    if (which) return which;
  } catch (e) {}
  return null;
}

function computeHash(input) {
  // Try Bun.hash first (matches Claude Code's behavior exactly)
  const bunPath = findBun();

  if (bunPath) {
    try {
      const script = `console.log(Number(BigInt(Bun.hash(process.argv[1]))&0xffffffffn))`;
      const result = require('child_process').execFileSync(
        bunPath,
        ['-e', script, input],
        { encoding: 'utf-8', timeout: 5000, stdio: ['pipe', 'pipe', 'ignore'] }
      );
      return parseInt(result.trim());
    } catch (e) {}
  }

  // Fall back to FNV-1a (may produce different results)
  console.log('  Warning: Bun not available, using FNV-1a fallback (stats may not match /buddy exactly)');
  return fnv1a(input);
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function generateBuddy(claudeJson) {
  const companion = claudeJson.companion;
  if (!companion) {
    console.error('No companion found in ~/.claude.json. Run /buddy in Claude Code first.');
    process.exit(1);
  }

  const userId = claudeJson.oauthAccount?.accountUuid ?? claudeJson.userID ?? 'anon';
  const key = userId + SALT;
  const hash = computeHash(key);
  const rng = mulberry32(hash);

  // Rarity
  const total = Object.values(RARITY_WEIGHTS).reduce((a, b) => a + b, 0);
  let r = rng() * total;
  let rarity = 'common';
  for (const k of RARITY_ORDER) {
    r -= RARITY_WEIGHTS[k];
    if (r < 0) { rarity = k; break; }
  }

  // Species, eye, hat, shiny
  const species = pick(rng, SPECIES);
  const eye = pick(rng, EYES);
  const hat = rarity === 'common' ? 'none' : pick(rng, HATS);
  const shiny = rng() < 0.01;

  // Stats
  const base = BASE_STATS[rarity];
  const high = pick(rng, STAT_NAMES);
  let low = pick(rng, STAT_NAMES);
  while (low === high) low = pick(rng, STAT_NAMES);
  const stats = {};
  for (const s of STAT_NAMES) {
    if (s === high) stats[s] = Math.min(100, base + 50 + Math.floor(rng() * 30));
    else if (s === low) stats[s] = Math.max(1, base - 10 + Math.floor(rng() * 15));
    else stats[s] = base + Math.floor(rng() * 40);
  }

  // Face
  const face = buildFace(species, eye, hat);

  return {
    name: companion.name,
    personality: companion.personality,
    hatchedAt: companion.hatchedAt,
    rarity,
    species,
    eye,
    hat,
    shiny,
    stats,
    face,
    display: RARITY_DISPLAY[rarity],
  };
}

// --- SVG rendering ---

function escapeXml(s, preserveSpaces = false) {
  let r = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  if (preserveSpaces) r = r.replace(/ /g, '&#160;');
  return r;
}

function renderBar(value, maxWidth) {
  const filled = Math.round((value / 100) * maxWidth);
  let bar = '';
  for (let i = 0; i < maxWidth; i++) {
    bar += i < filled ? '\u2588' : '\u2591';
  }
  return bar;
}

function wrapText(text, maxChars) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    if ((line + ' ' + word).trim().length > maxChars) {
      lines.push(line.trim());
      line = word;
    } else {
      line = line ? line + ' ' + word : word;
    }
  }
  if (line.trim()) lines.push(line.trim());
  return lines;
}

function generateSVG(buddy) {
  const W = 520;
  const FONT = "'SF Mono','Fira Code','JetBrains Mono','Cascadia Code',Menlo,Monaco,'Courier New',monospace";
  const BG = '#1a1a2e';
  const GREEN = buddy.display.color;
  const BORDER = buddy.shiny ? '#ffd700' : buddy.display.color;
  const DIM = '#6b7280';
  const WHITE = '#e5e7eb';

  let y = 45;
  const svgLines = [];

  const add = (text, opts = {}) => {
    const { color = GREEN, size = 14, italic = false, bold = false, dx = 35, mono = false } = opts;
    const style = `${italic ? 'font-style:italic;' : ''}${bold ? 'font-weight:bold;' : ''}`;
    svgLines.push(`<text x="${dx}" y="${y}" fill="${color}" font-size="${size}" font-family="${FONT}" style="${style}">${escapeXml(text, mono)}</text>`);
    y += size + 6;
  };

  // Rarity + Species header
  const stars = '\u2605'.repeat(buddy.display.stars);
  svgLines.push(`<text x="35" y="${y}" fill="${buddy.display.color}" font-size="15" font-family="${FONT}" font-weight="bold">${stars}  ${buddy.display.label}</text>`);
  svgLines.push(`<text x="${W - 35}" y="${y}" fill="${buddy.display.color}" font-size="15" font-family="${FONT}" font-weight="bold" text-anchor="end">${escapeXml(buddy.species.toUpperCase())}</text>`);
  y += 28;

  // ASCII face
  for (const fline of buddy.face) {
    add(fline, { color: GREEN, size: 15, mono: true });
  }
  y += 8;

  // Name
  add(buddy.name, { bold: true, size: 18, color: WHITE });
  y += 4;

  // Personality/description
  if (buddy.personality) {
    const descLines = wrapText(`"${buddy.personality}"`, 42);
    for (const dl of descLines) {
      add(dl, { italic: true, size: 13, color: DIM });
    }
  }
  y += 12;

  // Stats
  const BAR_WIDTH = 20;
  for (const s of STAT_NAMES) {
    const val = buddy.stats[s];
    const bar = renderBar(val, BAR_WIDTH);
    const label = s.padEnd(12);
    const valStr = String(val).padStart(3);
    add(`${label} ${bar} ${valStr}`, { color: WHITE, size: 13, mono: true });
  }
  y += 16;

  const H = y + 20;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" rx="12" fill="${BG}"/>
  <rect x="8" y="8" width="${W - 16}" height="${H - 16}" rx="8" fill="none" stroke="${BORDER}" stroke-width="2"/>
  ${svgLines.join('\n  ')}
</svg>`;
}

// --- Rolodex submission ---
//
// WHAT THIS SENDS to the rolodex API (buddy-api.hello-7b8.workers.dev):
//   - buddy_id       → deterministic ID derived from your user_hash + species + rarity
//   - user_hash      → SHA-256 of "ascii-buddy:user:" + your account UUID (NOT the UUID itself)
//   - Authorization  → "Bearer <token>" where token is SHA-256 of "ascii-buddy:auth:" + UUID.
//                      The server only stores SHA-256(token). Neither the UUID nor the token
//                      can be reversed back to your account. Domain separation means leaking
//                      user_hash never reveals the auth token.
//   - name, personality, species, rarity, eye, hat, shiny, stats, hatched_at
//
// WHAT THIS DOES NOT SEND:
//   - Your account UUID, email, API keys, or any real auth tokens
//   - Any data from your conversations or Claude Code usage
//   - Any system information (Cloudflare sees your IP as with any HTTP request)
//
// The API is a Cloudflare Worker that stores buddy data in a D1 database.
// Source code: https://github.com/baloleanuandrei/ascii-buddy

const API_URL = process.env.BUDDY_API || 'https://buddy-api.hello-7b8.workers.dev';

function sha256Hex(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

function deriveUserHash(userId) {
  // Domain-separated SHA-256, truncated to 24 hex chars (96 bits) for a short public key.
  return 'u_' + sha256Hex('ascii-buddy:user:' + userId).slice(0, 24);
}

function deriveAuthToken(userId) {
  // Domain-separated full SHA-256 (64 hex chars). Sent via Authorization header only.
  return sha256Hex('ascii-buddy:auth:' + userId);
}

function generateBuddyId(userHash, species, rarity) {
  // Deterministic 8-char ID. SHA-256 of (user_hash, species, rarity) keeps collisions
  // cryptographically unlikely instead of the old 32-bit hash.
  const digest = sha256Hex(`${userHash}:${species}:${rarity}`);
  const part1 = parseInt(digest.slice(0, 8), 16).toString(36).slice(0, 4).toUpperCase().padStart(4, '0');
  const part2 = parseInt(digest.slice(8, 16), 16).toString(36).slice(0, 4).toUpperCase().padStart(4, '0');
  return `${part1}-${part2}`;
}

async function submitToRolodex(buddy, userId) {
  const userHash = deriveUserHash(userId);
  const authToken = deriveAuthToken(userId);
  const buddyId = generateBuddyId(userHash, buddy.species, buddy.rarity);

  const payload = {
    buddy_id: buddyId,
    user_hash: userHash,
    name: buddy.name,
    personality: buddy.personality || null,
    species: buddy.species,
    rarity: buddy.rarity,
    eye: buddy.eye,
    hat: buddy.hat,
    shiny: buddy.shiny,
    stats: buddy.stats,
    hatched_at: buddy.hatchedAt || null,
  };

  try {
    const url = new URL(`${API_URL}/api/buddy`);
    const proto = url.protocol === 'https:' ? require('https') : require('http');
    const data = JSON.stringify(payload);

    return new Promise((resolve) => {
      const req = proto.request({
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
          'Authorization': 'Bearer ' + authToken,
        },
        timeout: 5000,
      }, (res) => {
        let body = '';
        res.on('data', c => body += c);
        res.on('end', () => {
          const status = res.statusCode;
          try {
            const parsed = JSON.parse(body);
            if (status === 200) resolve(parsed);
            else if (status === 401 || status === 403) resolve({ __authError: true, status });
            else resolve(false);
          } catch { resolve(false); }
        });
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => { req.destroy(); resolve(false); });
      req.write(data);
      req.end();
    });
  } catch {
    return false;
  }
}

// --- Main ---

// WHAT THIS READS:
// ~/.claude.json contains your Claude Code config. We read ONLY:
//   - companion.name        → your buddy's display name (set by you via /buddy)
//   - companion.personality → your buddy's personality text (set by you via /buddy)
//   - companion.hatchedAt   → when you created your buddy
//   - oauthAccount.accountUuid OR userID → used ONLY to generate a deterministic
//     seed for your buddy's species/rarity/stats. This is NEVER sent to the server
//     directly — it's hashed (SHA-256, domain-separated) into a one-way public
//     user_hash and an auth token — see deriveUserHash / deriveAuthToken above.
//
// We do NOT read or send: email, API keys, auth tokens, conversation history,
// or any other sensitive data from your Claude Code config.

const claudeJsonPath = path.join(os.homedir(), '.claude.json');
if (!fs.existsSync(claudeJsonPath)) {
  console.error('  ~/.claude.json not found. Is Claude Code installed?');
  process.exit(1);
}
const claudeJson = JSON.parse(fs.readFileSync(claudeJsonPath, 'utf-8'));

if (!claudeJson.companion) {
  console.error('');
  console.error('  No companion found in ~/.claude.json.');
  console.error('  To create your buddy:');
  console.error('    1. Open Claude Code');
  console.error('    2. Run /buddy');
  console.error('    3. Come back and run npx ascii-buddy again');
  console.error('');
  process.exit(1);
}

// Generate buddy from real data
const buddy = generateBuddy(claudeJson);
const svg = generateSVG(buddy);
fs.writeFileSync(OUTPUT_PATH, svg);

// Print summary
console.log('');
console.log(`  \u2705 Buddy card saved to: ${OUTPUT_PATH}`);
console.log(`  ${buddy.name} \u2014 ${'★'.repeat(buddy.display.stars)} ${buddy.display.label} ${buddy.species.toUpperCase()}`);
console.log(`  Stats: ${STAT_NAMES.map(s => `${s}:${buddy.stats[s]}`).join('  ')}`);
if (buddy.personality) console.log(`  "${buddy.personality.substring(0, 60)}..."`);

// Submit to rolodex
const userId = claudeJson.oauthAccount?.accountUuid ?? claudeJson.userID ?? 'anon';
submitToRolodex(buddy, userId).then(result => {
  if (result && result.buddy_id) {
    console.log(`  \uD83C\uDF10 Added to the ascii buddy rolodex!`);
    console.log(`  Your buddy ID: ${result.buddy_id}`);
    console.log(`  View it → https://asciibuddy.dev/#${result.buddy_id}`);
  } else if (result && result.__authError) {
    console.log('  (this buddy slot already belongs to another account — buddy saved locally only)');
  } else {
    console.log('  (could not reach rolodex — buddy saved locally only)');
  }
  console.log('');
});
