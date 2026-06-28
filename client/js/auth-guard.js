import { auth, isMockMode } from './firebase-config.js';

export function initAuthGuard() {
  auth.onAuthStateChanged((user) => {
    if (isMockMode) {
      return;
    }
    if (!user) {
      const mockParam = isMockMode ? '?mock=true' : '';
      window.location.href = `index.html${mockParam}`;
    }
  });
}

initAuthGuard();

// Apply color theme globally on page load
const savedTheme = localStorage.getItem('theme') || 'dark';
if (savedTheme === 'light') {
  document.documentElement.classList.add('light-theme');
} else {
  document.documentElement.classList.remove('light-theme');
}
