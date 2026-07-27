// ===== Auth page (géré par auth.ui.js) =====
function initAuthPage() {}

function $(sel) {
  return document.querySelector(sel);
}

function $all(sel) {
  return Array.from(document.querySelectorAll(sel));
}

const APP_TRANSLATIONS = {
  fr: { dashboard: 'Dashboard', appointments: 'Rendez-vous', messages: 'Messages', settings: 'Paramètres', logout: 'Déconnexion', account: 'Compte' },
  en: { dashboard: 'Dashboard', appointments: 'Appointments', messages: 'Messages', settings: 'Settings', logout: 'Sign out', account: 'Account' },
  ar: { dashboard: 'لوحة التحكم', appointments: 'المواعيد', messages: 'الرسائل', settings: 'الإعدادات', logout: 'تسجيل الخروج', account: 'الحساب' },
};

function updateLanguage(lang) {
  const language = APP_TRANSLATIONS[lang] ? lang : 'fr';
  const dictionary = APP_TRANSLATIONS[language];
  localStorage.setItem('lang', language);
  document.documentElement.lang = language;
  document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';

  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.dataset.i18n;
    if (dictionary[key]) element.textContent = dictionary[key];
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
    const key = element.dataset.i18nPlaceholder;
    if (dictionary[key]) element.placeholder = dictionary[key];
  });

  const navKeys = [
    ['index.html', 'dashboard'], ['appointments.html', 'appointments'],
    ['messages.html', 'messages'], ['parametres.html', 'settings'],
  ];
  document.querySelectorAll('.sidebar nav a').forEach(link => {
    const href = link.getAttribute('href') || '';
    const match = navKeys.find(([path]) => href.includes(path));
    const key = match ? match[1] : href === '#' ? 'logout' : null;
    if (!key) return;
    const textNode = Array.from(link.childNodes).find(node => node.nodeType === Node.TEXT_NODE && node.nodeValue.trim());
    if (textNode) textNode.nodeValue = ` ${dictionary[key]}`;
    else if (link.children.length === 0) link.textContent = dictionary[key];
  });
  document.querySelectorAll('.account-label').forEach(element => {
    if (element.textContent.trim() === 'Compte' || element.dataset.i18n === 'account') element.textContent = dictionary.account;
  });
}

function getPageId() {
  const path = window.location.pathname || "";
  const file = path.split("/").pop() || "index.html";
  if (file === "index.html") return "dashboard";
  if (file.includes("appointments")) return "rendez-vous";
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
    const isMessages = href.includes("messages.html");
    const isParam = href.includes("parametres.html");
    const isLogout = href.includes("deconnexion.html");

    const shouldActive =
      (pageId === "dashboard" && isDashboard) ||
      (pageId === "rendez-vous" && isRdv) ||
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
  const container = $('#rdv-list');
  const empty = $('#rdv-empty');
  if (!container) return;
  container.innerHTML = '';
  if (!list || list.length === 0) {
    if (empty) empty.hidden = false;
    return;
  }
  if (empty) empty.hidden = true;
  list.forEach(rdv => {
    const row = document.createElement('div');
    row.className = 'rdv';
    const left = document.createElement('div');
    left.innerHTML = `<strong>${rdv.client}</strong><p>${rdv.time} — ${rdv.type}</p>`;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Voir';
    btn.addEventListener('click', () => openModal(rdv));
    row.appendChild(left);
    row.appendChild(btn);
    container.appendChild(row);
  });
}

