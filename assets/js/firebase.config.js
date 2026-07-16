/* =============================================================
   RDV — Firebase Configuration
   1. Aller sur https://console.firebase.google.com
   2. Créer un projet → Ajouter une app Web
   3. Copier les valeurs ci-dessous depuis "Paramètres du projet"
   4. Activer les providers dans Authentication → Sign-in method :
      - Google
      - Facebook (nécessite un App ID Facebook)
      - GitHub
   ============================================================= */

const firebaseConfig = {
  apiKey:            "VOTRE_API_KEY",
  authDomain:        "VOTRE_PROJECT.firebaseapp.com",
  projectId:         "VOTRE_PROJECT_ID",
  storageBucket:     "VOTRE_PROJECT.appspot.com",
  messagingSenderId: "VOTRE_SENDER_ID",
  appId:             "VOTRE_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
