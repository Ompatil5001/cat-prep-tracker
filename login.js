/* ════════════════════════════════════════════════════════════
   LOGIN.JS — used by login.html only.

   - Tries signInWithPopup() first.
   - Falls back to signInWithRedirect() if the popup genuinely can't
     run (blocked, unsupported in-app browser, etc).
   - On load, checks both getRedirectResult() (in case we just came
     back from a redirect) and onAuthStateChanged() (in case a
     session already exists) — either one sends you straight to
     index.html without showing the login card.
   ════════════════════════════════════════════════════════════ */

const googleProvider = new firebase.auth.GoogleAuthProvider();

// Error codes where retrying with a redirect makes sense. Popups can fail
// for reasons that have nothing to do with the user actively rejecting
// sign-in — ad blockers, popup blockers, and many in-app/webview browsers
// (which often misreport a blocked popup as "closed-by-user") all land here.
const REDIRECT_FALLBACK_CODES = new Set([
  "auth/popup-blocked",
  "auth/popup-closed-by-user",
  "auth/cancelled-popup-request",
  "auth/operation-not-supported-in-this-environment",
  "auth/web-storage-unsupported",
  "auth/network-request-failed",
]);

function setLoginStatus(msg, isError) {
  const el = document.getElementById("login-status");
  if (!el) return;
  el.textContent = msg || "";
  el.classList.toggle("error", !!isError);
}

function setButtonLoading(isLoading) {
  const btn = document.getElementById("google-btn");
  if (!btn) return;
  btn.disabled = isLoading;
  btn.classList.toggle("loading", isLoading);
}

function goToApp() {
  window.location.replace("index.html");
}

async function signInWithGoogle() {
  setButtonLoading(true);
  setLoginStatus("Opening Google sign-in…", false);
  try {
    await auth.signInWithPopup(googleProvider);
    // Success: the onAuthStateChanged listener below fires and redirects.
  } catch (err) {
    console.error("Popup sign-in failed:", err && err.code, err);
    if (err && REDIRECT_FALLBACK_CODES.has(err.code)) {
      setLoginStatus("Popup didn't open — redirecting instead…", false);
      try {
        await auth.signInWithRedirect(googleProvider);
        // Page navigates away here; nothing else to do.
      } catch (redirectErr) {
        console.error("Redirect sign-in failed:", redirectErr);
        setLoginStatus("Sign-in failed. Please try again.", true);
        setButtonLoading(false);
      }
    } else {
      setLoginStatus("Sign-in failed. Please try again.", true);
      setButtonLoading(false);
    }
  }
}

(function init() {
  if (typeof auth === "undefined") {
    document.getElementById("login-loading").style.display = "none";
    setLoginStatus("Firebase isn't configured — check firebase-config.js.", true);
    return;
  }

  // If we just landed back here after a redirect sign-in, this resolves
  // the pending result. Errors are surfaced; success is handled by the
  // onAuthStateChanged listener below either way.
  auth.getRedirectResult().catch((err) => {
    console.error("Redirect result error:", err);
    setLoginStatus("Sign-in failed. Please try again.", true);
  });

  auth.onAuthStateChanged((user) => {
    document.getElementById("login-loading").style.display = "none";
    if (user) {
      goToApp();
    } else {
      document.getElementById("login-card").style.display = "flex";
    }
  });
})();