function initRdvPage() {
  if (!$('#rdv-list')) return;
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

function initTopIcons() {
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
  nav('stat-card-messages', './messages.html');
}

function initProfileName() {
  const el = document.getElementById('profile-name');
  const welcomeEl = document.getElementById('welcome-name');
  const dashboardWelcomeEl = document.getElementById('dashboard-welcome-username');
  const accountBtn = document.getElementById('btn-account');

  const user = getCurrentUser();
  const fullName = (user && user.fullname) ? user.fullname : (user && user.name) ? user.name : 'Utilisateur';
  const firstName = String(fullName).trim().split(/\s+/)[0] || 'Utilisateur';

  if (el) el.textContent = fullName;
  if (welcomeEl) welcomeEl.textContent = firstName;
  if (dashboardWelcomeEl) dashboardWelcomeEl.textContent = firstName;

  if (accountBtn) {
    let label = accountBtn.querySelector('.account-label');
    if (!label) {
      label = document.createElement('span');
      label.className = 'account-label';
      accountBtn.appendChild(label);
    }
    label.textContent = fullName.length > 10 ? firstName : fullName;
    label.title = fullName;
  }
}

function initDashboardWelcome() {
  const el = document.getElementById('dashboard-welcome-username');
  if (!el) return;
  const user = getCurrentUser();
  const name = (user && user.fullname) ? user.fullname : 'Utilisateur';
  el.textContent = String(name).trim().split(/\s+/)[0] || 'Utilisateur';
}

function initSettingsPage() {
  const form = document.getElementById('settings-form');
  if (!form) return;

  const STORAGE = {
    profile: 'rdv_settings_profile',
    notifications: 'rdv_settings_notifications',
    preferences: 'rdv_settings_preferences',
  };
  const messageEl = document.getElementById('settings-message');
  const nameInput = document.getElementById('settings-name');
  const emailInput = document.getElementById('settings-email');
  const phoneInput = document.getElementById('settings-phone');
  const passwordInput = document.getElementById('settings-password');
  const searchInput = document.getElementById('settings-search');
  const languageSelect = document.getElementById('settings-language');
  const timezoneSelect = document.getElementById('settings-timezone');
  const darkModeInput = document.getElementById('settings-dark-mode');

  const readStorage = (key, fallback) => {
    try { return { ...fallback, ...JSON.parse(localStorage.getItem(key) || '{}') }; }
    catch { return fallback; }
  };
  const showMessage = (text, type = 'success') => {
    if (messageEl) {
      messageEl.textContent = text;
      messageEl.style.color = type === 'error' ? '#dc2626' : '#15803d';
    }
    let toast = document.getElementById('settings-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'settings-toast';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      document.body.appendChild(toast);
    }
    toast.textContent = text;
    toast.className = `settings-toast settings-toast--${type} is-visible`;
    window.clearTimeout(showMessage.timer);
    showMessage.timer = window.setTimeout(() => {
      toast.classList.remove('is-visible');
      if (messageEl) messageEl.textContent = '';
    }, 3500);
  };

  const session = getCurrentUser();
  let savedProfile = readStorage(STORAGE.profile, {});
  if (nameInput) nameInput.value = savedProfile.name || session?.fullname || '';
  if (emailInput) emailInput.value = savedProfile.email || session?.email || '';
  if (phoneInput) phoneInput.value = savedProfile.phone || '';
  if (passwordInput) passwordInput.value = '';

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = nameInput.value.trim();
    const email = emailInput.value.trim().toLowerCase();
    const phone = phoneInput.value.trim();
    const password = passwordInput.value;

    if (!name || !email || !email.includes('@')) {
      showMessage('Veuillez renseigner un nom et une adresse email valide.', 'error');
      return;
    }
    if (password && password.length < 6) {
      showMessage('Le mot de passe doit contenir au moins 6 caractères.', 'error');
      return;
    }

    savedProfile = { ...savedProfile, name, email, phone, passwordUpdatedAt: password ? Date.now() : savedProfile.passwordUpdatedAt || null };
    localStorage.setItem(STORAGE.profile, JSON.stringify(savedProfile));
    if (session) saveSession({ ...session, fullname: name, name, email });
    passwordInput.value = '';
    const profileName = document.getElementById('profile-name');
    if (profileName) profileName.textContent = name;
    showMessage('Modifications enregistrées avec succès !');
  });

  const notificationDefaults = { reminders: true, email: true, messages: false };
  const notifications = readStorage(STORAGE.notifications, notificationDefaults);
  const notificationInputs = {
    reminders: document.getElementById('notification-reminders'),
    email: document.getElementById('notification-email'),
    messages: document.getElementById('notification-messages'),
  };
  Object.entries(notificationInputs).forEach(([key, input]) => {
    if (!input) return;
    input.checked = Boolean(notifications[key]);
    input.addEventListener('change', () => {
      notifications[key] = input.checked;
      localStorage.setItem(STORAGE.notifications, JSON.stringify(notifications));
      showMessage('Préférence de notification enregistrée.');
    });
  });

  const preferences = readStorage(STORAGE.preferences, { language: 'fr', timezone: 'Africa/Casablanca' });
  if (languageSelect) {
    languageSelect.value = localStorage.getItem('rdv_lang') || localStorage.getItem('lang') || preferences.language || 'fr';
    languageSelect.addEventListener('change', () => {
      preferences.language = languageSelect.value;
      localStorage.setItem(STORAGE.preferences, JSON.stringify(preferences));
      if (typeof setLang === 'function') {
        setLang(languageSelect.value);
      } else {
        localStorage.setItem('rdv_lang', languageSelect.value);
        localStorage.setItem('lang', languageSelect.value);
      }
      showMessage('Langue enregistrée.');
    });
  }
  if (timezoneSelect) {
    timezoneSelect.value = preferences.timezone;
    timezoneSelect.addEventListener('change', () => {
      preferences.timezone = timezoneSelect.value;
      localStorage.setItem(STORAGE.preferences, JSON.stringify(preferences));
      showMessage('Fuseau horaire enregistré.');
    });
  }
  if (darkModeInput) {
    darkModeInput.checked = !document.body.classList.contains('light-theme');
    document.body.classList.toggle('dark-theme', darkModeInput.checked);
    darkModeInput.addEventListener('change', () => {
      const isDark = darkModeInput.checked;
      document.body.classList.toggle('light-theme', !isDark);
      document.body.classList.toggle('dark-theme', isDark);
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
      showMessage(`Mode ${isDark ? 'sombre' : 'clair'} activé.`);
    });
  }

  if (searchInput) {
    const sections = Array.from(document.querySelectorAll('.settings-section'));
    const empty = document.createElement('p');
    empty.className = 'settings-search-empty';
    empty.textContent = 'Aucun paramètre ne correspond à votre recherche.';
    empty.hidden = true;
    document.querySelector('.settings-grid')?.after(empty);
    searchInput.addEventListener('input', () => {
      const query = searchInput.value.trim().toLocaleLowerCase('fr');
      let matches = 0;
      sections.forEach(section => {
        const visible = !query || section.textContent.toLocaleLowerCase('fr').includes(query);
        section.hidden = !visible;
        if (visible) matches += 1;
      });
      empty.hidden = matches > 0;
    });
  }

  document.getElementById('settings-logout')?.addEventListener('click', () => {
    if (typeof window.logout === 'function') window.logout();
    else window.location.href = './login.html';
  });

  document.getElementById('settings-delete-account')?.addEventListener('click', () => {
    const modal = document.createElement('div');
    modal.className = 'settings-modal';
    modal.innerHTML = `<div class="settings-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="delete-account-title">
      <h2 id="delete-account-title">Supprimer le compte ?</h2>
      <p>Êtes-vous sûr ? Cette action est irréversible.</p>
      <div class="settings-modal__actions"><button type="button" data-action="cancel">Annuler</button><button type="button" data-action="confirm">Supprimer définitivement</button></div>
    </div>`;
    document.body.appendChild(modal);
    modal.querySelector('[data-action="cancel"]').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', event => { if (event.target === modal) modal.remove(); });
    modal.querySelector('[data-action="confirm"]').addEventListener('click', () => {
      ['rdv_session', STORAGE.profile, STORAGE.notifications, STORAGE.preferences, 'rdv_lang', 'theme', 'rdv-theme'].forEach(key => localStorage.removeItem(key));
      window.location.href = './login.html';
    });
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
    <span class="footer-copy">© 2025 RDV Plateforme. Tous droits réservés.</span>
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
      const res = await apiFetch(`${API_BASE}/dashboard/user/${encodeURIComponent(session.id)}`);
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

  highlightActiveNav();
  initAuthStateUI();
  updateLanguage(localStorage.getItem('lang') || localStorage.getItem('rdv_lang') || 'fr');
  initProfileName();
  initPillFromSession();
  initDashboardWelcome();
  initSettingsPage();
  initModal();

  initRdvPage();
  initTopIcons();
  initParametresPage();
  initUserDashboard();
  injectFooter();
  initHamburger();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
