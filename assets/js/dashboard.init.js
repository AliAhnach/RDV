(() => {
  const s = JSON.parse(localStorage.getItem('rdv_session') || 'null');
  if (!s) return;

  // Sync name/email from stored user (reflects settings changes)
  const stored = JSON.parse(localStorage.getItem('rdv_user') || 'null');
  if (stored && !s.isGuest) {
    s.name  = stored.name  || s.name;
    s.email = stored.email || s.email;
    localStorage.setItem('rdv_session', JSON.stringify(s));
  }

  // ── Profile pill ──
  const initials = s.isGuest ? '👤' : (s.name || '').trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '👤';
  const pillInitials = document.getElementById('pill-initials');
  if (pillInitials) pillInitials.textContent = initials;
  document.getElementById('pill-name').textContent     = s.isGuest ? 'Invité' : (s.name || '—');
  document.getElementById('pill-handle').textContent   = s.isGuest ? 'Mode consultation' : (s.email || '—');
  const firstName = s.isGuest ? 'Invité' : (s.name || '').trim().split(' ')[0];
  document.getElementById('welcome-name').textContent  = firstName + ' !';

  // ── Guest banner ──
  if (s.isGuest) {
    const banner = document.createElement('div');
    banner.style.cssText = 'background:linear-gradient(90deg,#1f5fbf,#102d63);color:#fff;text-align:center;padding:9px 16px;font-size:13px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:12px;flex-shrink:0;';
    banner.innerHTML = '👁️ Vous consultez en mode invité — certaines fonctionnalités sont limitées. <a href="./login.html" style="color:#a8d4ff;font-weight:700;text-decoration:underline;">Créer un compte</a>';
    document.querySelector('.main').prepend(banner);
  }

  // ── Seed appointments if empty ──
  let rdvs = JSON.parse(localStorage.getItem('rdv_appointments') || '[]');
  if (rdvs.length === 0) {
    const name = s.name || 'Utilisateur';
    const d = (offset) => { const dt = new Date(); dt.setDate(dt.getDate() + offset); return dt.toISOString().slice(0, 10); };
    rdvs = [
      { id: 1, client: name, date: d(2),  time: '10:00', type: 'Consultation', status: 'Confirmé',   desc: 'Revue médicale et plan de suivi.' },
      { id: 2, client: name, date: d(4),  time: '11:30', type: 'Suivi',        status: 'En attente', desc: 'Vérification des résultats.' },
      { id: 3, client: name, date: d(7),  time: '14:00', type: 'Réunion',      status: 'En attente', desc: 'Discussion sur les prochaines étapes.' },
      { id: 4, client: name, date: d(10), time: '16:15', type: 'Consultation', status: 'Refusé',     desc: 'Consultation de contrôle.' },
    ];
    localStorage.setItem('rdv_appointments', JSON.stringify(rdvs));
  }

  const isAdmin = s.role === 'admin';
  const myRdvs  = isAdmin ? rdvs : rdvs.filter(r => r.client === s.name);
  const allMsgs = JSON.parse(localStorage.getItem('rdv_messages') || '[]');
  const pending = myRdvs.filter(r => r.status === 'En attente').length;

  // ── Stat cards ──
  const elRdv = document.getElementById('stat-rdv');
  const elCli = document.getElementById('stat-clients');
  const elMsg = document.getElementById('stat-messages');
  if (elRdv) elRdv.textContent = myRdvs.length;
  if (elCli) elCli.textContent = isAdmin ? new Set(rdvs.map(r => r.client)).size : pending;
  if (elMsg) elMsg.textContent = allMsgs.length;

  if (!isAdmin) {
    const lbls = document.querySelectorAll('.stat-label');
    if (lbls[1]) lbls[1].textContent = 'En attente';
  }

  // ── Notification badge ──
  const badge = document.querySelector('#btn-notifications .hdr-badge');
  if (badge) badge.style.display = pending > 0 ? '' : 'none';

  // ── Upcoming RDVs ──
  const upcomingEl = document.getElementById('upcoming-rdvs');
  if (!upcomingEl) return;

  const today    = new Date().toISOString().slice(0, 10);
  const upcoming = myRdvs
    .filter(r => r.date >= today && r.status !== 'Refusé')
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    .slice(0, 3);

  const TYPE_ICONS = { 'Consultation': '🩺', 'Suivi': '💊', 'Réunion': '🤝', 'Urgence': '🚨' };
  const STATUS_CLS = { 'Confirmé': 'status-confirme', 'En attente': 'status-attente', 'Refusé': 'status-refuse' };
  const STATUS_ICO = { 'Confirmé': '✅', 'En attente': '⏳', 'Refusé': '❌' };

  if (upcoming.length === 0) {
    upcomingEl.innerHTML = '<div style="color:#7a7a9a;font-size:13px;padding:14px 0;text-align:center;">Aucun rendez-vous à venir.</div>';
    return;
  }

  upcomingEl.innerHTML = upcoming.map((r, i) => {
    const [y, m, d] = r.date.split('-');
    const icon  = TYPE_ICONS[r.type] || '📅';
    const scls  = STATUS_CLS[r.status] || 'status-attente';
    const sico  = STATUS_ICO[r.status] || '⏳';
    const sep   = i < upcoming.length - 1 ? 'border-bottom:1px solid rgba(200,190,230,0.25);' : '';
    const label = isAdmin ? r.client + ' — ' + r.type : r.type;
    return '<div style="display:flex;align-items:center;gap:12px;padding:11px 0;' + sep + '">'
      + '<div style="width:38px;height:38px;border-radius:10px;background:#ede8f9;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">' + icon + '</div>'
      + '<div style="flex:1;min-width:0;">'
      + '<div style="font-size:13px;font-weight:800;color:#1a1a2e;">' + label + '</div>'
      + '<div style="font-size:11px;color:#7a7a9a;margin-top:2px;">📅 ' + d + '/' + m + '/' + y + ' &nbsp;🕐 ' + r.time + '</div>'
      + '</div>'
      + '<span class="status-badge ' + scls + '" style="font-size:10px;padding:3px 8px;white-space:nowrap;">' + sico + ' ' + r.status + '</span>'
      + '</div>';
  }).join('');
})();
