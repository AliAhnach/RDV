// ===== Auth page (géré par auth.ui.js) =====
function initAuthPage() {}

// ===== RDV =====

const rdvData = [
  {
    id: 1,
    client: "Ahmed Benali",
    time: "10:00",
    type: "Consultation",
    status: "Confirmé",
    description: "Revue médicale et plan de suivi."
  },
  {
    id: 2,
    client: "Sarah El Idrissi",
    time: "11:30",
    type: "Suivi",
    status: "En attente",
    description: "Vérification des résultats et ajustement du traitement."
  },
  {
    id: 3,
    client: "Youssef Karim",
    time: "14:00",
    type: "Réunion",
    status: "En attente",
    description: "Discussion sur les prochaines étapes du projet."
  },
  {
    id: 4,
    client: "Nadia Toumi",
    time: "16:15",
    type: "Consultation",
    status: "Confirmé",
    description: "Consultation de contrôle et recommandations."
  }
];

function $(sel) {
  return document.querySelector(sel);
}

function $all(sel) {
  return Array.from(document.querySelectorAll(sel));
}

function getPageId() {
  const path = window.location.pathname || "";
  const file = path.split("/").pop() || "index.html";
  if (file === "index.html") return "dashboard";
  if (file.includes("appointments")) return "rendez-vous";
  if (file.includes("clients")) return "clients";
  if (file.includes("messages")) return "messages";
  if (file.includes("parametres")) return "parametres";
  if (file.includes("deconnexion")) return "deconnexion";
  return "dashboard";
}

function highlightActiveNav() {
  const pageId = getPageId();
  const links = $all(".sidebar nav a");

  links.forEach(a => {
    a.classList.remove("active");

    const href = a.getAttribute("href") || "";
    const isDashboard = href.includes("index.html");
    const isRdv = href.includes("appointments.html");
    const isClients = href.includes("clients.html");
    const isMessages = href.includes("messages.html");
    const isParam = href.includes("parametres.html");
    const isLogout = href.includes("deconnexion.html");

    const shouldActive =
      (pageId === "dashboard" && isDashboard) ||
      (pageId === "rendez-vous" && isRdv) ||
      (pageId === "clients" && isClients) ||
      (pageId === "messages" && isMessages) ||
      (pageId === "parametres" && isParam) ||
      (pageId === "deconnexion" && isLogout);

    if (shouldActive) a.classList.add("active");
  });
}

function initAuthStateUI() {
  const user = getCurrentUser();
  const l = document.getElementById('nav-loggedout');
  const a = document.getElementById('nav-auth-link');
  if (l) l.style.display = user ? '' : 'none';
  if (a) a.style.display = user ? 'none' : '';
}

function openModal(rdv) {
  const overlay = $("#rdv-modal");
  if (!overlay) return;

  $("#modal-client").textContent = rdv.client;
  $("#modal-time").textContent = rdv.time;
  $("#modal-type").textContent = rdv.type;
  $("#modal-status").textContent = rdv.status;
  $("#modal-desc").textContent = rdv.description;

  overlay.hidden = false;
}

function closeModal() {
  const overlay = $("#rdv-modal");
  if (!overlay) return;
  overlay.hidden = true;
}

function renderRdvList(list) {
  const container = $("#rdv-list");
  const empty = $("#rdv-empty");
  if (!container) return;

  container.innerHTML = "";

  if (!list || list.length === 0) {
    if (empty) empty.hidden = false;
    return;
  }

  if (empty) empty.hidden = true;

  list.forEach(rdv => {
    const row = document.createElement("div");
    row.className = "rdv";

    const left = document.createElement("div");
    left.innerHTML = `
      <strong>${rdv.client}</strong>
      <p>${rdv.time} - ${rdv.type}</p>
    `;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "Voir";
    btn.addEventListener("click", () => openModal(rdv));

    row.appendChild(left);
    row.appendChild(btn);
    container.appendChild(row);
  });
}

function initRdvPage() {
  const searchInput = $("#search");
  const hasRdvList = !!$("#rdv-list");
  if (!hasRdvList) return;

  const pageId = getPageId();

  let base = rdvData;
  if (pageId === "dashboard") base = rdvData.slice(0, 3);

  renderRdvList(base);

  if (!searchInput) return;

  searchInput.addEventListener("input", () => {
    const q = (searchInput.value || "").trim().toLowerCase();
    if (!q) return renderRdvList(base);

    const filtered = base.filter(r => {
      const blob = `${r.client} ${r.type} ${r.status}`.toLowerCase();
      return blob.includes(q);
    });

    renderRdvList(filtered);
  });
}

