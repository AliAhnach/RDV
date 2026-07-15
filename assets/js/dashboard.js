// Fill profile pill + welcome from session
const s = JSON.parse(localStorage.getItem('rdv_session') || 'null');
if (s) {
  const initials = (s.name || '?').trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  document.getElementById('pill-initials').textContent = initials;
  document.getElementById('pill-name').textContent     = s.name  || '—';
  document.getElementById('pill-handle').textContent   = s.email || '—';
  const firstName = (s.name || '').trim().split(' ')[0];
  document.getElementById('welcome-name').textContent  = firstName + ' !';
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
