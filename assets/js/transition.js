/* Exposed globally so auth.service.js can trigger the animation */
window.navigateTo = null;

(() => {
  const PAGE_NAMES = {
    'index.html':          'Dashboard Admin',
    'user-dashboard.html': 'Mon Espace',
    'appointments.html':   'Rendez-vous',
    'clients.html':        'Clients',
    'messages.html':       'Messages',
    'parametres.html':     'Paramètres',
    'login.html':          'Connexion',
  };

  const CHARS = '01';
  const DECODE_CHARS = '01ABCDEFabcdef#@!%&';

  /* ── Build splash DOM ── */
  function buildSplash() {
    const el = document.createElement('div');
    el.id = 'page-splash';
    el.innerHTML = `
      <canvas id="splash-canvas"></canvas>
      <div class="splash-center">
        <div class="splash-logo">RDV</div>
        <div class="splash-decode" id="splash-decode">RDV</div>
        <div class="splash-sub">Plateforme</div>
        <div class="splash-divider"></div>
        <div class="splash-page-name" id="splash-page-name"></div>
        <div class="splash-bar"><div class="splash-bar-fill" id="splash-bar-fill"></div></div>
      </div>`;
    document.body.appendChild(el);
    return el;
  }

  /* ── Matrix rain ── */
  function startMatrix(canvas) {
    const ctx = canvas.getContext('2d');
    let W, H, cols, drops;

    function resize() {
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight;
      cols  = Math.floor(W / 18);
      drops = Array(cols).fill(1);
    }
    resize();
    window.addEventListener('resize', resize);

    const interval = setInterval(() => {
      ctx.fillStyle = 'rgba(2,11,24,0.18)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#1a6fff';
      ctx.font = '13px Courier New';
      drops.forEach((y, i) => {
        ctx.fillText(CHARS[Math.random() > 0.5 ? 1 : 0], i * 18, y * 18);
        if (y * 18 > H && Math.random() > 0.97) drops[i] = 0;
        drops[i]++;
      });
    }, 50);

    return () => { clearInterval(interval); window.removeEventListener('resize', resize); };
  }

  /* ── Binary decode animation ── */
  function decodeText(el, target, duration, onDone) {
    const len = target.length;
    let frame = 0;
    const totalFrames = Math.round(duration / 40);
    const revealAt = i => Math.floor((i / len) * totalFrames * 0.7);

    const id = setInterval(() => {
      let out = '';
      for (let i = 0; i < len; i++) {
        if (frame >= revealAt(i) + 4) {
          out += target[i];
        } else if (frame >= revealAt(i)) {
          out += DECODE_CHARS[Math.floor(Math.random() * DECODE_CHARS.length)];
        } else {
          out += CHARS[Math.floor(Math.random() * 2)];
        }
      }
      el.textContent = out;
      frame++;
      if (frame > totalFrames) {
        clearInterval(id);
        el.textContent = target;
        if (onDone) onDone();
      }
    }, 40);
  }

  /* ── Show splash, run animation, then navigate ── */
  function navigate(href, pageName) {
    const splash   = buildSplash();
    const decodeEl = document.getElementById('splash-decode');
    const pageEl   = document.getElementById('splash-page-name');
    const barFill  = document.getElementById('splash-bar-fill');
    const canvas   = document.getElementById('splash-canvas');

    const stopMatrix = startMatrix(canvas);

    // Fade in
    requestAnimationFrame(() => {
      splash.classList.add('splash-visible');
    });

    // Step 1 — decode "RDV" (binary → real)
    setTimeout(() => {
      decodeText(decodeEl, 'RDV', 900, () => {
        // Step 2 — show destination page name with decode
        if (pageName) {
          pageEl.style.opacity = '0';
          decodeText(pageEl, '→  ' + pageName, 800, null);
          setTimeout(() => { pageEl.style.opacity = '1'; }, 80);
        }
        // Step 3 — progress bar
        barFill.style.transition = 'width 1.2s linear';
        barFill.style.width = '100%';
      });
    }, 250);

    // Navigate after animation
    setTimeout(() => {
      stopMatrix();
      window.location.href = href;
    }, 2400);
  }

  /* ── Expose globally for programmatic navigation ── */
  window.navigateTo = (href) => {
    const file = href.split('/').pop();
    navigate(href, PAGE_NAMES[file] || '');
  };

  /* ── Intercept nav clicks ── */
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href || href === '#' || href.startsWith('http') || href.startsWith('mailto')) return;
    if (a.getAttribute('onclick')) return;

    const file = href.split('/').pop();
    const pageName = PAGE_NAMES[file] || '';
    e.preventDefault();
    navigate(href, pageName);
  });

})();