function initModal() {
  const closeBtn = $("#rdv-modal-close");
  const secondary = $("#modal-secondary");
  const overlay = $("#rdv-modal");
  const action = $("#modal-action");

  if (secondary) secondary.addEventListener("click", closeModal);
  if (closeBtn) closeBtn.addEventListener("click", closeModal);

  if (overlay) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeModal();
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  if (action) {
    action.addEventListener("click", () => closeModal());
  }
}

function applyTheme(isDark) {
  document.body.classList.toggle('dark-mode', isDark);
  localStorage.setItem('rdv-theme', isDark ? 'dark' : 'light');
  const btn = document.getElementById('theme-toggle');
  if (btn) {
    btn.innerHTML = isDark ? '☀️<span class="hdr-badge"></span>' : '🌙<span class="hdr-badge"></span>';
  }
}

function initTopIcons() {
  const themeBtn = document.getElementById('theme-toggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const isDark = !document.body.classList.contains('dark-mode');
      applyTheme(isDark);
    });
  }

  const nav = (id, href) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('click', () => {
      if (typeof window.navigateTo === 'function') window.navigateTo(href);
      else window.location.href = href;
    });
  };
  nav('btn-account',        './parametres.html');
  nav('stat-card-rdv',      './appointments.html');
  nav('stat-card-clients',  './clients.html');
  nav('stat-card-messages', './messages.html');
}

function initGlobalTheme() {
  const saved = localStorage.getItem('rdv-theme') || 'light';
  const isDark = saved === 'dark';
  applyTheme(isDark);
}

function initProfileName() {
  const el = document.getElementById('profile-name');
  const welcomeEl = document.getElementById('welcome-name');
  const dashboardWelcomeEl = document.getElementById('dashboard-welcome-username');
  const accountBtn = document.getElementById('btn-account');

  const user = getCurrentUser();
  const name = (user && user.fullname) ? user.fullname : 'Invité';
  const firstName = String(name).trim().split(/\s+/)[0] || 'Invité';

  if (el) el.textContent = name;
  if (welcomeEl) welcomeEl.textContent = firstName;
  if (dashboardWelcomeEl) dashboardWelcomeEl.textContent = firstName;

  if (accountBtn) {
    let label = accountBtn.querySelector('.account-label');
    if (!label) {
      label = document.createElement('span');
      label.className = 'account-label';
      accountBtn.appendChild(label);
    }
    label.textContent = firstName;
  }
}

function initDashboardWelcome() {
  const el = document.getElementById('dashboard-welcome-username');
  if (!el) return;
  const user = getCurrentUser();
  const name = (user && user.fullname) ? user.fullname : 'Invité';
  el.textContent = String(name).trim().split(/\s+/)[0] || 'Invité';
}

function initSettingsPage() {
  const form = document.getElementById('settings-form');
  if (!form) return;

  const messageEl      = document.getElementById('settings-message');
  const currentNameEl  = document.getElementById('settings-current-name');
  const currentEmailEl = document.getElementById('settings-current-email');
  const nameInput      = document.getElementById('settings-name');
  const emailInput     = document.getElementById('settings-email');
  const passwordInput  = document.getElementById('settings-password');

  function fillForm() {
    const user = getCurrentUser();
    if (!user) return;
    if (currentNameEl)  currentNameEl.textContent  = user.fullname || '—';
    if (currentEmailEl) currentEmailEl.textContent = user.email    || '—';
    if (nameInput)      nameInput.value  = user.fullname || '';
    if (emailInput)     emailInput.value = user.email    || '';
    if (passwordInput)  passwordInput.value = '';
  }

  fillForm();

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (messageEl) messageEl.style.color = '#e53e3e';

    const name     = (nameInput     ? nameInput.value     : '').trim();
    const email    = (emailInput    ? emailInput.value    : '').trim().toLowerCase();
    const password = (passwordInput ? passwordInput.value : '');

    if (!name || !email) {
      if (messageEl) messageEl.textContent = 'Nom et email sont requis.';
      return;
    }
    if (!email.includes('@')) {
      if (messageEl) messageEl.textContent = 'Email invalide.';
      return;
    }
    if (password && password.length < 4) {
      if (messageEl) messageEl.textContent = 'Mot de passe trop court (min. 4 caractères).';
      return;
    }

    // Mettre à jour la session active
    const session = getCurrentUser();
    if (session) {
      saveSession({ ...session, fullname: name, name, email });
    }

    // Rafraîchir l'affichage
    if (currentNameEl)  currentNameEl.textContent  = name;
    if (currentEmailEl) currentEmailEl.textContent = email;
    if (passwordInput)  passwordInput.value = '';
    const profileName = document.getElementById('profile-name');
    if (profileName) profileName.textContent = name;

    if (messageEl) {
      messageEl.style.color = '#1f5fbf';
      messageEl.textContent = 'Informations enregistrées ✅';
      setTimeout(() => { messageEl.textContent = ''; }, 3000);
    }
  });
}

