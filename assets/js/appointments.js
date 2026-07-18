/* ── Appointments page logic ── */
(() => {
  const RDV_KEY = 'rdv_appointments';

  const TYPE_ICONS = {
    'Consultation': { icon: '🩺', cls: 'icon-consultation' },
    'Suivi':        { icon: '💊', cls: 'icon-suivi' },
    'Réunion':      { icon: '🤝', cls: 'icon-reunion' },
    'Urgence':      { icon: '🚨', cls: 'icon-urgence' },
  };

  /* ── Storage helpers ── */
  function loadRdvs() {
    try { return JSON.parse(localStorage.getItem(RDV_KEY) || '[]'); }
    catch { return []; }
  }

  function saveRdvs(list) {
    localStorage.setItem(RDV_KEY, JSON.stringify(list));
  }

  function seedIfEmpty() {
    if (loadRdvs().length > 0) return;
    const session = JSON.parse(localStorage.getItem('rdv_session') || 'null');
    const name = session ? session.name : 'Utilisateur';
    saveRdvs([
      { id: 1, client: name, date: '2025-07-10', time: '10:00', type: 'Consultation', status: 'Confirmé',  desc: 'Revue médicale et plan de suivi.' },
      { id: 2, client: name, date: '2025-07-12', time: '11:30', type: 'Suivi',        status: 'En attente', desc: 'Vérification des résultats.' },
      { id: 3, client: name, date: '2025-07-15', time: '14:00', type: 'Réunion',      status: 'En attente', desc: 'Discussion sur les prochaines étapes.' },
      { id: 4, client: name, date: '2025-07-18', time: '16:15', type: 'Consultation', status: 'Refusé',    desc: 'Consultation de contrôle.' },
    ]);
  }

  /* ── Render helpers ── */
  function statusBadge(status) {
    const map = {
      'Confirmé':   ['status-confirme',  '✅'],
      'En attente': ['status-attente',   '⏳'],
      'Refusé':     ['status-refuse',    '❌'],
    };
    const [cls, icon] = map[status] || ['status-attente', '⏳'];
    return `<span class="status-badge ${cls}">${icon} ${status}</span>`;
  }

  function typeIcon(type) {
    return TYPE_ICONS[type] || { icon: '📅', cls: 'icon-default' };
  }

  function formatDate(d) {
    if (!d) return '—';
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  }

  /* ── User detail modal ── */
  function openUserModal(id) {
    const rdv = loadRdvs().find(r => r.id === id);
    if (!rdv) return;
    const { icon, cls } = typeIcon(rdv.type);
    const statusMap = {
      'Confirmé':   { cls: 'status-confirme',  icon: '✅', msg: 'Votre rendez-vous est confirmé.' },
      'En attente': { cls: 'status-attente',   icon: '⏳', msg: 'En attente de confirmation par l\'administrateur.' },
      'Refusé':     { cls: 'status-refuse',    icon: '❌', msg: 'Ce rendez-vous a été refusé.' },
    };
    const s = statusMap[rdv.status] || statusMap['En attente'];

    document.getElementById('umodal-icon').className  = `rdv-card-icon ${cls}`;
    document.getElementById('umodal-icon').textContent = icon;
    document.getElementById('umodal-type').textContent   = rdv.type;
    document.getElementById('umodal-date').textContent   = formatDate(rdv.date);
    document.getElementById('umodal-time').textContent   = rdv.time;
    document.getElementById('umodal-desc').textContent   = rdv.desc || '—';
    const badge = document.getElementById('umodal-status');
    badge.className   = `status-badge ${s.cls}`;
    badge.textContent = `${s.icon} ${rdv.status}`;
    document.getElementById('umodal-status-msg').textContent = s.msg;
    document.getElementById('modal-user-detail').hidden = false;
  }

  function closeUserModal() {
    document.getElementById('modal-user-detail').hidden = true;
  }

  /* ── USER VIEW ── */
  function renderUserRdvs(filter = 'all') {
    const list = loadRdvs();
    const session = JSON.parse(localStorage.getItem('rdv_session') || 'null');
    const userName = session ? session.name : '';

    const mine = list.filter(r => !userName || r.client === userName);
    const filtered = filter === 'all' ? mine : mine.filter(r => r.status === filter);

    const container = document.getElementById('user-rdv-list');
    const empty     = document.getElementById('user-rdv-empty');
    container.innerHTML = '';

    if (filtered.length === 0) {
      empty.hidden = false;
      return;
    }
    empty.hidden = true;

    filtered.forEach((rdv, i) => {
      const { icon, cls } = typeIcon(rdv.type);
      const card = document.createElement('div');
      card.className = 'rdv-card';
      card.style.animationDelay = `${i * 0.06}s`;
      card.innerHTML = `
        <div class="rdv-card-icon ${cls}">${icon}</div>
        <div class="rdv-card-body">
          <div class="rdv-card-title">${rdv.type}</div>
          <div class="rdv-card-meta">
            <span>📅 ${formatDate(rdv.date)}</span>
            <span>🕐 ${rdv.time}</span>
            ${rdv.desc ? `<span>📝 ${rdv.desc}</span>` : ''}
          </div>
        </div>
        ${statusBadge(rdv.status)}
        <div class="rdv-card-actions">
          <button class="btn-detail" data-id="${rdv.id}">🔍 Détails</button>
        </div>
      `;
      container.appendChild(card);
    });

    container.querySelectorAll('.btn-detail').forEach(btn => {
      btn.addEventListener('click', () => openUserModal(+btn.dataset.id));
    });
  }

  /* ── ADMIN VIEW ── */
  function renderAdminStats() {
    const list = loadRdvs();
    const total   = list.length;
    const waiting = list.filter(r => r.status === 'En attente').length;
    const done    = list.filter(r => r.status === 'Confirmé').length;
    const el = document.getElementById('admin-stats');
    if (!el) return;
    el.innerHTML = `
      <div class="admin-stat-badge total">📋 ${total} total</div>
      <div class="admin-stat-badge waiting">⏳ ${waiting} en attente</div>
      <div class="admin-stat-badge done">✅ ${done} confirmés</div>
    `;
  }

  function renderAdminRdvs(filter = 'all') {
    const list = loadRdvs();
    const filtered = filter === 'all' ? list : list.filter(r => r.status === filter);

    const container = document.getElementById('admin-rdv-list');
    const empty     = document.getElementById('admin-rdv-empty');
    container.innerHTML = '';

    if (filtered.length === 0) {
      empty.hidden = false;
      return;
    }
    empty.hidden = true;

    filtered.forEach((rdv, i) => {
      const { icon, cls } = typeIcon(rdv.type);
      const card = document.createElement('div');
      card.className = 'rdv-card';
      card.style.animationDelay = `${i * 0.06}s`;

      const actionBtns = rdv.status === 'En attente'
        ? `<div class="rdv-card-actions">
             <button class="btn-confirm" data-id="${rdv.id}">✅ Confirmer</button>
             <button class="btn-refuse"  data-id="${rdv.id}">❌ Refuser</button>
             <button class="btn-detail"  data-id="${rdv.id}">🔍 Détails</button>
           </div>`
        : `<div class="rdv-card-actions">
             <button class="btn-detail" data-id="${rdv.id}">🔍 Détails</button>
           </div>`;

      card.innerHTML = `
        <div class="rdv-card-icon ${cls}">${icon}</div>
        <div class="rdv-card-body">
          <div class="rdv-card-title">${rdv.client} — ${rdv.type}</div>
          <div class="rdv-card-meta">
            <span>📅 ${formatDate(rdv.date)}</span>
            <span>🕐 ${rdv.time}</span>
            ${rdv.desc ? `<span>📝 ${rdv.desc}</span>` : ''}
          </div>
        </div>
        ${statusBadge(rdv.status)}
        ${actionBtns}
      `;
      container.appendChild(card);
    });

    // Confirm / Refuse inline
    container.querySelectorAll('.btn-confirm').forEach(btn => {
      btn.addEventListener('click', () => updateStatus(+btn.dataset.id, 'Confirmé'));
    });
    container.querySelectorAll('.btn-refuse').forEach(btn => {
      btn.addEventListener('click', () => updateStatus(+btn.dataset.id, 'Refusé'));
    });
    container.querySelectorAll('.btn-detail').forEach(btn => {
      btn.addEventListener('click', () => openAdminModal(+btn.dataset.id));
    });
  }

  function updateStatus(id, status) {
    const list = loadRdvs();
    const rdv = list.find(r => r.id === id);
    if (!rdv) return;
    rdv.status = status;
    saveRdvs(list);
    renderAdminRdvs(currentFilter);
    renderAdminStats();
  }

  /* ── Admin modal ── */
  let currentAdminRdv = null;

  function openAdminModal(id) {
    const rdv = loadRdvs().find(r => r.id === id);
    if (!rdv) return;
    currentAdminRdv = rdv;
    document.getElementById('modal-client').textContent = rdv.client;
    document.getElementById('modal-date').textContent   = formatDate(rdv.date);
    document.getElementById('modal-time').textContent   = rdv.time;
    document.getElementById('modal-type').textContent   = rdv.type;
    document.getElementById('modal-status').textContent = rdv.status;
    document.getElementById('modal-desc').textContent   = rdv.desc || '—';

    const confirmBtn = document.getElementById('modal-confirm-btn');
    const refuseBtn  = document.getElementById('modal-refuse-btn');
    confirmBtn.style.display = rdv.status === 'En attente' ? '' : 'none';
    refuseBtn.style.display  = rdv.status === 'En attente' ? '' : 'none';

    document.getElementById('rdv-modal').hidden = false;
  }

  function closeAdminModal() {
    document.getElementById('rdv-modal').hidden = true;
    currentAdminRdv = null;
  }

  /* ── Request modal (USER) ── */
  function openRequestModal() {
    const session = JSON.parse(localStorage.getItem('rdv_session') || 'null');
    if (session && session.isGuest) {
      alert('⚠️ Fonctionnalité réservée aux membres\n\nVous consultez en mode invité. Créez un compte gratuit pour demander un rendez-vous.');
      if (typeof window.navigateTo === 'function') window.navigateTo('./login.html');
      else window.location.href = './login.html';
      return;
    }
    document.getElementById('form-request').reset();
    document.getElementById('req-message').textContent = '';
    document.getElementById('modal-request').hidden = false;
  }

  function closeRequestModal() {
    document.getElementById('modal-request').hidden = true;
  }

  /* ── Filter state ── */
  let currentFilter = 'all';
  const role = (typeof getUserRole === 'function') ? getUserRole() : 'user';

  function bindFilters(viewId, renderFn) {
    const view = document.getElementById(viewId);
    if (!view) return;
    view.querySelectorAll('.appt-filter').forEach(btn => {
      btn.addEventListener('click', () => {
        view.querySelectorAll('.appt-filter').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        renderFn(currentFilter);
      });
    });
  }

  /* ── Init ── */
  function init() {
    seedIfEmpty();

    if (role === 'admin') {
      document.getElementById('view-admin').hidden = false;
      renderAdminStats();
      renderAdminRdvs('all');
      bindFilters('view-admin', (f) => { renderAdminRdvs(f); });

      // Admin modal events
      document.getElementById('rdv-modal-close').addEventListener('click', closeAdminModal);
      document.getElementById('modal-secondary').addEventListener('click', closeAdminModal);
      document.getElementById('rdv-modal').addEventListener('click', e => {
        if (e.target === document.getElementById('rdv-modal')) closeAdminModal();
      });
      document.getElementById('modal-confirm-btn').addEventListener('click', () => {
        if (!currentAdminRdv) return;
        updateStatus(currentAdminRdv.id, 'Confirmé');
        closeAdminModal();
      });
      document.getElementById('modal-refuse-btn').addEventListener('click', () => {
        if (!currentAdminRdv) return;
        updateStatus(currentAdminRdv.id, 'Refusé');
        closeAdminModal();
      });

    } else {
      document.getElementById('view-user').hidden = false;
      renderUserRdvs('all');
      bindFilters('view-user', (f) => { renderUserRdvs(f); });

      // Request modal events
      document.getElementById('btn-open-request').addEventListener('click', openRequestModal);
      const btn2 = document.getElementById('btn-open-request2');
      if (btn2) btn2.addEventListener('click', openRequestModal);
      document.getElementById('modal-request-close').addEventListener('click', closeRequestModal);
      document.getElementById('modal-request-cancel').addEventListener('click', closeRequestModal);
      document.getElementById('modal-request').addEventListener('click', e => {
        if (e.target === document.getElementById('modal-request')) closeRequestModal();
      });
      // User detail modal events
      document.getElementById('modal-user-detail-close').addEventListener('click', closeUserModal);
      document.getElementById('modal-user-detail').addEventListener('click', e => {
        if (e.target === document.getElementById('modal-user-detail')) closeUserModal();
      });
      document.getElementById('modal-user-detail-close2').addEventListener('click', closeUserModal);
      document.addEventListener('keydown', e => { if (e.key === 'Escape') closeUserModal(); });

      document.getElementById('form-request').addEventListener('submit', e => {
        e.preventDefault();
        const type = document.getElementById('req-type').value;
        const date = document.getElementById('req-date').value;
        const time = document.getElementById('req-time').value;
        const desc = document.getElementById('req-desc').value.trim();
        const msg  = document.getElementById('req-message');

        if (!type || !date || !time) {
          msg.textContent = 'Veuillez remplir tous les champs obligatoires.';
          return;
        }

        const session = JSON.parse(localStorage.getItem('rdv_session') || 'null');
        const list = loadRdvs();
        const newRdv = {
          id: Date.now(),
          client: session ? session.name : 'Utilisateur',
          date, time, type,
          status: 'En attente',
          desc,
        };
        list.push(newRdv);
        saveRdvs(list);
        closeRequestModal();
        renderUserRdvs(currentFilter);
      });
    }

    // Search
    const search = document.getElementById('search');
    if (search) {
      search.addEventListener('input', () => {
        const q = search.value.trim().toLowerCase();
        const list = loadRdvs();
        const filtered = q
          ? list.filter(r => `${r.client} ${r.type} ${r.status} ${r.desc}`.toLowerCase().includes(q))
          : list;

        if (role === 'admin') {
          const container = document.getElementById('admin-rdv-list');
          container.innerHTML = '';
          filtered.forEach((rdv, i) => {
            const { icon, cls } = typeIcon(rdv.type);
            const card = document.createElement('div');
            card.className = 'rdv-card';
            card.style.animationDelay = `${i * 0.06}s`;
            card.innerHTML = `
              <div class="rdv-card-icon ${cls}">${icon}</div>
              <div class="rdv-card-body">
                <div class="rdv-card-title">${rdv.client} — ${rdv.type}</div>
                <div class="rdv-card-meta">
                  <span>📅 ${formatDate(rdv.date)}</span>
                  <span>🕐 ${rdv.time}</span>
                </div>
              </div>
              ${statusBadge(rdv.status)}
            `;
            container.appendChild(card);
          });
        }
      });
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
