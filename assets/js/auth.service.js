/* =============================================================
   RDV — Auth locale (localStorage)
   Remplace AWS Cognito pour un usage 100% local / démo.
   ============================================================= */

const AUTH_KEY     = 'rdv_user';
const SESSION_KEY  = 'rdv_session';

// ── Stockage ──────────────────────────────────────────────────

function getStoredUser() {
  try { return JSON.parse(localStorage.getItem(AUTH_KEY) || 'null'); }
  catch { return null; }
}

function getSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); }
  catch { return null; }
}

function createSession(user) {
  const session = { email: user.email, name: user.name, expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function isSessionValid() {
  const s = getSession();
  return s && s.expiresAt > Date.now();
}

// ── Guest access ─────────────────────────────────────────────

function continuerEnInvite() {
  const session = { name: 'Invité', email: '', isGuest: true, expiresAt: Date.now() + 2 * 60 * 60 * 1000 };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  window.location.href = './index.html';
}

// ── Sign Up ───────────────────────────────────────────────────

function cognitoSignUp(name, email, password) {
  return new Promise((resolve, reject) => {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = getStoredUser();
    if (existing && existing.email === normalizedEmail) {
      return reject('Un compte avec cet email existe déjà.');
    }
    localStorage.setItem(AUTH_KEY, JSON.stringify({ name: name.trim(), email: normalizedEmail, password }));
    resolve({ name, email: normalizedEmail });
  });
}

// ── Sign In ───────────────────────────────────────────────────

function cognitoSignIn(email, password) {
  return new Promise((resolve, reject) => {
    const normalizedEmail = email.trim().toLowerCase();
    const user = getStoredUser();
    if (!user) return reject('Aucun compte trouvé. Veuillez créer un compte.');
    if (user.email !== normalizedEmail || user.password !== password) {
      return reject('Email ou mot de passe incorrect.');
    }
    createSession(user);
    resolve(user);
  });
}

// ── Sign Out ──────────────────────────────────────────────────

function cognitoSignOut() {
  clearSession();
  window.location.href = './login.html';
}

// ── Route Guard ───────────────────────────────────────────────

function requireAuth() {
  if (!isSessionValid()) {
    window.location.replace('./login.html');
  }
}

// ── Get current user info ─────────────────────────────────────

function getCurrentUserInfo() {
  return new Promise((resolve) => {
    if (!isSessionValid()) return resolve(null);
    const s = getSession();
    resolve(s ? { name: s.name, email: s.email } : null);
  });
}