function initParametresPage() {
  const user = getCurrentUser();
  if (!user) return;
  const initials = (user.fullname || '?').trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const avatar    = document.getElementById('hero-avatar');
  const heroName  = document.getElementById('hero-name');
  const heroEmail = document.getElementById('hero-email');
  if (avatar)    avatar.textContent    = initials;
  if (heroName)  heroName.textContent  = user.fullname || '—';
  if (heroEmail) heroEmail.textContent = user.email     || '—';
}

function deleteAccount() {
  if (!confirm('Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.')) return;
  logout();
}

function initPillFromSession() {
  const pillInitials = document.getElementById('pill-initials');
  const pillName     = document.getElementById('pill-name');
  const pillHandle   = document.getElementById('pill-handle');
  if (!pillInitials) return;
  const s = getCurrentUser();
  if (!s) return;
  const initials = (s.fullname || '').trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '👤';
  pillInitials.textContent = initials;
  if (pillName)   pillName.textContent   = s.fullname || '—';
  if (pillHandle) pillHandle.textContent = s.email    || '—';
}

function initHamburger() {
  const btn      = document.getElementById('hamburger');
  const sidebar  = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  const body     = document.body;
  if (!btn || !sidebar) return;

  // Créer le bouton close une seule fois
  let closeBtn = sidebar.querySelector('.sidebar-close');
  if (!closeBtn) {
    closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'sidebar-close';
    closeBtn.setAttribute('aria-label', 'Fermer le menu');
    closeBtn.innerHTML = '✕';
    sidebar.insertBefore(closeBtn, sidebar.firstChild);
  }

  function openSidebar() {
    sidebar.classList.add('open');
    if (backdrop) backdrop.classList.add('open');
    btn.classList.add('is-open');
    body.style.overflow = 'hidden';
    btn.style.display = 'none';
  }

  function closeSidebar() {
    sidebar.classList.remove('open');
    if (backdrop) backdrop.classList.remove('open');
    btn.classList.remove('is-open');
    body.style.overflow = '';
    btn.style.display = '';
  }

  closeBtn.addEventListener('click', closeSidebar);
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
  });
  if (backdrop) {
    backdrop.addEventListener('click', closeSidebar);
    backdrop.addEventListener('touchstart', closeSidebar);
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidebar.classList.contains('open')) closeSidebar();
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) closeSidebar();
  });
}

function injectFooter() {
  if (document.querySelector('.dash-footer')) return;
  const main = document.querySelector('.main');
  if (!main) return;
  const footer = document.createElement('footer');
  footer.className = 'dash-footer';
  footer.innerHTML = `
    <span class="footer-copy">© 2026 RDV Plateforme. Tous droits réservés.</span>
    <a class="footer-dev-btn" href="https://github.com/AliAhnach" target="_blank" rel="noopener">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
      Ali Ahnach
    </a>`;
  main.appendChild(footer);
}

