/* ════════════════════════════════════════════════════════════
   FIREBASE CONFIG — paste your own project's values below.

   Where to get these: Firebase console → your project →
   ⚙ Project settings → scroll to "Your apps" → the web app
   you registered → "SDK setup and configuration".

   It's normal/safe for this to be public in your repo — it's
   just an address for your project, not a secret password.
   Real security comes from the Firestore rules you set up in
   the console, not from hiding this file.
   ════════════════════════════════════════════════════════════ */
const firebaseConfig = {
  apiKey: "AIzaSyDNTAbbFKiMVZyZsTv8SnikaNWassXnw08",
  authDomain: "cat-prep-tracker-11484.firebaseapp.com",
  projectId: "cat-prep-tracker-11484",
  storageBucket: "cat-prep-tracker-11484.firebasestorage.app",
  messagingSenderId: "275585901959",
  appId: "1:275585901959:web:3676eb81325a2cd5075f22",
  measurementId: "G-QDE352Q9PM"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
