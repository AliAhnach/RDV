/* =============================================================
   RDV — Auth Service (Flask backend)
   Remplace l'ancien système localStorage / Cognito simulé.
   Prêt pour JWT : ajouter le token dans saveSession() et
   l'envoyer dans les headers fetch() des futures requêtes.
   ============================================================= */

const API_BASE   = 'http://127.0.0.1:5000/api';
const SESSION_KEY = 'rdv_session';

// ── Session ───────────────────────────────────────────────────

/** Sauvegarde l'utilisateur en session (7 jours). */
function saveSession(user) {
  const session = {
    id:        user.id,
    fullname:  user.fullname,
    email:     user.email,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
    // token: user.token  ← décommenter pour JWT
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

/** Retourne l'objet session ou null. */
function getCurrentUser() {
  try {
    const s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    return (s && s.expiresAt > Date.now()) ? s : null;
  } catch { return null; }
}

/** Retourne true si une session valide existe. */
function isAuthenticated() {
  return getCurrentUser() !== null;
}

/** Supprime la session et redirige vers login. */
function logout() {
  localStorage.removeItem(SESSION_KEY);
  window.location.href = './login.html';
}

// ── API calls ─────────────────────────────────────────────────

/**
 * Inscription via POST /api/register.
 * @returns {Promise<{success, message}>}
 * @throws {string} message d'erreur lisible
 */
async function register(fullname, email, password) {
  const res = await fetch(`${API_BASE}/register`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ fullname, email, password })
  });
  const data = await res.json();
  if (!data.success) throw data.message || 'Erreur lors de l\'inscription.';
  return data;
}

/**
 * Connexion via POST /api/login.
 * Sauvegarde la session automatiquement.
 * @returns {Promise<object>} user
 * @throws {string} message d'erreur lisible
 */
async function login(email, password) {
  const res = await fetch(`${API_BASE}/login`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!data.success) throw data.message || 'Email ou mot de passe incorrect.';
  saveSession(data.user);
  return data.user;
}

// ── Guest access ──────────────────────────────────────────────

function continuerEnInvite() {
  const session = {
    fullname:  'Invité',
    email:     '',
    isGuest:   true,
    expiresAt: Date.now() + 2 * 60 * 60 * 1000
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  window.location.href = './user-dashboard.html';
}

// ── Route Guard ───────────────────────────────────────────────

function requireAuth() {
  if (!isAuthenticated()) window.location.replace('./login.html');
}
