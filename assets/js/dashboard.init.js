;(async () => {
  function normalizeAppointment(appointment) {
    const client = appointment.user_name
      || appointment.client
      || appointment.client_name
      || appointment.user_fullname
      || appointment.fullname
      || appointment.user?.fullname
      || appointment.user?.name
      || (appointment.user_id ? `Utilisateur #${appointment.user_id}` : null);

    return {
      ...appointment,
      type:    appointment.service ?? appointment.service_name ?? appointment.type ?? '—',
      date:    appointment.appointment_date ?? appointment.date,
      time:    appointment.appointment_time ?? appointment.time,
      desc:    appointment.description ?? appointment.desc,
      status:  appointment.status ?? 'En attente',
      user_id: appointment.user_id ?? appointment.userId,
      client:  client || 'Client inconnu',
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
    if (!res.ok) throw new Error(data.message || data.error || `Erreur HTTP ${res.status}`);
    if (data.success === false) throw new Error(data.message || data.error || 'La requête a échoué.');
    return data;
  }

  const s = getCurrentUser();
  if (!s) return;
  const isAdmin = String(s.role).toLowerCase() === 'admin';

  // ── Date & heure en temps réel ──
  const heroDate = document.getElementById('hero-date');
  const heroTime = document.getElementById('hero-time');
  if (heroDate || heroTime) {
    const tick = () => {
      const now = new Date();
      if (heroDate) heroDate.textContent = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      if (heroTime) heroTime.textContent = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };
    tick();
    setInterval(tick, 1000);
  }

  // ── Profile pill ──
  const initials = (s.fullname || '').trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
  const pillInitials = document.getElementById('pill-initials');
  if (pillInitials) pillInitials.textContent = initials;
  const pillName = document.getElementById('pill-name');
  const pillHandle = document.getElementById('pill-handle');
  if (pillName) pillName.textContent = s.fullname || '—';
  if (pillHandle) pillHandle.textContent = s.email || '—';
  const firstName = (s.fullname || '').trim().split(' ')[0] || 'Utilisateur';
  const welcomeNameEl = document.getElementById('welcome-name');
  if (welcomeNameEl) welcomeNameEl.textContent = firstName + ' !';
  const headerUsername = document.getElementById('header-username');
  if (headerUsername) headerUsername.textContent = s.fullname || s.name || 'Compte';

  function firstNumber(source, keys) {
    for (const key of keys) {
      const value = Number(source?.[key]);
      if (Number.isFinite(value)) return value;
    }
    return 0;
  }

  const STAT_ICONS = {
    calendar: `<svg width="15" height="15" fill="none" stroke="#1f5fbf" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>`,
    users:    `<svg width="15" height="15" fill="none" stroke="#475569" stroke-width="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    clock:    `<svg width="15" height="15" fill="none" stroke="#b45309" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>`,
    check:    `<svg width="15" height="15" fill="none" stroke="#16a34a" stroke-width="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>`,
    x:        `<svg width="15" height="15" fill="none" stroke="#dc2626" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    pin:      `<svg width="15" height="15" fill="none" stroke="#7c3aed" stroke-width="2" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
    month:    `<svg width="15" height="15" fill="none" stroke="#0891b2" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>`,
  };
  const STAT_COLOR = {
    calendar: 'si-blue', users: 'si-slate', clock: 'si-slate',
    check: 'si-green', x: 'si-slate', pin: 'si-purple', month: 'si-slate',
  };

  function setStatCard(cardId, valueId, iconKey, label, value) {
    const row = document.querySelector('.stats-row, .kpi-grid');
    let card = document.getElementById(cardId);
    const svg = STAT_ICONS[iconKey] || STAT_ICONS.calendar;
    const colorClass = STAT_COLOR[iconKey] || 'si-blue';
    const kpiColorClass = {
      calendar: 'kpi-icon--blue', users: 'kpi-icon--slate', clock: 'kpi-icon--green',
      check: 'kpi-icon--green', x: 'kpi-icon--slate', pin: 'kpi-icon--blue', month: 'kpi-icon--slate',
    }[iconKey] || 'kpi-icon--blue';

    if (!card && row) {
      card = document.createElement('div');
      const isKpiGrid = row.classList.contains('kpi-grid');
      card.className = isKpiGrid ? 'kpi-card' : 'stat-card';
      card.id = cardId;
      card.innerHTML = isKpiGrid
        ? `<div class="kpi-icon ${kpiColorClass}">${svg}</div><div class="kpi-value" id="${valueId}">—</div><div class="kpi-label"></div>`
        : `<div class="stat-icon ${colorClass}">${svg}</div><div class="stat-value" id="${valueId}">—</div><div class="stat-label"></div>`;
      row.appendChild(card);
    }
    if (!card) return;
    const isKpiCard = card.classList.contains('kpi-card');
    const iconEl = card.querySelector('.stat-icon, .kpi-icon');
    const valueEl = card.querySelector('.stat-value, .kpi-value');
    const labelEl = card.querySelector('.stat-label, .kpi-label');
    if (iconEl) {
      iconEl.innerHTML = svg;
      iconEl.className = isKpiCard ? `kpi-icon ${kpiColorClass}` : `stat-icon ${colorClass}`;
    }
    if (valueEl) valueEl.textContent = value;
    if (labelEl) labelEl.textContent = label;
  }

  function setDashboardLoading() {
    document.querySelectorAll('.stats-row .stat-value, .kpi-grid .kpi-value').forEach(el => { el.textContent = '…'; });
    const activity = document.getElementById('upcoming-rdvs');
    if (activity) activity.innerHTML = '<p class="card-empty">Chargement des données…</p>';
  }

  function renderStats(stats) {
    if (isAdmin) {
      setStatCard('stat-card-rdv',      'stat-rdv',      'calendar', 'Rendez-vous', firstNumber(stats, ['total_appointments', 'appointments', 'total_rdvs', 'total', 'totalAppointments']));
      setStatCard('stat-card-messages', 'stat-messages', 'clock',    'En attente',   firstNumber(stats, ['waiting', 'pending_messages', 'unread_messages', 'messages', 'pending_appointments', 'pending']));
      return;
    }
    setStatCard('stat-card-rdv',       'stat-rdv',       'calendar', 'Rendez-vous',   firstNumber(stats, ['total_appointments', 'appointments', 'total_rdvs', 'total', 'totalAppointments']));
    setStatCard('stat-card-messages',  'stat-messages',  'clock',    'En attente',    firstNumber(stats, ['pending_appointments', 'pending', 'waiting_appointments', 'pending_count', 'pendingAppointments']));
    setStatCard('stat-card-confirmed', 'stat-confirmed', 'check',    'Confirmés',     firstNumber(stats, ['confirmed_appointments', 'confirmed', 'confirmed_count', 'confirmedAppointments']));
    setStatCard('stat-card-refused',   'stat-refused',   'x',        'Refusés',       firstNumber(stats, ['refused_appointments', 'rejected_appointments', 'refused', 'rejected', 'refused_count', 'rejected_count']));
    setStatCard('stat-card-today',     'stat-today',     'pin',      "Aujourd'hui",   firstNumber(stats, ['appointments_today', 'today_appointments', 'today', 'today_count', 'appointmentsToday']));
    setStatCard('stat-card-month',     'stat-month',     'month',    'Ce mois',       firstNumber(stats, ['appointments_this_month', 'month_appointments', 'this_month', 'month_count', 'appointmentsMonth']));
  }

  function renderRecentAppointments(appointments) {
    const activity = document.getElementById('upcoming-rdvs');
    if (!activity) return;

    const recent = Array.isArray(appointments) ? appointments.slice(0, 5).map(normalizeAppointment) : [];
    if (recent.length === 0) {
      activity.innerHTML = '<p class="card-empty">Aucune donnée disponible</p>';
      return;
    }

    const calSvg = `<svg width="14" height="14" fill="none" stroke="#1f5fbf" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>`;
    const clockSvg = `<svg width="12" height="12" fill="none" stroke="#94a3b8" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>`;
    const statusClass = st => st === 'Confirmé' ? 'status-badge--confirmed' : st === 'Refusé' ? 'status-badge--refused' : st === 'En attente' ? 'status-badge--pending' : 'status-badge--default';

    activity.innerHTML = recent.map(appointment => {
      const date = appointment.date ? appointment.date.split('-').reverse().join('/') : '—';
      return `<div class="rdv-item">
        <div class="rdv-item-icon">${calSvg}</div>
        <div class="rdv-item-body">
          <div class="rdv-item-name">${appointment.client} — ${appointment.type}</div>
          <div class="rdv-item-meta">${calSvg} ${date} ${clockSvg} ${appointment.time || '—'}</div>
        </div>
        <span class="status-badge ${statusClass(appointment.status)}">${appointment.status}</span>
      </div>`;
    }).join('');
  }

  // ── Dashboard statistics and recent activity from Flask ──
  setDashboardLoading();
  try {
    const _dashApiBase = API_BASE;
    const _url = `${_dashApiBase}/dashboard/stats`;
    console.log('[dashboard] GET', _url);
    const res = await apiFetch(_url);
    const data = await readApiResponse(res);
    console.log('[dashboard] réponse reçue :', JSON.stringify(data).slice(0, 300));
    const stats = data.stats ?? data.dashboard ?? data.data ?? data;
    const recent = stats.recent
      ?? data.recent_appointments ?? data.recentAppointments ?? data.last_appointments
      ?? data.data?.recent_appointments ?? data.data?.recentAppointments
      ?? stats.recent_appointments ?? stats.recentAppointments ?? [];
    console.log('[dashboard] stats :', stats, '| recent count:', recent.length);
    renderStats(stats);
    renderRecentAppointments(recent);
  } catch (error) {
    console.error('Impossible de charger les statistiques du dashboard :', error);
    document.querySelectorAll('.stats-row .stat-value, .kpi-grid .kpi-value').forEach(el => { el.textContent = '—'; });
    const activity = document.getElementById('upcoming-rdvs');
    if (activity) activity.innerHTML = `<p class="card-empty">${error.message || 'Erreur réseau. Réessayez.'}</p>`;
  }

  // ── Notification badge ──
  const unread = (JSON.parse(localStorage.getItem('rdv_notifications') || '[]')).filter(n => !n.read).length;
  const notifCount = document.getElementById('notif-count');
  if (notifCount) {
    if (unread > 0) {
      notifCount.textContent = unread > 99 ? '99+' : unread;
      notifCount.style.display = 'flex';
    } else {
      notifCount.style.display = 'none';
    }
  }

})();
