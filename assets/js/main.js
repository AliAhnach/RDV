// ===== Auth (AWS Cognito) =====

function setSubmitting(btn, loading) {
  btn.disabled = loading;
  btn.querySelector('span').textContent = loading ? 'Chargement...' : btn.dataset.label;
}

function initAuthPage() {
  const isAuthPage = !!document.getElementById('form-signin') || !!document.getElementById('form-signup');
  if (!isAuthPage) return;

  const formLogin  = document.getElementById('form-signin');
  const formSignup = document.getElementById('form-signup');
  const msg1 = document.getElementById('auth-message');
  const msg2 = document.getElementById('auth-message2');

  // Store original button labels for reset after loading
  [formLogin, formSignup].forEach(f => {
    if (!f) return;
    const btn = f.querySelector('button[type="submit"]');
    if (btn) btn.dataset.label = btn.querySelector('span').textContent;
  });

  if (formSignup) {
    formSignup.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data  = new FormData(formSignup);
      const name  = String(data.get('name')     || '').trim();
      const email = String(data.get('email')    || '').trim().toLowerCase();
      const pass  = String(data.get('password') || '');
      const role  = String(data.get('role')     || 'user');

      if (!name || !email || pass.length < 4) {
        if (msg2) msg2.textContent = 'Remplissez tous les champs (mot de passe min. 4 caractères).';
        return;
      }

      const btn = formSignup.querySelector('button[type="submit"]');
      setSubmitting(btn, true);
      if (msg2) msg2.textContent = '';

      try {
        await cognitoSignUp(name, email, pass, role);
        await cognitoSignIn(email, pass);
        redirectToDashboard();
      } catch (err) {
        if (msg2) msg2.textContent = err;
        setSubmitting(btn, false);
      }
    });
  }

  if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data  = new FormData(formLogin);
      const email = String(data.get('email')    || '').trim().toLowerCase();
      const pass  = String(data.get('password') || '');

      if (!email || !pass) {
        if (msg1) msg1.textContent = 'Veuillez remplir tous les champs.';
        return;
      }

      const btn = formLogin.querySelector('button[type="submit"]');
      setSubmitting(btn, true);
      if (msg1) msg1.textContent = '';

      try {
        await cognitoSignIn(email, pass);
        redirectToDashboard();
      } catch (err) {
        if (msg1) msg1.textContent = err;
        setSubmitting(btn, false);
      }
    });
  }
}

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
  getCurrentUserInfo().then(user => {
    const l = document.getElementById('nav-loggedout');
    const a = document.getElementById('nav-auth-link');
    if (l) l.style.display = user ? '' : 'none';
    if (a) a.style.display = user ? 'none' : '';
  });
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

function initTopIcons() {
  const nav = (id, href) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('click', () => {
      if (typeof window.navigateTo === 'function') window.navigateTo(href);
      else window.location.href = href;
    });
  };
  nav('btn-notifications',  './messages.html');
  nav('btn-messages',       './messages.html');
  nav('btn-profile',        './parametres.html');
  nav('stat-card-rdv',      './appointments.html');
  nav('stat-card-clients',  './clients.html');
  nav('stat-card-messages', './messages.html');
}

function initProfileName() {
  const el = document.getElementById('profile-name');
  if (!el) return;
  getCurrentUserInfo().then(user => {
    el.textContent = (user && user.name) ? user.name : 'Invité';
  });
}

