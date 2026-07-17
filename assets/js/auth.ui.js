/* Diprella Auth Toggle Logic (vanilla JS only) */

function handleGoogleAuth(mode = 'signin') {
  const role = 'user';

  try {
    const googleUser = window.google && window.google.accounts && window.google.accounts.id
      ? null
      : null;

    const fallbackUser = {
      name: 'Google User',
      email: 'google.user@rdv.local',
      password: 'google-auth-demo',
      role,
      provider: 'google-demo'
    };

    const profileToStore = googleUser && googleUser.getBasicProfile ? {
      name: googleUser.getBasicProfile().getName() || 'Google User',
      email: googleUser.getBasicProfile().getEmail() || fallbackUser.email,
      password: 'google-auth-demo',
      role,
      provider: 'google'
    } : fallbackUser;

    window.localStorage.setItem('rdv_user', JSON.stringify(profileToStore));
    window.localStorage.setItem('rdv_session', JSON.stringify({
      email: profileToStore.email,
      name: profileToStore.name,
      role,
      provider: profileToStore.provider,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
    }));

    if (typeof window.cognitoSignIn === 'function' && mode === 'signin') {
      window.cognitoSignIn(profileToStore.email, profileToStore.password)
        .then(() => {
          const roleFromSession = window.getUserRole ? window.getUserRole() : role;
          window.location.href = roleFromSession === 'admin' ? './index.html' : './user-dashboard.html';
        })
        .catch(() => {
          window.location.href = './user-dashboard.html';
        });
      return;
    }

    if (typeof window.cognitoSignUp === 'function') {
      window.cognitoSignUp(profileToStore.name, profileToStore.email, profileToStore.password, role)
        .then(() => window.cognitoSignIn(profileToStore.email, profileToStore.password))
        .then(() => {
          const roleFromSession = window.getUserRole ? window.getUserRole() : role;
          window.location.href = roleFromSession === 'admin' ? './index.html' : './user-dashboard.html';
        })
        .catch(() => {
          window.location.href = './user-dashboard.html';
        });
    } else {
      window.location.href = './user-dashboard.html';
    }
  } catch (err) {
    console.error(err);
    window.location.href = './user-dashboard.html';
  }
}

(function () {
  'use strict';

  const page = document.getElementById('auth-page');
  if (!page) return;

  const formSignin = document.getElementById('form-signin');
  const formSignup = document.getElementById('form-signup');
  if (!formSignin || !formSignup) return;

  // Default state: Sign Up visible
  // Using ONLY one class toggle on the main container.
  function setState(state) {
    // state: 'signin' | 'signup'
    page.classList.remove('is-signin', 'is-signup');
    page.classList.add(state === 'signin' ? 'is-signin' : 'is-signup');
  }

  // Initialize
  setState('signup');

  // Click handlers to switch forms.
  document.addEventListener('click', (e) => {
    const switchBtn = e.target && e.target.closest ? e.target.closest('[data-switch]') : null;
    if (switchBtn) {
      e.preventDefault();
      const target = switchBtn.getAttribute('data-switch');
      if (target === 'signin') setState('signin');
      if (target === 'signup') setState('signup');
      return;
    }

    const overlayCta = e.target && e.target.closest ? e.target.closest('[data-overlay-cta]') : null;
    if (overlayCta) {
      e.preventDefault();
      const target = overlayCta.getAttribute('data-overlay-cta');
      if (target === 'signin') setState('signin');
      if (target === 'signup') setState('signup');
    }
  });

  // Prevent navigation for demo links/buttons.
  // Important: on ne bloque pas la soumission ici.
  // La logique de connexion est gérée ailleurs (initAuthPage dans assets/js/app.js).
  // Ce script ne fait que le toggle UI Sign In / Sign Up.


  // Keyboard accessibility: pressing Enter/Space on buttons is already handled by browsers.
  // But we ensure Escape returns to Sign In.
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setState('signin');
  });
})();

