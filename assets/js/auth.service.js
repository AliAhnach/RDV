/* =============================================================
   RDV — Auth Service (Flask backend)
   Authentification par session Flask (cookie).
   credentials: 'include' sur tous les appels API pour que
   le navigateur envoie automatiquement le cookie de session.
   ============================================================= */

// API_BASE dynamique : utilise l'URL locale en développement et la prod sur PythonAnywhere.
// La variable globale window.RDV_API_BASE est définie par api.config.js, qui doit être chargé avant ce script.
const API_BASE = (() => {
  if (typeof window !== 'undefined' && window.RDV_API_BASE) {
    return window.RDV_API_BASE;
  }
  // Fallback de sécurité si api.config.js n'est pas chargé.
  console.error("[AuthService] Erreur critique : window.RDV_API_BASE n'est pas défini. Assurez-vous que api.config.js est chargé avant auth.service.js.");
  return 'https://AliAhnach.pythonanywhere.com/api';
})();

// Affiche l'URL de l'API utilisée dans la console pour le débogage.
console.log(`[AuthService] L'API de base est : ${API_BASE}`);

async function healthCheck() {
  try {
    const response = await fetch(`${API_BASE}/health`, { credentials: 'include' });
    if (!response.ok) throw new Error('Health check failed');
    return await response.json();
  } catch (error) {
    console.error('[health] Backend inaccessible:', error);
    return null;
  }
}
const SESSION_KEY = 'rdv_session';

function apiErrorMessage(status, data = {}, fallback = 'La requête a échoué.') {
  if (data.message || data.error) return data.message || data.error;
  const messages = {
    400: 'Les données envoyées sont invalides.',
    401: 'Votre session a expiré. Veuillez vous reconnecter.',
    403: 'Vous n’êtes pas autorisé à effectuer cette action.',
    404: 'La ressource demandée est introuvable.',
    500: 'Une erreur serveur est survenue. Réessayez plus tard.',
  };
  return messages[status] || fallback;
}

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
    name: user.name || user.fullname || user.fullName || '',
    avatar: user.avatar || ''
  };
}

/** Sauvegarde les infos utilisateur en localStorage (7 jours). */
function saveSession(user) {
  const normalizedUser = normalizeSessionUser(user);
  const session = {
    id:        normalizedUser?.id,
    fullname:  normalizedUser?.fullname || '',
    name:      normalizedUser?.name || normalizedUser?.fullname || '',
    email:     normalizedUser?.email || '',
    role:      normalizedUser?.role || 'user',
    avatar:    normalizedUser?.avatar || '',
    isAdmin:   normalizedUser?.isAdmin || false,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
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

/** Supprime la session locale, invalide la session Flask, redirige vers login. */
async function logout() {
  localStorage.removeItem(SESSION_KEY);
  try {
    await fetch(`${API_BASE}/logout`, { method: 'POST', credentials: 'include' });
  } catch { /* serveur injoignable, on continue */ }
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
    method:      'POST',
    credentials: 'include',
    headers:     { 'Content-Type': 'application/json' },
    body:        JSON.stringify({ fullname, email, password })
  });

  let data = {};
  try {
    data = await res.json();
  } catch (error) {
    throw new Error('Réponse invalide du backend.');
  }

  if (!res.ok || !data.success) throw new Error(apiErrorMessage(res.status, data, 'Erreur lors de l’inscription.'));
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
    method:      'POST',
    credentials: 'include',
    headers:     { 'Content-Type': 'application/json' },
    body:        JSON.stringify({ email, password })
  });

  let data = {};
  try {
    data = await res.json();
  } catch (error) {
    throw new Error('Réponse invalide du backend.');
  }

  if (!res.ok || !data.success) throw new Error(apiErrorMessage(res.status, data, 'Email ou mot de passe incorrect.'));
  console.log('[login] cookie de session reçu, user:', data.user);
  saveSession(data.user);
  return data.user;
}

// ── Route Guard ───────────────────────────────────────────────

function requireAuth() {
  if (!isAuthenticated()) window.location.replace('./login.html');
}

// ── apiFetch — fetch authentifié par cookie de session Flask ──

/**
 * Wrapper autour de fetch() qui envoie automatiquement le cookie
 * de session Flask (credentials: 'include') et redirige vers
 * login en cas de réponse 401.
 */
async function apiFetch(url, options = {}) {
  const user = getCurrentUser();
  if (!user) {
    window.location.replace('./login.html');
    throw new Error('Non authentifié.');
  }

  const headers = new Headers(options.headers || {});
  const method = (options.method || 'GET').toUpperCase();
  if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  // Pas de Authorization Bearer — l'auth se fait via le cookie de session Flask

  let response;
  try {
    response = await fetch(url, { ...options, headers, credentials: 'include' });
    console.log(`[apiFetch] ${options.method || 'GET'} ${url} → ${response.status}`);
  } catch (networkError) {
    console.error('[apiFetch] Erreur réseau:', url, networkError);
    throw new Error('Impossible de contacter le serveur. Vérifiez votre connexion.');
  }

  if (response.status === 401) {
    localStorage.removeItem(SESSION_KEY);
    window.location.replace('./login.html');
    throw new Error('Session expirée. Veuillez vous reconnecter.');
  }

  return response;
}