function initUserDashboard() {
  if (!window.location.pathname.includes('user-dashboard.html')) return;

  const heroDate = document.getElementById('hero-date');
  const heroTime = document.getElementById('hero-time');
  if (heroDate || heroTime) {
    const tick = () => {
      const now = new Date();
      if (heroDate) heroDate.textContent = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      if (heroTime) heroTime.textContent = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    };
    tick();
    window.setInterval(tick, 1000);
  }

  const session = getCurrentUser();
  const welcomeEl = document.getElementById('welcome-name');

  function renderWelcome() {
    const fullname = String(session?.fullname || '').trim();
    const firstName = fullname ? fullname.split(/\s+/)[0] : '';
    if (welcomeEl) welcomeEl.textContent = firstName ? `${firstName} !` : '!';
  }

  if (!session || !session.id) {
    renderWelcome();
    return;
  }

  const statsRow = document.querySelector('.stats-row');
  const upcomingTitle = Array.from(document.querySelectorAll('.pdc-title'))
    .find(el => el.textContent.includes('prochains rendez-vous'));
  const upcomingCard = upcomingTitle && upcomingTitle.closest('.platform-desc-card');
  const upcomingList = upcomingCard && upcomingCard.querySelector('div[style*="flex-direction:column"]');

  function readNumber(source, keys) {
    for (const key of keys) {
      const value = Number(source && source[key]);
      if (Number.isFinite(value)) return value;
    }
    return 0;
  }

  function setCard(cardId, valueId, icon, label, value) {
    let card = document.getElementById(cardId);
    if (!card && statsRow) {
      card = document.createElement('div');
      card.className = 'stat-card';
      card.id = cardId;
      card.innerHTML = `<div class="stat-icon si-purple">${icon}</div><div class="stat-value" id="${valueId}">—</div><div class="stat-label"></div>`;
      statsRow.appendChild(card);
    }
    if (!card) return;
    const iconEl = card.querySelector('.stat-icon');
    const valueEl = card.querySelector('.stat-value');
    const labelEl = card.querySelector('.stat-label');
    if (iconEl) iconEl.textContent = icon;
    if (valueEl) valueEl.textContent = value;
    if (labelEl) labelEl.textContent = label;
  }

  function normalizeAppointment(appointment) {
    return {
      ...appointment,
      type: appointment.service ?? appointment.service_name ?? appointment.type ?? 'Rendez-vous',
      date: appointment.appointment_date ?? appointment.date,
      time: appointment.appointment_time ?? appointment.time,
      status: appointment.status ?? 'En attente',
    };
  }

  function appointmentItem(appointment) {
    const rdv = normalizeAppointment(appointment);
    const icons = { Consultation: '🩺', Suivi: '💊', Réunion: '🤝', Urgence: '🚨' };
    const colors = {
      Confirmé: 'background:#dcfce7;color:#16a34a;',
      'En attente': 'background:#fef3cd;color:#b45309;',
      Refusé: 'background:#fee2e2;color:#dc2626;',
    };
    const date = rdv.date ? rdv.date.split('-').reverse().join('/') : '—';
    return `<div style="display:flex;align-items:center;gap:12px;padding:12px 14px;background:rgba(124,92,191,0.06);border:1px solid rgba(124,92,191,0.14);border-radius:12px;">
      <div style="width:42px;height:42px;border-radius:10px;background:#ede8f9;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">${icons[rdv.type] || '📅'}</div>
      <div style="flex:1;"><div style="font-size:13px;font-weight:700;color:#1a1a2e;">${rdv.type}</div><div style="font-size:11px;color:#7a7a9a;margin-top:2px;">${date} · ${rdv.time || '—'}</div></div>
      <span style="font-size:10px;font-weight:700;padding:3px 10px;border-radius:999px;${colors[rdv.status] || colors['En attente']}">${rdv.status}</span>
    </div>`;
  }

  function getRecentCard() {
    let card = document.getElementById('user-recent-appointments');
    if (card || !upcomingCard) return card;
    card = document.createElement('div');
    card.className = 'platform-desc-card';
    card.id = 'user-recent-appointments';
    card.innerHTML = '<div class="pdc-top"><div class="pdc-icon">🕘</div><span class="pdc-badge">Historique</span></div><div class="pdc-title">Historique récent</div><div class="user-recent-list" style="display:flex;flex-direction:column;gap:10px;margin-top:14px;"></div>';
    upcomingCard.insertAdjacentElement('afterend', card);
    return card;
  }

  function setLoading() {
    document.querySelectorAll('.stats-row .stat-value').forEach(el => { el.textContent = '…'; });
    document.querySelectorAll('.hero-chip').forEach(el => { el.textContent = 'Chargement…'; });
    if (upcomingList) upcomingList.innerHTML = '<div style="color:#7a7a9a;font-size:13px;text-align:center;padding:10px;">Chargement des rendez-vous…</div>';
  }

  function renderEmpty(message) {
    if (upcomingList) upcomingList.innerHTML = `<div style="color:#7a7a9a;font-size:13px;text-align:center;padding:10px;">${message}</div>`;
    const recentList = getRecentCard()?.querySelector('.user-recent-list');
    if (recentList) recentList.innerHTML = `<div style="color:#7a7a9a;font-size:13px;text-align:center;padding:10px;">${message}</div>`;
  }

  async function loadDashboard() {
    setLoading();
    try {
      const res = await fetch(`${API_BASE}/dashboard/user/${encodeURIComponent(session.id)}`);
      const body = await res.text();
      let data = {};
      try {
        data = body ? JSON.parse(body) : {};
      } catch {
        throw new Error(res.ok ? 'Réponse invalide du serveur.' : `Erreur HTTP ${res.status}`);
      }
      if (!res.ok || data.success === false) throw new Error(data.message || data.error || `Erreur HTTP ${res.status}`);

      const stats = data.stats ?? data.dashboard ?? data.data ?? data;
      const total = readNumber(stats, ['total_appointments', 'appointments', 'total_rdvs', 'total']);
      const pending = readNumber(stats, ['pending_appointments', 'pending', 'waiting_appointments', 'pending_count']);
      const confirmed = readNumber(stats, ['confirmed_appointments', 'confirmed', 'confirmed_count']);
      const refused = readNumber(stats, ['refused_appointments', 'rejected_appointments', 'refused', 'rejected', 'refused_count']);
      const next = data.next_appointment ?? data.nextAppointment ?? stats.next_appointment ?? stats.nextAppointment;
      const recent = data.recent_appointments ?? data.recentAppointments ?? data.appointments
        ?? data.data?.recent_appointments ?? data.data?.recentAppointments
        ?? stats.recent_appointments ?? stats.recentAppointments ?? [];

      setCard('stat-card-rdv', 'stat-rdv', '📅', 'Mes RDV', total);
      setCard('stat-card-confirmed', 'stat-confirmed', '✅', 'Confirmés', confirmed);
      setCard('stat-card-messages', 'stat-messages', '⏳', 'En attente', pending);
      setCard('stat-card-refused', 'stat-refused', '❌', 'Refusés', refused);

      const chips = document.querySelectorAll('.hero-chip');
      if (chips[0]) chips[0].textContent = `✅ ${confirmed} confirmés`;
      if (chips[1]) chips[1].textContent = `📅 ${total} RDV`;
      if (chips[2]) chips[2].textContent = `⏳ ${pending} en attente`;

      if (total === 0) {
        renderEmpty('Aucun rendez-vous pour le moment.');
        return;
      }

      if (upcomingList) upcomingList.innerHTML = next ? appointmentItem(next) : '<div style="color:#7a7a9a;font-size:13px;text-align:center;padding:10px;">Aucun prochain rendez-vous.</div>';
      const recentList = getRecentCard()?.querySelector('.user-recent-list');
      if (recentList) {
        const history = Array.isArray(recent) ? recent.slice(0, 5) : [];
        recentList.innerHTML = history.length ? history.map(appointmentItem).join('') : '<div style="color:#7a7a9a;font-size:13px;text-align:center;padding:10px;">Aucun historique disponible.</div>';
      }
    } catch (error) {
      console.error('Impossible de charger le dashboard utilisateur :', error);
      document.querySelectorAll('.stats-row .stat-value').forEach(el => { el.textContent = '—'; });
      renderEmpty(error.message || 'Erreur réseau. Réessayez.');
    }
  }

  // Le script local de la page est exécuté après main.js ; ce délai évite qu'il réécrase le nom et les données API.
  window.setTimeout(() => {
    renderWelcome();
    loadDashboard();
  }, 0);
}

function boot() {
  initAuthPage();
  if (document.getElementById('form-signin') || document.getElementById('form-signup')) return;

  // Hide clients link for non-admin users
  const _u = getCurrentUser();
  if (!_u || _u.role !== 'admin') {
    document.querySelectorAll('.sidebar nav a[href*="clients"]').forEach(a => a.remove());
  }

  highlightActiveNav();
  initAuthStateUI();
  initProfileName();
  initPillFromSession();
  initDashboardWelcome();
  initSettingsPage();
  initModal();

  initRdvPage();
  initTopIcons();
  initGlobalTheme();
  initParametresPage();
  initUserDashboard();
  injectFooter();
  initHamburger();
}

boot();
