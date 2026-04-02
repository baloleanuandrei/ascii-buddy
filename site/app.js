const API_BASE = window.BUDDY_API || 'https://buddy-api.hello-7b8.workers.dev';
const LIMIT = 60;

const RARITY_COLORS = {
  common: '#888888',
  uncommon: '#4ade80',
  rare: '#60a5fa',
  epic: '#c084fc',
  legendary: '#facc15',
};

const RARITY_STARS = {
  common: '★',
  uncommon: '★★',
  rare: '★★★',
  epic: '★★★★',
  legendary: '★★★★★',
};

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
  if (hat !== 'none' && !lines[0].trim()) {
    lines[0] = HAT_ART[hat] || lines[0];
  }
  if (!lines[0].trim()) lines.shift();
  return lines;
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function clampStat(val) {
  const n = parseInt(val) || 0;
  return Math.max(0, Math.min(100, n));
}

function safeColor(rarity) {
  return RARITY_COLORS[rarity] || RARITY_COLORS.common;
}

function renderCard(buddy) {
  const color = safeColor(buddy.rarity);
  const stars = RARITY_STARS[buddy.rarity] || '★';
  const face = buildFace(buddy.species, buddy.eye, buddy.hat);
  let stats;
  try {
    stats = typeof buddy.stats === 'string' ? JSON.parse(buddy.stats) : buddy.stats;
    if (!stats || typeof stats !== 'object') stats = {};
  } catch { stats = {}; }

  const statNames = ['DEBUGGING', 'PATIENCE', 'CHAOS', 'WISDOM', 'SNARK'];
  const statsHtml = statNames.map(s => {
    const val = clampStat(stats[s]);
    return `
      <div class="stat-row">
        <span class="stat-label">${s}</span>
        <div class="stat-bar"><div class="stat-fill" style="width:${val}%;background:${color}"></div></div>
        <span class="stat-val">${val}</span>
      </div>`;
  }).join('');

  const card = document.createElement('div');
  card.className = `card${buddy.shiny ? ' shiny' : ''}`;
  card.style.setProperty('--rarity-color', color);
  card.style.animationDelay = `${Math.random() * 0.15}s`;

  const buddyId = escapeHtml(buddy.buddy_id || '');
  card.id = buddyId ? `buddy-${buddyId}` : '';

  card.innerHTML = `
    <div class="card-inner">
      <div class="card-header">
        <span class="rarity-badge" style="color:${color}">${stars} ${escapeHtml(buddy.rarity || '').toUpperCase()}</span>
        <span class="species-badge">${escapeHtml(buddy.species)}</span>
      </div>
      <div class="card-face" style="color:${color}">${face.map(l => escapeHtml(l)).join('\n')}</div>
      <div class="card-name">${escapeHtml(buddy.name)}</div>
      ${buddyId ? `<div class="card-id" title="Click to copy link" style="cursor:pointer">${buddyId}</div>` : ''}
      ${buddy.personality ? `<div class="card-personality">"${escapeHtml(buddy.personality)}"</div>` : ''}
      <div class="card-stats">${statsHtml}</div>
    </div>
    <div class="card-btns"><div class="card-btn"></div><div class="card-btn"></div><div class="card-btn"></div></div>
  `;

  if (buddyId) {
    card.querySelector('.card-id').addEventListener('click', () => {
      const url = `${location.origin}${location.pathname}#${buddyId}`;
      navigator.clipboard.writeText(url).then(() => {
        const el = card.querySelector('.card-id');
        const orig = el.textContent;
        el.textContent = 'copied!';
        setTimeout(() => el.textContent = orig, 1200);
      });
    });
  }

  return card;
}

// State
let currentRarity = '';
let currentOffset = 0;
let totalBuddies = 0;

const grid = document.getElementById('grid');
const loading = document.getElementById('loading');
const empty = document.getElementById('empty');
const loadMore = document.getElementById('load-more');
const loadMoreBtn = document.getElementById('load-more-btn');

async function fetchBuddies(append = false) {
  if (!append) {
    grid.innerHTML = '';
    currentOffset = 0;
    loading.hidden = false;
    empty.hidden = true;
    loadMore.hidden = true;
  }

  const params = new URLSearchParams({ limit: LIMIT, offset: currentOffset });
  if (currentRarity) params.set('rarity', currentRarity);

  try {
    const res = await fetch(`${API_BASE}/api/buddies?${params}`);
    const data = await res.json();
    totalBuddies = data.total;

    loading.hidden = true;

    if (data.buddies.length === 0 && !append) {
      empty.hidden = false;
      return;
    }

    for (const buddy of data.buddies) {
      grid.appendChild(renderCard(buddy));
    }

    currentOffset += data.buddies.length;
    loadMore.hidden = currentOffset >= totalBuddies;
  } catch (e) {
    loading.textContent = 'failed to load buddies :(';
    console.error(e);
  }
}

async function fetchStats() {
  try {
    const res = await fetch(`${API_BASE}/api/stats`);
    const data = await res.json();
    const statsEl = document.getElementById('stats');
    statsEl.innerHTML = `
      <span class="stat"><span class="num">${data.total || 0}</span> buddies</span>
      <span class="stat" style="color:var(--legendary)"><span class="num">${data.legendary || 0}</span> legendary</span>
      <span class="stat" style="color:var(--epic)"><span class="num">${data.epic || 0}</span> epic</span>
      <span class="stat"><span class="num">${data.shiny || 0}</span> shiny</span>
    `;
  } catch (e) {}
}

// Search
const searchInput = document.getElementById('search');
let searchTimeout = null;
let currentSearch = '';

async function fetchSearch(query) {
  grid.innerHTML = '';
  loading.hidden = false;
  empty.hidden = true;
  loadMore.hidden = true;

  try {
    const res = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    loading.hidden = true;

    if (!data.buddies.length) {
      empty.hidden = false;
      empty.textContent = `no buddies matching "${query}"`;
      return;
    }
    for (const buddy of data.buddies) {
      grid.appendChild(renderCard(buddy));
    }
  } catch (e) {
    loading.textContent = 'search failed :(';
  }
}

searchInput.addEventListener('input', () => {
  clearTimeout(searchTimeout);
  const q = searchInput.value.trim();
  currentSearch = q;

  if (!q) {
    // Clear search, go back to normal listing
    empty.textContent = 'no buddies found yet. run npx ascii-buddy to add yours!';
    fetchBuddies();
    return;
  }

  searchTimeout = setTimeout(() => fetchSearch(q), 250);
});

// Filter buttons
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentRarity = btn.dataset.rarity;
    searchInput.value = '';
    currentSearch = '';
    fetchBuddies();
  });
});

// Load more
loadMoreBtn.addEventListener('click', () => fetchBuddies(true));

// Deep link: if URL has #BUDDY-ID, highlight that buddy
async function handleDeepLink() {
  const hash = location.hash.slice(1);
  if (!hash) return false;

  try {
    const res = await fetch(`${API_BASE}/api/buddy/${encodeURIComponent(hash)}`);
    if (!res.ok) return false;
    const buddy = await res.json();

    // Render the highlighted buddy at the top
    const card = renderCard(buddy);
    card.classList.add('highlighted');
    grid.prepend(card);
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return true;
  } catch {
    return false;
  }
}

// Init
fetchStats();
handleDeepLink().then(() => fetchBuddies());
