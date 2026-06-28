import { auth, db, isMockMode } from './firebase-config.js';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { ref, get, set } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { showToast, getFriendlyAuthErrorMessage } from './utils.js';

const googleProvider = new GoogleAuthProvider();

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const emailInput = document.getElementById('auth-email');
  const passwordInput = document.getElementById('auth-password');
  const btnGoogle = document.getElementById('btn-google');
  const btnSubmit = loginForm.querySelector('button[type="submit"]');

  // Handle redirect pathing post-auth
  function redirectUser() {
    const pendingFile = sessionStorage.getItem('pendingFileBase64');
    const mockParam = isMockMode ? '?mock=true' : '';
    if (pendingFile) {
      window.location.href = `new-analysis.html${mockParam}`;
    } else {
      window.location.href = `dashboard.html${mockParam}`;
    }
  }

  // Already logged in?
  auth.onAuthStateChanged((user) => {
    if (user) {
      redirectUser();
    }
  });

  // Handle email login
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value;
    const password = passwordInput.value;

    btnSubmit.setAttribute('disabled', 'true');
    btnSubmit.textContent = 'Signing In...';

    try {
      if (isMockMode) {
        showToast('Login successful (Mock Mode)!');
        setTimeout(redirectUser, 500);
        return;
      }

      await signInWithEmailAndPassword(auth, email, password);
      showToast('Login successful!');
      // auth state listener will handle redirect
    } catch (error) {
      showToast(getFriendlyAuthErrorMessage(error), 'error');
      btnSubmit.removeAttribute('disabled');
      btnSubmit.textContent = 'Sign In';
    }
  });

  // Handle Google OAuth
  btnGoogle.addEventListener('click', async () => {
    btnGoogle.setAttribute('disabled', 'true');
    btnGoogle.textContent = 'Signing In...';

    try {
      if (isMockMode) {
        showToast('Signed in with Google (Mock Mode)!');
        setTimeout(redirectUser, 500);
        return;
      }

      const userCredential = await signInWithPopup(auth, googleProvider);
      const user = userCredential.user;

      try {
        const userRef = ref(db, `users/${user.uid}`);
        const snapshot = await get(userRef);
        if (!snapshot.exists()) {
          await set(userRef, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || user.email.split('@')[0],
            createdAt: new Date().toISOString()
          });
        }
      } catch (dbError) {
        console.error("Database user profile creation failed:", dbError);
      }

      showToast('Signed in with Google!');
      // auth state listener will handle redirect
    } catch (error) {
      showToast(getFriendlyAuthErrorMessage(error), 'error');
      btnGoogle.removeAttribute('disabled');
      btnGoogle.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.24 10.285V13.4h6.887C18.2 15.614 15.645 18 12.24 18c-3.86 0-7-3.14-7-7s3.14-7 7-7c1.7 0 3.3 0.64 4.5 1.84l2.5-2.5C17.3 1.57 14.86 1 12.24 1 6.48 1 2 5.48 2 11.24s4.48 10.24 10.24 10.24c5.76 0 10.24-4.48 10.24-10.24 0-.64-.08-1.28-.24-1.96H12.24z"/>
        </svg>
        Continue with Google
      `;
    }
  });

  // Preserve mock param on signup link
  const signupLink = document.getElementById('link-signup-redirect');
  if (signupLink && isMockMode) {
    signupLink.href = 'signup.html?mock=true';
  }
});
