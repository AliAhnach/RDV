// Fill profile pill + welcome from session
const s = JSON.parse(localStorage.getItem('rdv_session') || 'null');
if (s) {
  const initials = s.isGuest ? '👤' : (s.name || '?').trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  document.getElementById('pill-initials').textContent = initials;
  document.getElementById('pill-name').textContent     = s.isGuest ? 'Invité' : (s.name || '—');
  document.getElementById('pill-handle').textContent   = s.isGuest ? 'Mode consultation' : (s.email || '—');
  const firstName = s.isGuest ? 'Invité' : (s.name || '').trim().split(' ')[0];
  document.getElementById('welcome-name').textContent  = firstName + ' !';

  // Show guest banner if guest
  if (s.isGuest) {
    const banner = document.createElement('div');
    banner.style.cssText = 'background:linear-gradient(90deg,#1f5fbf,#102d63);color:#fff;text-align:center;padding:9px 16px;font-size:13px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:12px;flex-shrink:0;';
    banner.innerHTML = '👁️ Vous consultez en mode invité — certaines fonctionnalités sont limitées. <a href="./login.html" style="color:#a8d4ff;font-weight:700;text-decoration:underline;">Créer un compte</a>';
    document.querySelector('.main').prepend(banner);
  }
}

function placeOrder(btn) {
  btn.textContent = '✓ Commande passée !';
  btn.style.background = '#16a34a';
  setTimeout(() => {
    btn.innerHTML = 'Place Order <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M7 17 17 7M7 7h10v10"/></svg>';
    btn.style.background = '';
  }, 2500);
}

document.querySelectorAll('.marker').forEach(m => {
  m.addEventListener('click', function () {
    document.querySelectorAll('.marker').forEach(x => x.classList.remove('active'));
    this.classList.add('active');
  });
});
