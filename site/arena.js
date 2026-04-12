// --- Arena Frontend ---
// Delete this file to remove the arena feature.

const API_BASE = window.BUDDY_API || 'http://localhost:8787';

const RARITY_COLORS = {
  common: '#888888',
  uncommon: '#4ade80',
  rare: '#60a5fa',
  epic: '#c084fc',
  legendary: '#facc15',
};

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function clampStat(v) {
  return Math.max(0, Math.min(100, Number(v) || 0));
}

// --- Countdown Timer ---
function updateCountdown() {
  const now = new Date();
  const hours = [0, 8, 16];
  const utcH = now.getUTCHours();
  const utcM = now.getUTCMinutes();
  const utcS = now.getUTCSeconds();
  const nowMins = utcH * 60 + utcM;

  let nextMins = null;
  for (const h of hours) {
    if (h * 60 > nowMins) { nextMins = h * 60; break; }
  }
  if (nextMins === null) nextMins = 24 * 60;

  let diff = (nextMins * 60) - (nowMins * 60 + utcS);
  if (diff <= 0) diff += 24 * 3600;

  const hh = String(Math.floor(diff / 3600)).padStart(2, '0');
  const mm = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
  const ss = String(diff % 60).padStart(2, '0');

  document.getElementById('countdown').textContent = `${hh}:${mm}:${ss}`;
}

setInterval(updateCountdown, 1000);
updateCountdown();

// --- Leaderboard ---
let currentSort = 'wins';

async function fetchLeaderboard() {
  const container = document.getElementById('leaderboard');

  try {
    const res = await fetch(`${API_BASE}/api/arena/leaderboard?limit=50&sort=${currentSort}`);
    const data = await res.json();

    if (!data.records || data.records.length === 0) {
      container.innerHTML = '<div class="arena-empty">no battles fought yet. check back after the next round!</div>';
      return;
    }

    let html = '<div class="leaderboard-inner">';
    html += `<div class="lb-row header">
      <div class="lb-rank">#</div>
      <div>BUDDY</div>
      <div style="text-align:center">W / L</div>
      <div style="text-align:center">RATE</div>
      <div style="text-align:center">STREAK</div>
    </div>`;

    data.records.forEach((r, i) => {
      const rank = i + 1;
      const rankClass = rank <= 3 ? ` top-${rank}` : '';
      const total = r.wins + r.losses;
      const winrate = total > 0 ? Math.round((r.wins / total) * 100) : 0;
      const streakClass = r.streak >= 3 ? ' hot' : '';

      html += `<div class="lb-row clickable" data-buddy="${escapeHtml(r.buddy_id)}">
        <div class="lb-rank${rankClass}">${rank}</div>
        <div class="lb-name">
          <span class="lb-buddy-name">${escapeHtml(r.name)}</span>
          <span class="lb-buddy-id">${escapeHtml(r.buddy_id)}</span>
        </div>
        <div class="lb-record"><span class="lb-w">${r.wins}</span> / <span class="lb-l">${r.losses}</span></div>
        <div class="lb-winrate">${winrate}%</div>
        <div class="lb-streak${streakClass}">${r.streak > 0 ? r.streak : '-'}</div>
      </div>`;
    });

    html += '</div>';
    container.innerHTML = html;

    // Attach click handlers
    container.querySelectorAll('.lb-row.clickable').forEach(row => {
      row.addEventListener('click', () => {
        const buddyId = row.dataset.buddy;
        if (buddyId) showProfile(buddyId);
      });
    });
  } catch (e) {
    container.innerHTML = '<div class="arena-empty">failed to load leaderboard :(</div>';
    console.error(e);
  }
}

// Sort buttons
document.querySelectorAll('.sort-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentSort = btn.dataset.sort;
    fetchLeaderboard();
  });
});

