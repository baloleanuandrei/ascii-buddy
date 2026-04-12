// --- [ARENA] Win/Loss badges + profile viewer on homepage buddy cards ---
// Delete this file to remove arena features from the homepage.
(function () {
  const API_BASE = window.BUDDY_API || 'http://localhost:8787';
  const RARITY_COLORS = {
    common: '#888888', uncommon: '#4ade80', rare: '#60a5fa',
    epic: '#c084fc', legendary: '#facc15',
  };
  let recordMap = null;

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  // --- W/L Badges ---
  async function loadRecords() {
    if (recordMap) return;
    try {
      const res = await fetch(`${API_BASE}/api/arena/leaderboard?limit=9999`);
      const data = await res.json();
      recordMap = {};
      for (const r of data.records) recordMap[r.buddy_id] = r;
    } catch {
      recordMap = {};
    }
  }

  function decorateCard(card) {
    if (!recordMap || card.querySelector('.arena-record')) return;
    const id = (card.id || '').replace('buddy-', '');
    const rec = recordMap[id];
    if (!rec || (rec.wins === 0 && rec.losses === 0)) return;

    const badge = document.createElement('div');
    badge.className = 'arena-record';
    badge.innerHTML = `<span class="ar-w">${rec.wins}W</span> <span class="ar-l">${rec.losses}L</span>`;
    if (rec.streak >= 3) {
      badge.innerHTML += ` <span class="ar-s">${rec.streak}🔥</span>`;
    }
    const header = card.querySelector('.card-header');
    if (header) header.after(badge);
  }

  function makeCardClickable(card) {
    if (card.dataset.arenaClick) return;
    card.dataset.arenaClick = '1';
    const id = (card.id || '').replace('buddy-', '');
    if (!id) return;
    card.style.cursor = 'pointer';
    card.addEventListener('click', (e) => {
      // Don't intercept clicks on the copy-link ID or other interactive elements
      if (e.target.closest('.card-id')) return;
      showProfile(id);
    });
  }

  // --- Profile Overlay ---
  function createOverlay() {
    if (document.getElementById('profile-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'profile-overlay';
    overlay.className = 'profile-overlay';
    overlay.hidden = true;
    overlay.innerHTML = `<div class="profile-modal">
      <button class="profile-close" id="profile-close-btn">&times;</button>
      <div id="profile-content"></div>
    </div>`;
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeProfile();
    });
    document.getElementById('profile-close-btn').addEventListener('click', closeProfile);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeProfile();
    });
  }

  function closeProfile() {
    const overlay = document.getElementById('profile-overlay');
    if (overlay) overlay.hidden = true;
  }

  async function showProfile(buddyId) {
    createOverlay();
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
        const val = b.stats[s] || 0;
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

  // --- Init ---
  const grid = document.getElementById('grid');
  if (!grid) return;

  loadRecords().then(() => {
    grid.querySelectorAll('.card').forEach(c => { decorateCard(c); makeCardClickable(c); });

    new MutationObserver(mutations => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.classList?.contains('card')) {
            decorateCard(node);
            makeCardClickable(node);
          }
        }
      }
    }).observe(grid, { childList: true });
  });
})();
