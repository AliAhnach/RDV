# RDV — Mini Plateforme de Gestion

Plateforme web de gestion de rendez-vous, clients et messages.

## Pages

| Page | Description |
|------|-------------|
| `pages/login.html` | Connexion / Inscription |
| `pages/index.html` | Dashboard principal |
| `pages/appointments.html` | Gestion des rendez-vous |
| `pages/clients.html` | Liste des clients |
| `pages/messages.html` | Messagerie |
| `pages/parametres.html` | Paramètres du compte |

## Structure

```
RDV/
├── assets/
│   ├── css/
│   │   ├── global.css        # Styles partagés
│   │   ├── auth.css          # Page de connexion
│   │   ├── dashboard.css     # Dashboard
│   │   └── parametres.css    # Paramètres
│   ├── js/
│   │   ├── auth.service.js   # Auth localStorage
│   │   ├── auth.ui.js        # UI page de connexion
│   │   ├── main.js           # Logique principale
│   │   └── dashboard.init.js # Initialisation dashboard
│   └── images/
│       └── favicon.svg
├── pages/
├── index.html                # Redirect → login
└── netlify.toml
```

## Déploiement

### Netlify (recommandé)
1. Connecter le repo GitHub sur [netlify.com](https://netlify.com)
2. Build command : *(vide)*
3. Publish directory : `.`
4. Le fichier `netlify.toml` configure automatiquement les redirects

### GitHub Pages
Activer dans **Settings → Pages → Branch: main → / (root)**

## Auth

Authentification locale via `localStorage` (mode démo) :
- Compte stocké dans `rdv_user`
- Session dans `rdv_session` (expire 7 jours)
- Mode invité disponible (expire 2 heures)