// --- Buddy Profile ---
async function showProfile(buddyId) {
  const overlay = document.getElementById('profile-overlay');
  const content = document.getElementById('profile-content');
  content.innerHTML = '<div class="arena-loading">loading profile...</div>';
  overlay.hidden = false;

  try {
    const res = await fetch(`${API_BASE}/api/arena/profile/${encodeURIComponent(buddyId)}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    const b = data.buddy;
    const r = data.record;
    const color = RARITY_COLORS[b.rarity] || RARITY_COLORS.common;
    const total = r.wins + r.losses;
    const winrate = total > 0 ? Math.round((r.wins / total) * 100) : 0;

    const statNames = ['DEBUGGING', 'PATIENCE', 'CHAOS', 'WISDOM', 'SNARK'];
    const statsHtml = statNames.map(s => {
      const val = clampStat(b.stats[s]);
      return `<div class="prof-stat">
        <span class="prof-stat-label">${s}</span>
        <div class="prof-stat-bar"><div class="prof-stat-fill" style="width:${val}%;background:${color}"></div></div>
        <span class="prof-stat-val">${val}</span>
      </div>`;
    }).join('');

    let battlesHtml = '';
    if (data.battles.length === 0) {
      battlesHtml = '<div class="arena-empty">no battles yet</div>';
    } else {
      for (const m of data.battles) {
        const isA = m.buddy_a === buddyId;
        const myName = isA ? m.name_a : m.name_b;
        const oppName = isA ? m.name_b : m.name_a;
        const oppId = isA ? m.buddy_b : m.buddy_a;
        const myStat = isA ? m.stat_a : m.stat_b;
        const oppStat = isA ? m.stat_b : m.stat_a;
        const won = m.winner === buddyId;
        const resultClass = won ? 'win' : 'loss';
        const resultLabel = won ? 'WIN' : 'LOSS';

        const foughtAt = new Date(m.fought_at + 'Z');
        const timeStr = foughtAt.toLocaleString(undefined, {
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
        });

        battlesHtml += `<div class="prof-battle ${resultClass}">
          <div class="prof-battle-header">
            <span class="prof-battle-result ${resultClass}">${resultLabel}</span>
            <span class="prof-battle-round">${escapeHtml(m.round_name)}</span>
            <span class="prof-battle-time">${escapeHtml(timeStr)}</span>
          </div>
          <div class="prof-battle-detail">
            <span class="prof-battle-vs">vs <strong class="prof-opp-name" data-buddy="${escapeHtml(oppId)}">${escapeHtml(oppName)}</strong></span>
          </div>
          <div class="prof-battle-reason">
            TRUMP: <strong>${escapeHtml(m.trump_stat)}</strong>
            &mdash; ${escapeHtml(myName)} ${myStat} vs ${oppStat} ${escapeHtml(oppName)}
            ${myStat === oppStat ? ' (tiebreaker)' : ''}
          </div>
        </div>`;
      }
    }

    content.innerHTML = `
      <div class="prof-header">
        <div class="prof-info">
          <div class="prof-name">${escapeHtml(b.name)}${b.shiny ? ' <span class="prof-shiny">SHINY</span>' : ''}</div>
          <div class="prof-id" style="color:${color}">${escapeHtml(b.buddy_id)} &mdash; ${escapeHtml(b.rarity)} ${escapeHtml(b.species)}</div>
        </div>
        <div class="prof-record-box">
          <div class="prof-wl"><span class="lb-w">${r.wins}W</span> <span class="lb-l">${r.losses}L</span></div>
          <div class="prof-winrate">${winrate}% win rate</div>
          <div class="prof-streak">${r.streak > 0 ? r.streak + ' streak' : ''}${r.best_streak > 0 ? ' (best: ' + r.best_streak + ')' : ''}</div>
        </div>
      </div>
      <div class="prof-stats">${statsHtml}</div>
      <div class="prof-section-title">BATTLE HISTORY</div>
      <div class="prof-battles">${battlesHtml}</div>
    `;

    // Click opponent name to navigate to their profile
    content.querySelectorAll('.prof-opp-name').forEach(el => {
      el.style.cursor = 'pointer';
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        showProfile(el.dataset.buddy);
      });
    });
  } catch (e) {
    content.innerHTML = '<div class="arena-empty">failed to load profile :(</div>';
    console.error(e);
  }
}

function closeProfile() {
  document.getElementById('profile-overlay').hidden = true;
}

// Close on overlay click, close button, or escape
document.getElementById('profile-overlay')?.addEventListener('click', (e) => {
  if (e.target.id === 'profile-overlay') closeProfile();
});
document.getElementById('profile-close-btn')?.addEventListener('click', closeProfile);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeProfile();
});

// --- Recent Battles ---
async function fetchBattles() {
  const container = document.getElementById('battles');

  try {
    const res = await fetch(`${API_BASE}/api/arena/battles?limit=10`);
    const data = await res.json();

    if (!data.battles || data.battles.length === 0) {
      container.innerHTML = '<div class="arena-empty">no battles yet. first round coming soon!</div>';
      return;
    }

    container.innerHTML = '';

    for (const battle of data.battles) {
      const card = document.createElement('div');
      card.className = 'battle-card';

      const foughtAt = new Date(battle.fought_at + 'Z');
      const timeStr = foughtAt.toLocaleString(undefined, {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
      });

      let matchesHtml = '';
      for (const m of (battle.matches || [])) {
        const aWon = m.winner === m.buddy_a;
        const bWon = m.winner === m.buddy_b;
        matchesHtml += `<div class="match-row">
          <div class="match-buddy left">
            <span class="match-score">${m.stat_a}</span>
            <span class="match-name clickable${aWon ? ' winner' : ''}" data-buddy="${escapeHtml(m.buddy_a)}">${escapeHtml(m.name_a)}</span>
          </div>
          <div class="match-vs">VS</div>
          <div class="match-buddy right">
            <span class="match-name clickable${bWon ? ' winner' : ''}" data-buddy="${escapeHtml(m.buddy_b)}">${escapeHtml(m.name_b)}</span>
            <span class="match-score">${m.stat_b}</span>
          </div>
        </div>`;
      }

      card.innerHTML = `<div class="battle-inner">
        <div class="battle-header">
          <div>
            <div class="battle-round">${escapeHtml(battle.round_name)}</div>
            <div class="battle-time">${escapeHtml(timeStr)}</div>
          </div>
          <div class="battle-trump">TRUMP: ${escapeHtml(battle.trump_stat)}</div>
        </div>
        ${matchesHtml || '<div class="arena-empty">no matches in this round</div>'}
      </div>`;

      // Click buddy names in battles to open profile
      card.querySelectorAll('.match-name.clickable').forEach(el => {
        el.addEventListener('click', () => showProfile(el.dataset.buddy));
      });

      container.appendChild(card);
    }
  } catch (e) {
    container.innerHTML = '<div class="arena-empty">failed to load battles :(</div>';
    console.error(e);
  }
}

// Handle deep link: #profile-BUDDY-ID
function handleHash() {
  const hash = location.hash.slice(1);
  if (hash.startsWith('profile-')) {
    const buddyId = hash.slice(8);
    if (buddyId) showProfile(buddyId);
  }
}

// Init
fetchLeaderboard();
fetchBattles();
handleHash();
