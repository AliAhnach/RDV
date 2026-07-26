/* ── Appointments page logic ── */
(() => {
  const API_ROOT = typeof API_BASE === 'string'
    ? API_BASE
    : 'https://aliahnach.pythonanywhere.com/api';
  const APPOINTMENTS_API = `${API_ROOT}/appointments`;
  const STATUS_REFRESH_DELAY = 15000;

  const TYPE_ICONS = {
    'Consultation': 'icon-consultation',
    'Suivi':        'icon-suivi',
    'Réunion':      'icon-reunion',
    'Urgence':      'icon-urgence',
  };

  let currentAppointments = [];
  let refreshTimer = null;

  /* ── Storage helpers ── */
  function loadSession() {
    return typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  }

  function getCurrentRole() {
    const session = loadSession();
    return session && String(session.role).toLowerCase() === 'admin' ? 'admin' : 'user';
  }

  function normalizeAppointment(appointment) {
    const client = appointment.user_name
      || appointment.client
      || appointment.client_name
      || appointment.user_fullname
      || appointment.fullname
      || appointment.user?.fullname
      || appointment.user?.name;

    return {
      ...appointment,
      // Keep the existing renderer contract while accepting Flask's API fields.
      type: appointment.service ?? appointment.service_name ?? appointment.type ?? '—',
      date: appointment.appointment_date ?? appointment.date,
      time: appointment.appointment_time ?? appointment.time,
      desc: appointment.description ?? appointment.desc,
      status: appointment.status ?? 'En attente',
      user_id: appointment.user_id ?? appointment.userId,
      client: client || `Utilisateur #${appointment.user_id ?? appointment.userId ?? 'inconnu'}`,
    };
  }

  async function readApiResponse(res) {
    const body = await res.text();
    let data = {};

    if (body) {
      try {
        data = JSON.parse(body);
      } catch {
        throw new Error(res.ok ? 'Réponse invalide du serveur.' : `Erreur HTTP ${res.status}`);
      }
    }

    if (!res.ok) {
      throw new Error(data.message || data.error || `Erreur HTTP ${res.status}`);
    }
    if (data.success === false) {
      throw new Error(data.message || data.error || 'La requête a échoué.');
    }
    return data;
  }

  async function loadAppointments() {
    const session = loadSession();

    try {
      if (!session || !session.id) {
        currentAppointments = [];
        return [];
      }

      // The client view is filtered below.  Keeping a single read endpoint
      // avoids a second API contract while preserving the admin list.
      const res = await apiFetch(APPOINTMENTS_API);
      const data = await readApiResponse(res);
      const source = Array.isArray(data) ? data : data.appointments;
      const appointments = Array.isArray(source)
        ? source.map(normalizeAppointment)
        : [];
      currentAppointments = appointments;
      return appointments;
    } catch (error) {
      console.error('Impossible de charger les rendez-vous :', error);
      currentAppointments = [];
      return [];
    }
  }

  /* ── Render helpers ── */
  function statusBadge(status) {
    const map = {
      'Confirmé':   'status-confirme',
      'En attente': 'status-attente',
      'Refusé':     'status-refuse',
    };
    const cls = map[status] || 'status-attente';
    return `<span class="status-badge ${cls}">${status}</span>`;
  }

  function typeIcon(type) {
    return TYPE_ICONS[type] || 'icon-default';
  }

  function appointmentIcon() {
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4m8-4v4M3 10h18"/></svg>`;
  }

  function actionIcon(name) {
    const paths = {
      confirm: '<path d="m5 12 4 4L19 6"/>',
      refuse: '<path d="m6 6 12 12M18 6 6 18"/>',
      detail: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
      delete: '<path d="M4 7h16M10 11v6m4-6v6M9 7l1-3h4l1 3M6 7l1 14h10l1-14"/>',
      clock: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
      note: '<path d="M5 3h10l4 4v14H5zM15 3v5h5M8 12h8m-8 4h6"/>',
    };
    return `<svg class="inline-icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || ''}</svg>`;
  }

  function showFeedback(message, isError = false) {
    const feedback = document.querySelector(
      `${getCurrentRole() === 'admin' ? '#view-admin' : '#view-user'} .appointment-feedback`
    );
    if (!feedback) return;
    feedback.textContent = message;
    feedback.className = `appointment-feedback${isError ? ' appointment-feedback--error' : ''}`;
    feedback.hidden = false;
    window.setTimeout(() => { feedback.hidden = true; }, 3500);
  }

  function formatDate(d) {
    if (!d) return '—';
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  }

  /* ── User detail modal ── */
  function openUserModal(id) {
    const rdv = currentAppointments.find(r => String(r.id) === String(id));
    if (!rdv) return;
    const cls = typeIcon(rdv.type);
    const statusMap = {
      'Confirmé':   { cls: 'status-confirme', msg: 'Votre rendez-vous est confirmé.' },
      'En attente': { cls: 'status-attente', msg: 'En attente de confirmation par l\'administrateur.' },
      'Refusé':     { cls: 'status-refuse', msg: 'Ce rendez-vous a été refusé.' },
    };
    const s = statusMap[rdv.status] || statusMap['En attente'];

    document.getElementById('umodal-icon').className  = `rdv-card-icon ${cls}`;
    document.getElementById('umodal-icon').innerHTML = appointmentIcon();
    document.getElementById('umodal-type').textContent   = rdv.type;
    document.getElementById('umodal-date').textContent   = formatDate(rdv.date);
    document.getElementById('umodal-time').textContent   = rdv.time;
    document.getElementById('umodal-desc').textContent   = rdv.desc || '—';
    const badge = document.getElementById('umodal-status');
    badge.className   = `status-badge ${s.cls}`;
    badge.textContent = rdv.status;
    document.getElementById('umodal-status-msg').textContent = s.msg;
    document.getElementById('modal-user-detail').hidden = false;
  }

  function closeUserModal() {
    document.getElementById('modal-user-detail').hidden = true;
  }

  /* ── USER VIEW ── */
  async function renderUserRdvs(filter = 'all') {
    const list = currentAppointments.length ? currentAppointments : await loadAppointments();
    const session = loadSession();
    const userId = session && session.id;

    const mine = list.filter(r => String(r.user_id) === String(userId));
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
      const cls = typeIcon(rdv.type);
      const card = document.createElement('div');
      card.className = 'rdv-card';
      card.dataset.rdvId = rdv.id;
      card.style.animationDelay = `${i * 0.06}s`;
      card.innerHTML = `
        <div class="rdv-card-icon ${cls}">${appointmentIcon()}</div>
        <div class="rdv-card-body">
          <div class="rdv-card-title">${rdv.type}</div>
          <div class="rdv-card-meta">
            <span>${appointmentIcon()} ${formatDate(rdv.date)}</span>
            <span>${actionIcon('clock')} ${rdv.time}</span>
            ${rdv.desc ? `<span>${actionIcon('note')} ${rdv.desc}</span>` : ''}
          </div>
        </div>
        ${statusBadge(rdv.status)}
        <div class="rdv-card-actions">
          <button class="btn-detail" data-id="${rdv.id}">${actionIcon('detail')}Détails</button>
        </div>
      `;
      container.appendChild(card);
    });

    container.querySelectorAll('.btn-detail').forEach(btn => {
      btn.addEventListener('click', () => openUserModal(+btn.dataset.id));
    });
  }

  /* ── ADMIN VIEW ── */
  async function renderAdminStats() {
    const list = currentAppointments.length ? currentAppointments : await loadAppointments();
    const total   = list.length;
    const waiting = list.filter(r => r.status === 'En attente').length;
    const done    = list.filter(r => r.status === 'Confirmé').length;
    const el = document.getElementById('admin-stats');
    if (!el) return;
    el.innerHTML = `
      <div class="admin-stat-badge total">${total} total</div>
      <div class="admin-stat-badge waiting">${waiting} en attente</div>
      <div class="admin-stat-badge done">${done} confirmés</div>
    `;
  }

  async function renderAdminRdvs(filter = 'all') {
    const list = currentAppointments.length ? currentAppointments : await loadAppointments();
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
      const cls = typeIcon(rdv.type);
      const card = document.createElement('div');
      card.className = 'rdv-card';
      card.dataset.rdvId = rdv.id;
      card.style.animationDelay = `${i * 0.06}s`;

      const statusActions = rdv.status === 'En attente'
        ? `<button class="btn-confirm" data-id="${rdv.id}">${actionIcon('confirm')}Confirmer</button>
           <button class="btn-refuse"  data-id="${rdv.id}">${actionIcon('refuse')}Refuser</button>`
        : '';
      const actionBtns = `<div class="rdv-card-actions">
        ${statusActions}
        <button class="btn-detail" data-id="${rdv.id}">${actionIcon('detail')}Détails</button>
        <button class="btn-refuse btn-delete" data-id="${rdv.id}">${actionIcon('delete')}Supprimer</button>
      </div>`;

      card.innerHTML = `
        <div class="rdv-card-icon ${cls}">${appointmentIcon()}</div>
        <div class="rdv-card-body">
          <div class="rdv-card-title">${rdv.client} — ${rdv.type}</div>
          <div class="rdv-card-meta">
            <span>${appointmentIcon()} ${formatDate(rdv.date)}</span>
            <span>${actionIcon('clock')} ${rdv.time}</span>
            ${rdv.desc ? `<span>${actionIcon('note')} ${rdv.desc}</span>` : ''}
          </div>
        </div>
        ${statusBadge(rdv.status)}
        ${actionBtns}
      `;
      container.appendChild(card);
    });

    // Confirm / Refuse / Delete inline
    container.querySelectorAll('.btn-confirm').forEach(btn => {
      btn.addEventListener('click', () => updateStatus(+btn.dataset.id, 'Confirmé'));
    });
    container.querySelectorAll('.btn-refuse:not(.btn-delete)').forEach(btn => {
      btn.addEventListener('click', () => updateStatus(+btn.dataset.id, 'Refusé'));
    });
    container.querySelectorAll('.btn-detail').forEach(btn => {
      btn.addEventListener('click', () => openAdminModal(+btn.dataset.id));
    });
    container.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', () => deleteAppointment(btn.dataset.id, btn.closest('.rdv-card')));
    });
  }

  function patchAppointmentStatus(appointment, isAdmin = false) {
    const cards = document.querySelectorAll(`[data-rdv-id="${CSS.escape(String(appointment.id))}"]`);
    cards.forEach(card => {
      const oldBadge = card.querySelector('.status-badge');
      if (oldBadge) oldBadge.outerHTML = statusBadge(appointment.status);
      card.classList.remove('rdv-card--status-changed');
      // Restart the small status-change animation even when a status changes twice.
      void card.offsetWidth;
      card.classList.add('rdv-card--status-changed');

      if (isAdmin) {
        card.querySelectorAll('.btn-confirm, .btn-refuse:not(.btn-delete)').forEach(button => button.remove());
      }
    });
  }

  async function refreshUserAppointments() {
    const session = loadSession();
    const previous = new Map(
      currentAppointments
        .filter(item => String(item.user_id) === String(session?.id))
        .map(item => [String(item.id), item.status])
    );
    const beforeIds = new Set(previous.keys());
    const appointments = await loadAppointments();
    const mine = appointments.filter(item => String(item.user_id) === String(session?.id));
    const sameAppointments = mine.length === beforeIds.size
      && mine.every(item => beforeIds.has(String(item.id)));

    // For the normal confirmation/refusal case, leave the list intact and
    // alter only the affected badge. Filters can add/remove cards, so they
    // deliberately receive a full list render.
    if (sameAppointments && currentFilter === 'all') {
      mine.forEach(item => {
        if (previous.get(String(item.id)) !== item.status) patchAppointmentStatus(item);
      });
      return;
    }
    await renderUserRdvs(currentFilter);
  }

  function startUserRefresh() {
    if (refreshTimer) window.clearInterval(refreshTimer);
    refreshTimer = window.setInterval(() => {
      if (!document.hidden) refreshUserAppointments();
    }, STATUS_REFRESH_DELAY);

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) refreshUserAppointments();
    });
  }

  async function updateStatus(id, status) {
    const list = currentAppointments.length ? currentAppointments : await loadAppointments();
    const rdv = list.find(r => String(r.id) === String(id));
    if (!rdv) return false;

    try {
      const res = await apiFetch(`${API_ROOT}/admin/appointments/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await readApiResponse(res);

      const updated = data.appointment ? normalizeAppointment(data.appointment) : { ...rdv, status };
      currentAppointments = currentAppointments.map(item =>
        String(item.id) === String(id) ? updated : item
      );
      patchAppointmentStatus(updated, true);
      await renderAdminStats();
      showFeedback(`Le rendez-vous a été ${status.toLowerCase()}.`);
      return true;
    } catch (error) {
      showFeedback(error.message || 'Impossible de mettre à jour le rendez-vous.', true);
      return false;
    }
  }

  async function deleteAppointment(id, card) {
    const confirmed = window.confirm('Voulez-vous vraiment supprimer définitivement ce rendez-vous ?');
    if (!confirmed) return false;

    try {
      const res = await apiFetch(`${APPOINTMENTS_API}/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      await readApiResponse(res);

      // La carte disparaît immédiatement, puis la source API et les compteurs sont synchronisés.
      if (card) card.remove();
      await loadAppointments();
      await renderAdminRdvs(currentFilter);
      await renderAdminStats();
      return true;
    } catch (error) {
      alert(error.message || 'Erreur lors de la suppression du rendez-vous.');
      return false;
    }
  }

  /* ── Admin modal ── */
  let currentAdminRdv = null;

  function openAdminModal(id) {
    const rdv = currentAppointments.find(r => String(r.id) === String(id));
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
    const session = loadSession();
    if (session && session.isGuest) {
      document.getElementById('modal-guest').hidden = false;
      return;
    }
    document.getElementById('form-request').reset();
    document.getElementById('req-message').textContent = '';
    document.getElementById('modal-request').hidden = false;
  }

  function closeGuestModal() {
    document.getElementById('modal-guest').hidden = true;
  }

  function closeRequestModal() {
    document.getElementById('modal-request').hidden = true;
  }

  /* ── Filter state ── */
  let currentFilter = 'all';
  const role = getCurrentRole();

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
  async function init() {
    await loadAppointments();

    const viewAdmin = document.getElementById('view-admin');
    const viewUser = document.getElementById('view-user');
    if (viewAdmin) viewAdmin.hidden = role !== 'admin';
    if (viewUser) viewUser.hidden = role === 'admin';

    if (role === 'admin') {
      document.getElementById('view-admin').hidden = false;
      await renderAdminStats();
      await renderAdminRdvs('all');
      bindFilters('view-admin', (f) => { renderAdminRdvs(f); });

      // Admin modal events
      document.getElementById('rdv-modal-close').addEventListener('click', closeAdminModal);
      document.getElementById('modal-secondary').addEventListener('click', closeAdminModal);
      document.getElementById('rdv-modal').addEventListener('click', e => {
        if (e.target === document.getElementById('rdv-modal')) closeAdminModal();
      });
      document.getElementById('modal-confirm-btn').addEventListener('click', async () => {
        if (!currentAdminRdv) return;
        const ok = await updateStatus(currentAdminRdv.id, 'Confirmé');
        if (ok) closeAdminModal();
      });
      document.getElementById('modal-refuse-btn').addEventListener('click', async () => {
        if (!currentAdminRdv) return;
        const ok = await updateStatus(currentAdminRdv.id, 'Refusé');
        if (ok) closeAdminModal();
      });

    } else {
      document.getElementById('view-user').hidden = false;
      await renderUserRdvs('all');
      bindFilters('view-user', (f) => { renderUserRdvs(f); });
      startUserRefresh();

      // Request modal events
      document.getElementById('btn-open-request').addEventListener('click', openRequestModal);
      const btn2 = document.getElementById('btn-open-request2');
      if (btn2) btn2.addEventListener('click', openRequestModal);

      // Guest modal events
      document.getElementById('guest-modal-cancel').addEventListener('click', closeGuestModal);
      document.getElementById('guest-modal-signup').addEventListener('click', () => {
        if (typeof window.navigateTo === 'function') window.navigateTo('./login.html');
        else window.location.href = './login.html';
      });
      document.getElementById('modal-guest').addEventListener('click', e => {
        if (e.target === document.getElementById('modal-guest')) closeGuestModal();
      });
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

      document.getElementById('form-request').addEventListener('submit', async e => {
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

        const session = loadSession();
        if (!session || !session.id) {
          msg.textContent = 'Impossible de trouver l’utilisateur connecté.';
          return;
        }

        try {
          const res = await fetch(APPOINTMENTS_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              service: type,
              appointment_date: date,
              appointment_time: time,
              description: desc,
              user_id: session.id,
            }),
          });

          await readApiResponse(res);

          document.getElementById('form-request').reset();
          await loadAppointments();
          await renderUserRdvs(currentFilter);
          msg.textContent = 'Votre demande a bien été envoyée.';
          closeRequestModal();
        } catch (error) {
          msg.textContent = error.message || 'Erreur réseau. Réessayez.';
        }
      });
    }

    // Search
    const search = document.getElementById('search');
    if (search) {
      search.addEventListener('input', async () => {
        const q = search.value.trim().toLowerCase();
        const list = currentAppointments.length ? currentAppointments : await loadAppointments();
        const filtered = q
          ? list.filter(r => `${r.client} ${r.type} ${r.status} ${r.desc}`.toLowerCase().includes(q))
          : list;

        if (role === 'admin') {
          const container = document.getElementById('admin-rdv-list');
          container.innerHTML = '';
          filtered.forEach((rdv, i) => {
            const cls = typeIcon(rdv.type);
            const card = document.createElement('div');
            card.className = 'rdv-card';
            card.style.animationDelay = `${i * 0.06}s`;
            card.innerHTML = `
              <div class="rdv-card-icon ${cls}">${appointmentIcon()}</div>
              <div class="rdv-card-body">
                <div class="rdv-card-title">${rdv.client} — ${rdv.type}</div>
                <div class="rdv-card-meta">
                  <span>${appointmentIcon()} ${formatDate(rdv.date)}</span>
                  <span>${actionIcon('clock')} ${rdv.time}</span>
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

  document.addEventListener('DOMContentLoaded', () => {
    init().catch(() => {});
  });
})();