function initDashboardWelcome() {
  const el = document.getElementById('dashboard-welcome-username');
  if (!el) return;
  getCurrentUserInfo().then(user => {
    el.textContent = (user && user.name) ? user.name : 'Invité';
  });
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
    const user = getStoredUser();
    if (!user) return;
    if (currentNameEl)  currentNameEl.textContent  = user.name  || '—';
    if (currentEmailEl) currentEmailEl.textContent = user.email || '—';
    if (nameInput)      nameInput.value  = user.name  || '';
    if (emailInput)     emailInput.value = user.email || '';
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

    const current = getStoredUser() || {};
    const updated = { ...current, name, email };
    if (password) updated.password = password;

    localStorage.setItem(AUTH_KEY, JSON.stringify(updated));

    // Mettre à jour la session active
    const session = getSession();
    if (session) {
      session.name  = name;
      session.email = email;
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
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
  const user = JSON.parse(localStorage.getItem('rdv_user') || 'null');
  if (!user) return;
  const initials = (user.name || '?').trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const avatar    = document.getElementById('hero-avatar');
  const heroName  = document.getElementById('hero-name');
  const heroEmail = document.getElementById('hero-email');
  if (avatar)    avatar.textContent    = initials;
  if (heroName)  heroName.textContent  = user.name  || '—';
  if (heroEmail) heroEmail.textContent = user.email || '—';
}

function deleteAccount() {
  if (!confirm('Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.')) return;
  localStorage.removeItem('rdv_user');
  localStorage.removeItem('rdv_session');
  window.location.href = './login.html';
}

function initPillFromSession() {
  const pillInitials = document.getElementById('pill-initials');
  const pillName     = document.getElementById('pill-name');
  const pillHandle   = document.getElementById('pill-handle');
  if (!pillInitials) return;
  const s = getSession();
  if (!s) return;
  const initials = (s.name || '?').trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  pillInitials.textContent = initials;
  if (pillName)   pillName.textContent   = s.name  || '—';
  if (pillHandle) pillHandle.textContent = s.email || '—';
}

function initHamburger() {
  const btn      = document.getElementById('hamburger');
  const sidebar  = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  const body     = document.body;
  if (!btn || !sidebar) return;

  const isMobile = () => window.matchMedia('(max-width: 768px)').matches;

  function ensureMobileCloseButton() {
    if (!isMobile()) return;
    let closeBtn = sidebar.querySelector('.sidebar-close');
    if (!closeBtn) {
      closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'sidebar-close';
      closeBtn.setAttribute('aria-label', 'Fermer le menu');
      closeBtn.innerHTML = '✕';
      sidebar.insertBefore(closeBtn, sidebar.firstChild);
    }
    return closeBtn;
  }

  function setSidebarState(isOpen) {
    const mobile = isMobile();
    sidebar.classList.toggle('open', mobile && isOpen);
    if (backdrop) backdrop.classList.toggle('open', mobile && isOpen);
    btn.classList.toggle('is-open', mobile && isOpen);
    body.classList.toggle('sidebar-open', mobile && isOpen);
    body.style.overflow = mobile && isOpen ? 'hidden' : '';
    btn.setAttribute('aria-expanded', String(mobile && isOpen));
    btn.setAttribute('aria-controls', 'sidebar');
    if (!mobile) {
      sidebar.classList.remove('open');
      if (backdrop) backdrop.classList.remove('open');
      btn.classList.remove('is-open');
      body.classList.remove('sidebar-open');
      body.style.overflow = '';
    }
  }

  function openSidebar() { setSidebarState(true); }
  function closeSidebar() { setSidebarState(false); }

  const closeBtn = ensureMobileCloseButton();
  if (closeBtn) closeBtn.addEventListener('click', closeSidebar);

  btn.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    const isOpen = sidebar.classList.contains('open');
    if (isOpen) closeSidebar(); else openSidebar();
  });

  if (backdrop) {
    backdrop.addEventListener('click', closeSidebar);
    backdrop.addEventListener('touchstart', closeSidebar);
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && sidebar.classList.contains('open')) closeSidebar();
  });

  window.addEventListener('resize', () => {
    if (!isMobile()) {
      closeSidebar();
      ensureMobileCloseButton();
    } else {
      ensureMobileCloseButton();
    }
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
      Développeur
    </a>`;
  main.appendChild(footer);
}

function boot() {
  initAuthPage();
  if (document.getElementById('form-signin') || document.getElementById('form-signup')) return;

  // Hide clients link for non-admin users
  if (getUserRole() !== 'admin') {
    document.querySelectorAll('.sidebar nav a[href*="clients"]').forEach(a => a.remove());
  }

  highlightActiveNav();
  initAuthStateUI();
  initProfileName();
  initDashboardWelcome();
  initSettingsPage();
  initModal();

  initRdvPage();
  initTopIcons();
  initParametresPage();
  injectFooter();
  initHamburger();
}

boot();
