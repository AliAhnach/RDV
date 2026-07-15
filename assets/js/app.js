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

      if (!name || !email || pass.length < 4) {
        if (msg2) msg2.textContent = 'Remplissez tous les champs (mot de passe min. 4 caractères).';
        return;
      }

      const btn = formSignup.querySelector('button[type="submit"]');
      setSubmitting(btn, true);
      if (msg2) msg2.textContent = '';

      try {
        await cognitoSignUp(name, email, pass);
        // Auto sign-in right after sign-up
        await cognitoSignIn(email, pass);
        window.location.href = './index.html';
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
        window.location.href = './index.html';
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
  if (file.includes("rendez-vous")) return "rendez-vous";
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
    const isRdv = href.includes("rendez-vous.html");
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
  const notifications = document.getElementById('btn-notifications');
  if (notifications) {
    notifications.addEventListener('click', () => {
      window.location.href = './messages.html';
    });
  }

  const profile = document.getElementById('btn-profile');
  if (profile) {
    profile.addEventListener('click', () => {
      window.location.href = './parametres.html';
    });
  }
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
  window.location.href = './auth.html';
}

function boot() {
  initAuthPage();
  // Si on est sur la page auth, on évite de lancer le reste
  if (document.getElementById('form-signin') || document.getElementById('form-signup')) return;


  highlightActiveNav();
  initAuthStateUI();
  initProfileName();
  initDashboardWelcome();
  initSettingsPage();
  initModal();

  initRdvPage();
  initTopIcons();
  initParametresPage();
}

boot();
