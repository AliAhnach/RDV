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
  const session = { email: user.email, name: user.name, role: user.role || 'user', expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function isSessionValid() {
  const s = getSession();
  return s && s.expiresAt > Date.now();
}

function _go(href) {
  if (typeof window.navigateTo === 'function') {
    window.navigateTo(href);
  } else {
    window.location.href = href;
  }
}

// ── Guest access ─────────────────────────────────────────────

function continuerEnInvite() {
  const session = { name: 'Invité', email: '', isGuest: true, expiresAt: Date.now() + 2 * 60 * 60 * 1000 };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  _go('./index.html');
}

// ── Config ────────────────────────────────────────────────────

const API_BASE = 'http://127.0.0.1:5000';

// ── Sign Up ───────────────────────────────────────────────────

async function cognitoSignUp(name, email, password) {
  const res = await fetch(`${API_BASE}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullname: name.trim(), email: email.trim().toLowerCase(), password })
  });
  const data = await res.json();
  if (!res.ok) throw data.message || 'Erreur lors de la création du compte.';
  return data;
}

// ── Sign In ───────────────────────────────────────────────────

async function cognitoSignIn(email, password) {
  const res = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim().toLowerCase(), password })
  });
  const data = await res.json();
  if (!res.ok) throw data.message || 'Email ou mot de passe incorrect.';
  const user = { name: data.name || data.fullname || email, email: email.trim().toLowerCase(), role: data.role || 'user' };
  createSession(user);
  return user;
}

// ── Sign Out ──────────────────────────────────────────────────

function cognitoSignOut() {
  clearSession();
  _go('./login.html');
}

// ── Route Guard ───────────────────────────────────────────────

function requireAuth() {
  if (!isSessionValid()) {
    window.location.replace('./login.html');
  }
}

function requireAdmin() {
  if (!isSessionValid()) {
    window.location.replace('./login.html');
    return;
  }
  if (getUserRole() !== 'admin') {
    window.location.replace('./user-dashboard.html');
  }
}

// ── Get current user info ─────────────────────────────────────

function getCurrentUserInfo() {
  return new Promise((resolve) => {
    if (!isSessionValid()) return resolve(null);
    const s = getSession();
    resolve(s ? { name: s.name, email: s.email, role: s.role || 'user' } : null);
  });
}

function getUserRole() {
  const s = getSession();
  return (s && s.role) ? s.role : 'user';
}

function redirectToDashboard() {
  const role = getUserRole();
  _go(role === 'admin' ? './index.html' : './user-dashboard.html');
}
