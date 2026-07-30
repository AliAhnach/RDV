// Configuration centralisée de l'URL de l'API.
// Chargé avant auth.service.js dans toutes les pages.
(function () {
  if (typeof window === 'undefined') return;

  if (window.RDV_API_BASE) return;

  const localApi = 'http://localhost:5000/api';
  const prodApi = 'https://AliAhnach.pythonanywhere.com/api';
  const hostname = (window.location && window.location.hostname || '').toLowerCase();

  window.RDV_API_BASE = (
    hostname === 'localhost' || hostname === '127.0.0.1'
  ) ? localApi : prodApi;
})();
