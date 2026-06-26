/* ════════════════════════════════════════════════════════════
   AUTH.JS — used by index.html only.

   The actual "Continue with Google" button lives on login.html
   (see login.js). This file's job is just:
     1) Confirm a user is signed in before the app becomes visible
        — if not, bounce to login.html.
     2) Paint that user's Google name + photo into the sidebar.
     3) Provide signOutUser() for the sidebar's Sign Out button.

   It runs before script.js (which still owns all the app logic,
   localStorage, and Firestore read/write via _cloudPush /
   _cloudPullIfNeeded — those are unchanged).
   ════════════════════════════════════════════════════════════ */

(function () {
  if (typeof auth === "undefined") {
    console.warn("Firebase auth not available — check that firebase-config.js loaded.");
    return;
  }

  auth.onAuthStateChanged(function (user) {
    if (!user) {
      // No session — send back to the login page.
      window.location.replace("login.html");
      return;
    }

    // Signed in: reveal the app shell (it starts hidden via the
    // .app-hidden class in index.html, removed only once we get here).
    var root = document.getElementById("app-root");
    if (root) root.classList.remove("app-hidden");

    // Paint profile info into the sidebar.
    var nameEl = document.getElementById("user-name");
    var avatarEl = document.getElementById("user-avatar");
    if (nameEl) nameEl.textContent = user.displayName || user.email || "Signed in";
    if (avatarEl) {
      avatarEl.src = user.photoURL || "";
      avatarEl.alt = (user.displayName || "Profile") + "'s photo";
    }
  });
})();

/* Called by the Sign Out button in index.html's sidebar. */
function signOutUser() {
  if (typeof auth === "undefined") return;
  auth
    .signOut()
    .then(function () {
      window.location.href = "login.html";
    })
    .catch(function (e) {
      console.error("Sign out failed", e);
      alert("Couldn't sign out — please try again.");
    });
}
