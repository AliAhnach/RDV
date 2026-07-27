/**
 * i18n.js — Système multilingue RDV
 * Langues : fr | en | ar
 * Persistance : localStorage (clé rdv_lang)
 */

const I18N_KEY  = 'rdv_lang';
const SUPPORTED = ['fr', 'en', 'ar'];
const LANG_META = {
  fr: { flag: '🇫🇷', label: 'Français' },
  en: { flag: '🇬🇧', label: 'English'  },
  ar: { flag: '🇲🇦', label: 'العربية'  },
};

// Cache des dictionnaires déjà chargés
const _cache = {};

// ── Résolution du chemin vers les fichiers JSON ──────────────────────────────
function _langPath(code) {
  // Fonctionne depuis pages/ (../assets/js/lang/) ou depuis la racine (assets/js/lang/)
  const isPages = window.location.pathname.includes('/pages/');
  const base = isPages ? '../assets/js/lang/' : 'assets/js/lang/';
  return `${base}${code}.json`;
}

// ── Chargement asynchrone d'un dictionnaire ──────────────────────────────────
async function _loadDict(code) {
  if (_cache[code]) return _cache[code];
  try {
    const res  = await fetch(_langPath(code));
    const dict = await res.json();
    _cache[code] = dict;
    return dict;
  } catch {
    return {};
  }
}

// ── Getters / setters ────────────────────────────────────────────────────────
function getLang() {
  const saved = localStorage.getItem(I18N_KEY) || localStorage.getItem('lang') || 'fr';
  return SUPPORTED.includes(saved) ? saved : 'fr';
}

function setLang(code) {
  if (!SUPPORTED.includes(code)) return;
  localStorage.setItem(I18N_KEY, code);
  localStorage.setItem('lang', code);
  applyLang(code);
}

// ── Application de la langue ─────────────────────────────────────────────────
async function applyLang(code) {
  const isRTL  = code === 'ar';

  // Mise à jour immédiate du bouton (avant le chargement du dictionnaire)
  _updateSwitcherUI(code);

  // Direction + langue HTML
  document.documentElement.lang = code;
  document.documentElement.dir  = isRTL ? 'rtl' : 'ltr';

  // Police arabe
  if (isRTL) {
    if (!document.getElementById('arabic-font')) {
      const link = document.createElement('link');
      link.id   = 'arabic-font';
      link.rel  = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap';
      document.head.appendChild(link);
    }
    document.body.style.fontFamily = "'Cairo', 'Inter', sans-serif";
  } else {
    document.body.style.fontFamily = '';
  }

  // Charger et appliquer les traductions
  const dict   = await _loadDict(code);

  // Textes data-i18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (dict[key] !== undefined) el.textContent = dict[key];
  });

  // Placeholders data-i18n-placeholder
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.dataset.i18nPlaceholder;
    if (dict[key] !== undefined) el.placeholder = dict[key];
  });

  // RTL : ajustement sidebar
  const main   = document.querySelector('.main');
  const footer = document.querySelector('.dash-footer');
  if (main) {
    main.style.marginLeft  = isRTL ? '0'     : '';
    main.style.marginRight = isRTL ? '220px' : '';
  }
  if (footer) {
    footer.style.marginLeft  = isRTL ? '0'     : '';
    footer.style.marginRight = isRTL ? '220px' : '';
  }
}

// ── UI du sélecteur ──────────────────────────────────────────────────────────
function _updateSwitcherUI(code) {
  const meta = LANG_META[code];
  const btn  = document.getElementById('lang-switcher-btn');
  if (!btn) return;

  const flagEl = btn.querySelector('.ls-flag');
  const labelEl = btn.querySelector('.ls-label');

  if (flagEl) flagEl.textContent = meta.flag;
  if (labelEl) labelEl.textContent = meta.label;

  document.querySelectorAll('.ls-option').forEach(opt => {
    opt.classList.toggle('ls-option--active', opt.dataset.lang === code);
  });
}

// ── Injection du sélecteur dans un conteneur ─────────────────────────────────
function injectLangSwitcher(container) {
  if (!container || document.getElementById('lang-switcher')) return;

  const current = getLang();
  const meta    = LANG_META[current];

  const wrapper = document.createElement('div');
  wrapper.id        = 'lang-switcher';
  wrapper.className = 'lang-switcher';
  wrapper.innerHTML = `
    <button id="lang-switcher-btn" class="ls-btn" type="button" aria-haspopup="listbox" aria-expanded="false">
      <span class="ls-flag">${meta.flag}</span>
      <span class="ls-label">${meta.label}</span>
      <svg class="ls-arrow" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
    <ul class="ls-dropdown" role="listbox" aria-label="Choisir la langue">
      ${SUPPORTED.map(code => `
        <li class="ls-option${code === current ? ' ls-option--active' : ''}"
            role="option" data-lang="${code}" tabindex="0"
            aria-selected="${code === current}">
          <span class="ls-opt-flag">${LANG_META[code].flag}</span>
          <span class="ls-opt-label">${LANG_META[code].label}</span>
        </li>`).join('')}
    </ul>`;

  container.appendChild(wrapper);

  const btn      = wrapper.querySelector('#lang-switcher-btn');
  const dropdown = wrapper.querySelector('.ls-dropdown');

  btn.addEventListener('click', e => {
    e.stopPropagation();
    const open = wrapper.classList.toggle('ls-open');
    btn.setAttribute('aria-expanded', open);
  });

  wrapper.querySelectorAll('.ls-option').forEach(opt => {
    const select = () => {
      setLang(opt.dataset.lang);
      wrapper.classList.remove('ls-open');
      btn.setAttribute('aria-expanded', 'false');
    };
    opt.addEventListener('click', select);
    opt.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') select(); });
  });

  document.addEventListener('click', (e) => {
    if (!wrapper.contains(e.target)) {
      wrapper.classList.remove('ls-open');
      btn.setAttribute('aria-expanded', 'false');
    }
  });
}

// ── Transitions de page (splash) ─────────────────────────────────────────────
(function () {
  function createSplash() {
    const el = document.createElement('div');
    el.id = 'page-splash';
    el.innerHTML = `
      <div class="splash-inner">
        <div class="splash-logo">
          <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="sg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%"   stop-color="#4a9eff"/>
                <stop offset="50%"  stop-color="#1f5fbf"/>
                <stop offset="100%" stop-color="#0d3d7d"/>
              </linearGradient>
            </defs>
            <rect width="64" height="64" rx="14" fill="url(#sg)"/>
            <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle"
                  font-family="Arial,sans-serif" font-weight="900" font-size="22"
                  letter-spacing="1" fill="white">RDV</text>
          </svg>
        </div>
        <div class="splash-name">RDV</div>
        <div class="splash-sub">Plateforme</div>
        <div class="splash-bar"><div class="splash-bar-fill"></div></div>
      </div>`;
    document.body.appendChild(el);
    return el;
  }

  function showSplash(href) {
    const splash = createSplash();
    requestAnimationFrame(() => {
      splash.classList.add('splash-in');
      setTimeout(() => { window.location.href = href; }, 820);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add('page-enter');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  });

  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href]');
    if (!link) return;
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('http') || link.target === '_blank') return;
    e.preventDefault();
    showSplash(href);
  });
})();

// ── Init au chargement ────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => applyLang(getLang()));
