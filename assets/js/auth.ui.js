/* =============================================================
   RDV — Auth UI
   Gère le toggle Sign In / Sign Up et soumet les formulaires
   vers le backend Flask via auth.service.js.
   ============================================================= */

(function () {
  'use strict';

  const page = document.getElementById('auth-page');
  if (!page) return;

  const formSignin = document.getElementById('form-signin');
  const formSignup = document.getElementById('form-signup');
  if (!formSignin || !formSignup) return;

  // ── Toggle Sign In / Sign Up ────────────────────────────────

  function setState(state) {
    page.classList.remove('is-signin', 'is-signup');
    page.classList.add(state === 'signin' ? 'is-signin' : 'is-signup');
  }

  setState('signup');

  document.addEventListener('click', (e) => {
    const btn = e.target?.closest('[data-switch], [data-overlay-cta]');
    if (!btn) return;
    e.preventDefault();
    const target = btn.dataset.switch || btn.dataset.overlayCta;
    if (target === 'signin' || target === 'signup') setState(target);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setState('signin');
  });

  // ── Helpers ─────────────────────────────────────────────────

  function setSubmitting(btn, loading) {
    btn.disabled = loading;
    btn.querySelector('span').textContent = loading ? 'Chargement...' : btn.dataset.label;
  }

  function showMessage(el, text, isError = true) {
    if (!el) return;
    el.textContent  = text;
    el.style.color  = isError ? '#e53e3e' : '#1f5fbf';
  }

  // Stocker les labels originaux des boutons submit
  [formSignin, formSignup].forEach(f => {
    const btn = f?.querySelector('button[type="submit"]');
    if (btn) btn.dataset.label = btn.querySelector('span').textContent;
  });

  // ── Sign In ─────────────────────────────────────────────────

  formSignin.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg  = document.getElementById('auth-message');
    const data = new FormData(formSignin);
    const email    = String(data.get('email')    || '').trim().toLowerCase();
    const password = String(data.get('password') || '');

    if (!email || !password) {
      showMessage(msg, 'Veuillez remplir tous les champs.');
      return;
    }

    const btn = formSignin.querySelector('button[type="submit"]');
    setSubmitting(btn, true);
    showMessage(msg, '');

    try {
      await login(email, password);
      window.location.href = './user-dashboard.html';
    } catch (err) {
      showMessage(msg, err);
      setSubmitting(btn, false);
    }
  });

  // ── Sign Up ─────────────────────────────────────────────────

  formSignup.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg  = document.getElementById('auth-message2');
    const data = new FormData(formSignup);
    const fullname = String(data.get('name')     || '').trim();
    const email    = String(data.get('email')    || '').trim().toLowerCase();
    const password = String(data.get('password') || '');

    if (!fullname || !email || password.length < 4) {
      showMessage(msg, 'Remplissez tous les champs (mot de passe min. 4 caractères).');
      return;
    }

    const btn = formSignup.querySelector('button[type="submit"]');
    setSubmitting(btn, true);
    showMessage(msg, '');

    try {
      await register(fullname, email, password);
      showMessage(msg, 'Compte créé ! Connexion en cours…', false);
      await login(email, password);
      window.location.href = './user-dashboard.html';
    } catch (err) {
      showMessage(msg, err);
      setSubmitting(btn, false);
    }
  });

})();
