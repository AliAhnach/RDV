/* =============================================================
   RDV — Auth Service (Flask backend)
   Remplace l'ancien système localStorage / Cognito simulé.
   Prêt pour JWT : ajouter le token dans saveSession() et
   l'envoyer dans les headers fetch() des futures requêtes.
   ============================================================= */

const API_BASE   = 'https://aliahnach.pythonanywhere.com/api';
const SESSION_KEY = 'rdv_session';

// ── Session ───────────────────────────────────────────────────

function resolveUserRole(user) {
  if (!user) return 'user';
  const role = String(user.role || '').trim().toLowerCase();
  return role === 'admin' ? 'admin' : 'user';
}

function normalizeSessionUser(user) {
  if (!user) return null;
  const role = resolveUserRole(user);
  return {
    ...user,
    role,
    isAdmin: role === 'admin',
    fullname: user.fullname || user.name || user.fullName || '',
    name: user.name || user.fullname || user.fullName || ''
  };
}

/** Sauvegarde l'utilisateur en session (7 jours). */
function saveSession(user) {
  const normalizedUser = normalizeSessionUser(user);
  const session = {
    id:        normalizedUser?.id,
    fullname:  normalizedUser?.fullname || '',
    name:      normalizedUser?.name || normalizedUser?.fullname || '',
    email:     normalizedUser?.email || '',
    role:      normalizedUser?.role || 'user',
    isAdmin:   normalizedUser?.isAdmin || false,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
    // token: user.token  ← décommenter pour JWT
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

/** Retourne l'objet session ou null. */
function getCurrentUser() {
  try {
    const s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    if (s && s.expiresAt > Date.now()) {
      const normalized = normalizeSessionUser(s);
      if (normalized) {
        if (!normalized.name && normalized.fullname) normalized.name = normalized.fullname;
        return normalized;
      }
      return s;
    }
    return null;
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

function cognitoSignOut() {
  logout();
}

function getUserRole() {
  const user = getCurrentUser();
  return user && user.role ? user.role : 'user';
}

function requireAdmin() {
  const user = getCurrentUser();
  if (!user || user.role !== 'admin') {
    window.location.replace('./login.html');
  }
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
    role:      'user',
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
