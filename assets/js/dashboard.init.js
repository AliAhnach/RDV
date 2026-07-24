;(async () => {
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
  const initials = s.isGuest ? '👤' : (s.fullname || '').trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '👤';
  const pillInitials = document.getElementById('pill-initials');
  if (pillInitials) pillInitials.textContent = initials;
  document.getElementById('pill-name').textContent     = s.isGuest ? 'Invité' : (s.fullname || '—');
  document.getElementById('pill-handle').textContent   = s.isGuest ? 'Mode consultation' : (s.email || '—');
  const firstName = s.isGuest ? 'Invité' : (s.fullname || '').trim().split(' ')[0];
  document.getElementById('welcome-name').textContent  = firstName + ' !';

  // ── Guest banner ──
  if (s.isGuest) {
    const banner = document.createElement('div');
    banner.style.cssText = 'background:linear-gradient(90deg,#1f5fbf,#102d63);color:#fff;text-align:center;padding:9px 16px;font-size:13px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:12px;flex-shrink:0;';
    banner.innerHTML = '👁️ Vous consultez en mode invité — certaines fonctionnalités sont limitées. <a href="./login.html" style="color:#a8d4ff;font-weight:700;text-decoration:underline;">Créer un compte</a>';
    document.querySelector('.main').prepend(banner);
  }

  function firstNumber(source, keys) {
    for (const key of keys) {
      const value = Number(source?.[key]);
      if (Number.isFinite(value)) return value;
    }
    return 0;
  }

  function setStatCard(cardId, valueId, icon, label, value) {
    const row = document.querySelector('.stats-row');
    let card = document.getElementById(cardId);
    if (!card && row) {
      card = document.createElement('div');
      card.className = 'stat-card';
      card.id = cardId;
      card.innerHTML = `<div class="stat-icon si-purple">${icon}</div><div class="stat-value" id="${valueId}">—</div><div class="stat-label"></div>`;
      row.appendChild(card);
    }
    if (!card) return;
    const iconEl = card.querySelector('.stat-icon');
    const valueEl = card.querySelector('.stat-value');
    const labelEl = card.querySelector('.stat-label');
    if (iconEl) iconEl.textContent = icon;
    if (valueEl) valueEl.textContent = value;
    if (labelEl) labelEl.textContent = label;
  }

  function setDashboardLoading() {
    document.querySelectorAll('.stats-row .stat-value').forEach(el => { el.textContent = '…'; });
    const activity = document.getElementById('upcoming-rdvs');
    if (activity) activity.innerHTML = '<div style="color:#7a7a9a;font-size:13px;padding:14px 0;text-align:center;">Chargement des données…</div>';
  }

  function renderStats(stats) {
    setStatCard('stat-card-clients', 'stat-clients', '👥', 'Utilisateurs', firstNumber(stats, ['total_users', 'users', 'user_count', 'users_count', 'totalUsers']));
    setStatCard('stat-card-rdv', 'stat-rdv', '📅', 'Rendez-vous', firstNumber(stats, ['total_appointments', 'appointments', 'total_rdvs', 'total', 'totalAppointments']));
    setStatCard('stat-card-messages', 'stat-messages', '⏳', 'En attente', firstNumber(stats, ['pending_appointments', 'pending', 'waiting_appointments', 'pending_count', 'pendingAppointments']));
    setStatCard('stat-card-confirmed', 'stat-confirmed', '✅', 'Confirmés', firstNumber(stats, ['confirmed_appointments', 'confirmed', 'confirmed_count', 'confirmedAppointments']));
    setStatCard('stat-card-refused', 'stat-refused', '❌', 'Refusés', firstNumber(stats, ['refused_appointments', 'rejected_appointments', 'refused', 'rejected', 'refused_count', 'rejected_count']));
    setStatCard('stat-card-today', 'stat-today', '📍', "Aujourd’hui", firstNumber(stats, ['appointments_today', 'today_appointments', 'today', 'today_count', 'appointmentsToday']));
    setStatCard('stat-card-month', 'stat-month', '🗓️', 'Ce mois', firstNumber(stats, ['appointments_this_month', 'month_appointments', 'this_month', 'month_count', 'appointmentsMonth']));
  }

  function renderRecentAppointments(appointments) {
    const activity = document.getElementById('upcoming-rdvs');
    if (!activity) return;
    const title = activity.closest('.platform-desc-card')?.querySelector('.pdc-title');
    if (title) title.textContent = 'Activité récente';

    const recent = Array.isArray(appointments) ? appointments.slice(0, 5).map(normalizeAppointment) : [];
    if (recent.length === 0) {
      activity.innerHTML = '<div style="color:#7a7a9a;font-size:13px;padding:14px 0;text-align:center;">Aucune donnée disponible</div>';
      return;
    }

    const typeIcons = { 'Consultation': '🩺', 'Suivi': '💊', 'Réunion': '🤝', 'Urgence': '🚨' };
    activity.innerHTML = recent.map((appointment, index) => {
      const date = appointment.date ? appointment.date.split('-').reverse().join('/') : '—';
      const separator = index < recent.length - 1 ? 'border-bottom:1px solid rgba(200,190,230,0.25);' : '';
      return `<div style="display:flex;align-items:center;gap:12px;padding:11px 0;${separator}">
        <div style="width:38px;height:38px;border-radius:10px;background:#ede8f9;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">${typeIcons[appointment.type] || '📅'}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;font-weight:800;color:#1a1a2e;">${appointment.client} — ${appointment.type}</div>
          <div style="font-size:11px;color:#7a7a9a;margin-top:2px;">📅 ${date} &nbsp;🕐 ${appointment.time || '—'}</div>
        </div>
        <span class="status-badge">${appointment.status}</span>
      </div>`;
    }).join('');
  }

  // ── Dashboard statistics and recent activity from Flask ──
  setDashboardLoading();
  try {
    const res = await fetch('https://aliahnach.pythonanywhere.com/api/dashboard/stats');
    const data = await readApiResponse(res);
    const stats = data.stats ?? data.dashboard ?? data.data ?? data;
    const recent = data.recent_appointments ?? data.recentAppointments ?? data.last_appointments
      ?? data.data?.recent_appointments ?? data.data?.recentAppointments
      ?? stats.recent_appointments ?? stats.recentAppointments ?? [];
    renderStats(stats);
    renderRecentAppointments(recent);
  } catch (error) {
    console.error('Impossible de charger les statistiques du dashboard :', error);
    document.querySelectorAll('.stats-row .stat-value').forEach(el => { el.textContent = '—'; });
    const activity = document.getElementById('upcoming-rdvs');
    if (activity) activity.innerHTML = `<div style="color:#b42318;font-size:13px;padding:14px 0;text-align:center;">${error.message || 'Erreur réseau. Réessayez.'}</div>`;
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
