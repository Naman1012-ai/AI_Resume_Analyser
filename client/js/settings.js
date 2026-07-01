import { auth, db, isMockMode } from './firebase-config.js';
import { 
  updatePassword, 
  reauthenticateWithCredential, 
  EmailAuthProvider,
  GoogleAuthProvider,
  GithubAuthProvider,
  reauthenticateWithPopup,
  deleteUser,
  verifyBeforeUpdateEmail,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { ref, get, set, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { FirebaseService } from './api.js';
import { showToast, showPersistentNotice } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
  // Accordion Logic
  const accordionItems = document.querySelectorAll('.accordion-item');
  
  // Expand first section by default
  if (accordionItems.length > 0) {
    accordionItems[0].classList.add('active');
  }

  accordionItems.forEach(item => {
    const trigger = item.querySelector('.accordion-trigger');
    if (trigger) {
      trigger.addEventListener('click', () => {
        const isActive = item.classList.contains('active');
        
        // Collapse all sections
        accordionItems.forEach(i => i.classList.remove('active'));
        
        // Toggle clicked section
        if (!isActive) {
          item.classList.add('active');
        }
      });
    }
  });

  // Account Security Form
  const securityForm = document.getElementById('security-form');
  const currentPasswordInput = document.getElementById('current-password');
  const newPasswordInput = document.getElementById('new-password');
  const confirmPasswordInput = document.getElementById('confirm-password');
  const btnUpdatePassword = document.getElementById('btn-update-password');



  // Preferences
  const themeToggle = document.getElementById('theme-toggle');
  const prefWeeklyStats = document.getElementById('pref-weekly-stats');

  // Wipe Account — Modal Elements
  const deleteAccountBtn = document.getElementById('delete-account-btn');
  const deleteConfirmModal = document.getElementById('delete-confirm-modal');
  const deleteConfirmVerbatimInput = document.getElementById('delete-confirm-verbatim-input');
  const deleteErrorDisplay = document.getElementById('delete-error-display');
  const deleteErrorText = document.getElementById('delete-error-text');
  const deleteConfirmLabel = document.getElementById('delete-confirm-label');
  const btnDeleteCancel = document.getElementById('btn-delete-cancel');
  const btnDeleteConfirm = document.getElementById('btn-delete-confirm');

  // Local State
  let primaryProvider = 'password';
  let authenticatedEmail = '';

  // Load Settings Information
  async function loadSettings() {
    const user = auth.currentUser;
    if (!user && !isMockMode) return;

    let providers = [];
    let userEmail = 'demo@atspilot.co';

    if (isMockMode) {
      providers = [{ providerId: 'google.com', email: 'demo@atspilot.co' }];
      primaryProvider = 'google.com';
    } else if (user) {
      providers = user.providerData || [];
      userEmail = user.email || '';
      
      // Determine primary provider for re-authentication
      const hasPassword = providers.some(p => p.providerId === 'password');
      primaryProvider = hasPassword ? 'password' : (providers[0]?.providerId || 'password');
    }

    // Store email for exact comparison
    authenticatedEmail = userEmail;

    // Load Profile fields
    const profileNameInput = document.getElementById('profile-name');
    const profileRoleInput = document.getElementById('profile-role');
    const profilePhotoUrlInput = document.getElementById('profile-photo-url');
    const profilePhotoPreview = document.getElementById('profile-photo-preview');
    const profilePhotoFallback = document.getElementById('profile-photo-fallback');

    let displayName = isMockMode ? 'John Doe' : (user ? (user.displayName || '') : '');
    let roleTitle = 'Software Engineer';
    let avatarUrl = isMockMode ? '' : (user ? (user.photoURL || '') : '');

    // Attempt to load from cache first
    try {
      const cached = sessionStorage.getItem('profile_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.displayName) displayName = parsed.displayName;
        if (parsed.roleTitle) roleTitle = parsed.roleTitle;
        if (parsed.avatarUrl) avatarUrl = parsed.avatarUrl;
      }
    } catch (e) {
      console.warn('Failed to parse cache in settings:', e);
    }

    // Fetch fresh details from RTDB
    if (user && !isMockMode) {
      try {
        const profileSnap = await get(ref(db, `users/${user.uid}/profile`));
        if (profileSnap.exists()) {
          const val = profileSnap.val();
          if (val.displayName !== undefined) displayName = val.displayName;
          if (val.roleTitle !== undefined) roleTitle = val.roleTitle;
          if (val.avatarUrl !== undefined) avatarUrl = val.avatarUrl;
        }
      } catch (err) {
        console.warn('Failed to load profile details from RTDB:', err);
      }
    }

    if (profileNameInput) profileNameInput.value = displayName;
    if (profileRoleInput) profileRoleInput.value = roleTitle;
    if (profilePhotoUrlInput) profilePhotoUrlInput.value = avatarUrl;

    if (avatarUrl) {
      if (profilePhotoPreview) {
        profilePhotoPreview.src = avatarUrl;
        profilePhotoPreview.style.display = 'block';
      }
      if (profilePhotoFallback) profilePhotoFallback.style.display = 'none';
    } else {
      if (profilePhotoPreview) profilePhotoPreview.style.display = 'none';
      if (profilePhotoFallback) profilePhotoFallback.style.display = 'flex';
    }

    // Populate email display under Identity
    const settingsEmailDisplay = document.getElementById('settings-email-display');
    if (settingsEmailDisplay) {
      settingsEmailDisplay.textContent = userEmail;
    }

    // Verification Status Badge display
    const vBadge = document.getElementById('verification-badge');
    const vBtn = document.getElementById('btn-trigger-verification');
    
    if (vBadge) {
      if (isMockMode) {
        vBadge.textContent = 'Verified';
        vBadge.style.background = 'rgba(16, 185, 129, 0.1)';
        vBadge.style.color = 'var(--emerald)';
        vBadge.style.border = '1px solid rgba(16, 185, 129, 0.2)';
        if (vBtn) vBtn.style.display = 'none';
      } else if (user) {
        if (user.emailVerified) {
          vBadge.textContent = 'Verified';
          vBadge.style.background = 'rgba(16, 185, 129, 0.1)';
          vBadge.style.color = 'var(--emerald)';
          vBadge.style.border = '1px solid rgba(16, 185, 129, 0.2)';
          if (vBtn) vBtn.style.display = 'none';
        } else {
          vBadge.textContent = 'Unverified';
          vBadge.style.background = 'rgba(244, 63, 94, 0.1)';
          vBadge.style.color = 'var(--rose)';
          vBadge.style.border = '1px solid rgba(244, 63, 94, 0.2)';
          if (vBtn) vBtn.style.display = 'inline-block';
        }
      }
    }

    // Verify & synchronize profile email identity row on verification success
    if (user && !isMockMode) {
      const userRef = ref(db, `users/${user.uid}`);
      get(userRef).then(async (snap) => {
        if (snap.exists()) {
          const data = snap.val();
          if (data.email !== user.email) {
            // User email changed/verified! Update primary database profile identity row
            console.log(`Synchronizing database profile email identity row for ${user.uid} to verified email: ${user.email}`);
            await update(userRef, { email: user.email });
            
            // Also update users/${uid}/profile/email if it exists
            const profileRef = ref(db, `users/${user.uid}/profile`);
            const profileSnap = await get(profileRef);
            if (profileSnap.exists()) {
              await update(profileRef, { email: user.email });
            }
          }
        }
      }).catch(err => {
        console.error('Error synchronizing database profile email:', err);
      });
    }

    // Load theme setting
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (themeToggle) {
      themeToggle.checked = savedTheme === 'light';
    }

    // Load language preference
    const prefLanguageSelect = document.getElementById('pref-language');
    if (prefLanguageSelect) {
      prefLanguageSelect.value = localStorage.getItem('pref-language') || 'en';
    }

    // Load notification preferences
    if (prefWeeklyStats) {
      prefWeeklyStats.checked = localStorage.getItem('pref-weekly-stats') === 'true';
    }
  }

  // Profile Save Event Handlers
  const btnSaveProfile = document.getElementById('btn-save-profile');
  const profileNameInput = document.getElementById('profile-name');
  const profileRoleInput = document.getElementById('profile-role');
  const profilePhotoUrlInput = document.getElementById('profile-photo-url');
  const profilePhotoPreview = document.getElementById('profile-photo-preview');
  const profilePhotoFallback = document.getElementById('profile-photo-fallback');

  if (btnSaveProfile) {
    btnSaveProfile.addEventListener('click', async () => {
      const displayName = profileNameInput ? profileNameInput.value.trim() : '';
      const roleTitle = profileRoleInput ? profileRoleInput.value.trim() : '';
      const photoURL = profilePhotoUrlInput ? profilePhotoUrlInput.value.trim() : '';

      if (!displayName) {
        showToast('Display Name cannot be empty.', 'error');
        return;
      }

      btnSaveProfile.disabled = true;
      btnSaveProfile.textContent = 'Saving...';

      try {
        if (isMockMode) {
          showToast('Profile updated successfully (Mock Mode)!', 'success');
          // Update live preview
          if (photoURL) {
            if (profilePhotoPreview) {
              profilePhotoPreview.src = photoURL;
              profilePhotoPreview.style.display = 'block';
            }
            if (profilePhotoFallback) profilePhotoFallback.style.display = 'none';
          } else {
            if (profilePhotoPreview) profilePhotoPreview.style.display = 'none';
            if (profilePhotoFallback) profilePhotoFallback.style.display = 'flex';
          }

          // Trigger state sync reactively
          const cacheObj = { displayName, roleTitle, avatarUrl: photoURL };
          sessionStorage.setItem('profile_cache', JSON.stringify(cacheObj));
          localStorage.setItem('profile_cache', JSON.stringify(cacheObj));
          window.dispatchEvent(new CustomEvent('profile-updated', { detail: cacheObj }));
          return;
        }

        const user = auth.currentUser;
        if (!user) throw new Error('Authorization required.');

        // Call updateProfile
        await updateProfile(user, { displayName, photoURL });
        
        // Also update Realtime Database profile details
        const profileRef = ref(db, `users/${user.uid}/profile`);
        await update(profileRef, { displayName, roleTitle, avatarUrl: photoURL });

        // Update other denormalized fields
        await Promise.all([
          set(ref(db, `users/${user.uid}/displayName`), displayName),
          set(ref(db, `users/${user.uid}/roleTitle`), roleTitle),
          set(ref(db, `users/${user.uid}/domain`), roleTitle),
          set(ref(db, `users/${user.uid}/domainName`), roleTitle),
          set(ref(db, `users/${user.uid}/photoURL`), photoURL),
          set(ref(db, `users/${user.uid}/avatarUrl`), photoURL)
        ]);

        showToast('Profile updated successfully!', 'success');

        // Update live preview
        if (photoURL) {
          if (profilePhotoPreview) {
            profilePhotoPreview.src = photoURL;
            profilePhotoPreview.style.display = 'block';
          }
          if (profilePhotoFallback) profilePhotoFallback.style.display = 'none';
        } else {
          if (profilePhotoPreview) profilePhotoPreview.style.display = 'none';
          if (profilePhotoFallback) profilePhotoFallback.style.display = 'flex';
        }

        // Trigger state sync reactively across sessions/tabs/pages
        const cacheObj = { displayName, roleTitle, avatarUrl: photoURL };
        sessionStorage.setItem('profile_cache', JSON.stringify(cacheObj));
        localStorage.setItem('profile_cache', JSON.stringify(cacheObj)); // Triggers 'storage' event
        window.dispatchEvent(new CustomEvent('profile-updated', { detail: cacheObj }));

      } catch (err) {
        console.error('Profile update failure:', err);
        showToast(err.message || 'Failed to update profile.', 'error');
      } finally {
        btnSaveProfile.disabled = false;
        btnSaveProfile.textContent = 'Save Profile';
      }
    });
  }

  // Dynamic preview update as URL is typed
  if (profilePhotoUrlInput) {
    profilePhotoUrlInput.addEventListener('input', () => {
      const url = profilePhotoUrlInput.value.trim();
      if (url) {
        if (profilePhotoPreview) {
          profilePhotoPreview.src = url;
          profilePhotoPreview.style.display = 'block';
        }
        if (profilePhotoFallback) profilePhotoFallback.style.display = 'none';
      } else {
        if (profilePhotoPreview) profilePhotoPreview.style.display = 'none';
        if (profilePhotoFallback) profilePhotoFallback.style.display = 'flex';
      }
    });
  }

  // Color Theme Switcher
  if (themeToggle) {
    themeToggle.addEventListener('change', (e) => {
      const isLight = e.target.checked;
      if (isLight) {
        document.documentElement.classList.add('light-theme');
        localStorage.setItem('theme', 'light');
      } else {
        document.documentElement.classList.remove('light-theme');
        localStorage.setItem('theme', 'dark');
      }
      showToast(`App theme set to ${isLight ? 'Light' : 'Dark'} Mode.`);
    });
  }

  // Notification Preferences
  if (prefWeeklyStats) {
    prefWeeklyStats.addEventListener('change', (e) => {
      localStorage.setItem('pref-weekly-stats', e.target.checked);
      showToast('Weekly statistics preference saved.');
    });
  }

  // =========================================================
  //  WIPE PLATFORM IDENTITY PROFILE DATA MODAL
  // =========================================================

  /** Reset the modal to its initial state */
  function resetDeleteModal() {
    if (deleteConfirmVerbatimInput) {
      deleteConfirmVerbatimInput.value = '';
      deleteConfirmVerbatimInput.style.borderColor = 'var(--border-color, #334155)';
    }

    if (btnDeleteConfirm) {
      btnDeleteConfirm.setAttribute('disabled', 'true');
      btnDeleteConfirm.style.opacity = '0.4';
      btnDeleteConfirm.style.cursor = 'not-allowed';
      if (deleteConfirmLabel) deleteConfirmLabel.textContent = 'Permanently Wipe';
    }

    if (deleteErrorDisplay) deleteErrorDisplay.style.display = 'none';
  }

  /** Show inline error inside the modal */
  function showDeleteError(msg) {
    if (deleteErrorDisplay && deleteErrorText) {
      deleteErrorText.textContent = msg;
      deleteErrorDisplay.style.display = 'block';
    }
  }

  function openDeleteConfirmationModal() {
    if (!deleteConfirmModal) return;
    resetDeleteModal();
    deleteConfirmModal.style.display = 'flex';
  }

  // --- Trigger: Open Modal ---
  const delAccBtn = document.getElementById('delete-account-btn');
  if (delAccBtn) {
    delAccBtn.addEventListener('click', function(e) {
      e.preventDefault();
      openDeleteConfirmationModal();
    });
  }

  // --- Cancel: Close Modal ---
  if (btnDeleteCancel) {
    btnDeleteCancel.addEventListener('click', () => {
      if (deleteConfirmModal) deleteConfirmModal.style.display = 'none';
    });
  }

  // --- Verbatim Input Verification ---
  if (deleteConfirmVerbatimInput) {
    deleteConfirmVerbatimInput.addEventListener('input', () => {
      const entered = deleteConfirmVerbatimInput.value.trim();
      if (entered === 'DELETE') {
        if (btnDeleteConfirm) {
          btnDeleteConfirm.removeAttribute('disabled');
          btnDeleteConfirm.style.opacity = '1';
          btnDeleteConfirm.style.cursor = 'pointer';
        }
        deleteConfirmVerbatimInput.style.borderColor = 'var(--emerald, #10b981)';
      } else {
        if (btnDeleteConfirm) {
          btnDeleteConfirm.setAttribute('disabled', 'true');
          btnDeleteConfirm.style.opacity = '0.4';
          btnDeleteConfirm.style.cursor = 'not-allowed';
        }
        deleteConfirmVerbatimInput.style.borderColor = entered ? 'var(--rose, #f43f5e)' : 'var(--border-color, #334155)';
      }
    });
  }

  // --- Final Confirm: Purge + Delete ---
  if (btnDeleteConfirm) {
    btnDeleteConfirm.addEventListener('click', async () => {
      if (deleteConfirmVerbatimInput.value.trim() !== 'DELETE') return;

      btnDeleteConfirm.setAttribute('disabled', 'true');
      btnDeleteConfirm.style.cursor = 'not-allowed';
      if (deleteConfirmLabel) {
        deleteConfirmLabel.innerHTML = `<span class="spinner-border" style="display:inline-block; width:12px; height:12px; border:2px solid #fff; border-radius:50%; border-top-color:transparent; animation:spin 1s linear infinite; margin-right:6px; vertical-align:middle;"></span> Wiping...`;
      }
      if (deleteErrorDisplay) deleteErrorDisplay.style.display = 'none';

      try {
        // === Mock Mode Shortcut ===
        if (isMockMode) {
          showToast('Your account has been deleted permanently', 'success');
          sessionStorage.clear();
          localStorage.clear();
          window.location.href = 'index.html?mock=true';
          return;
        }

        const user = auth.currentUser;
        if (!user) throw new Error('No authenticated session found. Please log in again.');

        // ---- STAGE 1: Database Purge ----
        await FirebaseService.purgeUserData();

        // ---- STAGE 2: Auth Account Destruction ----
        await deleteUser(user);

        // ---- STAGE 3: Session Tear-Down & Eviction ----
        showToast('Your account has been deleted permanently', 'success');
        sessionStorage.clear();
        localStorage.clear();
        window.location.href = 'index.html';

      } catch (err) {
        console.error('Account deletion failure:', err);
        let userMsg = err.message || 'Deletion failed. Please try again.';
        if (err.code === 'auth/requires-recent-login') {
          userMsg = 'Security requirement: Please sign out and sign back in to delete your account.';
        }
        showDeleteError(userMsg);
        btnDeleteConfirm.removeAttribute('disabled');
        btnDeleteConfirm.style.cursor = 'pointer';
        if (deleteConfirmLabel) deleteConfirmLabel.textContent = 'Permanently Wipe';
      }
    });
  }

  // --- Section 3: Identity & Email Lifecycle Controllers ---
  
  // Resend Email Verification from Settings
  const btnTriggerVerification = document.getElementById('btn-trigger-verification');
  if (btnTriggerVerification) {
    btnTriggerVerification.addEventListener('click', async () => {
      if (isMockMode) {
        showPersistentNotice("Verification email sent! Please check your inbox to activate your account. ⚠️ If you don't see it within a few minutes, please check your Spam or Promotions folder.");
        return;
      }
      const user = auth.currentUser;
      if (!user) {
        showToast('Authentication required.', 'error');
        return;
      }
      btnTriggerVerification.disabled = true;
      btnTriggerVerification.textContent = 'Sending...';
      try {
        await sendEmailVerification(user);
        showPersistentNotice("Verification email sent! Please check your inbox to activate your account. ⚠️ If you don't see it within a few minutes, please check your Spam or Promotions folder.");
      } catch (err) {
        showToast(err.message || 'Failed to send verification link.', 'error');
      } finally {
        btnTriggerVerification.disabled = false;
        btnTriggerVerification.textContent = 'Send Link';
      }
    });
  }

  // Request Password Reset from Settings
  const btnRequestResetEmail = document.getElementById('btn-request-reset-email');
  if (btnRequestResetEmail) {
    btnRequestResetEmail.addEventListener('click', async () => {
      const user = auth.currentUser;
      const email = user ? user.email : 'demo@atspilot.co';
      
      btnRequestResetEmail.disabled = true;
      btnRequestResetEmail.textContent = 'Sending...';
      
      try {
        if (isMockMode) {
          showPersistentNotice("Password reset link dispatched successfully! ⚠️ Crucial: Check your Spam or Junk folder if the recovery link does not arrive in your primary inbox shortly.");
          return;
        }
        await sendPasswordResetEmail(auth, email);
        showPersistentNotice("Password reset link dispatched successfully! ⚠️ Crucial: Check your Spam or Junk folder if the recovery link does not arrive in your primary inbox shortly.");
      } catch (err) {
        showToast(err.message || 'Failed to send reset link.', 'error');
      } finally {
        btnRequestResetEmail.disabled = false;
        btnRequestResetEmail.textContent = 'Send Reset Link';
      }
    });
  }

  // Initiate Email Address Change Form
  const emailChangeForm = document.getElementById('email-change-form');
  const newEmailInput = document.getElementById('new-email-address');
  const btnChangeEmail = document.getElementById('btn-change-email');

  if (emailChangeForm) {
    emailChangeForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const newEmail = newEmailInput.value.trim();
      const user = auth.currentUser;

      if (!user && !isMockMode) {
        showToast('Authentication required.', 'error');
        return;
      }

      btnChangeEmail.disabled = true;
      btnChangeEmail.textContent = 'Initiating...';

      try {
        if (isMockMode) {
          showPersistentNotice("Verification link sent! Check your new inbox to complete the update. ⚠️ Crucial: Check your Spam or Promotions folder if the verification message does not arrive shortly.");
          emailChangeForm.reset();
          return;
        }

        // Trigger verifyBeforeUpdateEmail
        await verifyBeforeUpdateEmail(user, newEmail);
        showPersistentNotice("Verification link sent! Check your new inbox to complete the update. ⚠️ Crucial: Check your Spam or Promotions folder if the verification message does not arrive shortly.");
        emailChangeForm.reset();
      } catch (err) {
        showToast(err.message || 'Failed to initiate email change. Re-authentication might be required.', 'error');
      } finally {
        btnChangeEmail.disabled = false;
        btnChangeEmail.textContent = 'Initiate Change';
      }
    });
  }

  // Resume Language preference switcher
  const prefLanguageSelect = document.getElementById('pref-language');
  if (prefLanguageSelect) {
    prefLanguageSelect.addEventListener('change', (e) => {
      const lang = e.target.value;
      localStorage.setItem('pref-language', lang);
      
      // Save to Firebase database too
      const user = auth.currentUser;
      if (user && !isMockMode) {
        const prefRef = ref(db, `users/${user.uid}/preferences`);
        update(prefRef, { language: lang }).catch(err => console.error('Failed to sync language preference:', err));
      }
      showToast(`Default resume language set to: ${prefLanguageSelect.options[prefLanguageSelect.selectedIndex].text}`);
    });
  }

  // Export Profile Data
  const btnExportData = document.getElementById('btn-export-data');
  if (btnExportData) {
    btnExportData.addEventListener('click', async () => {
      btnExportData.disabled = true;
      const originalText = btnExportData.innerHTML;
      btnExportData.textContent = 'Exporting...';

      try {
        let exportData = {};

        if (isMockMode) {
          exportData = {
            userId: 'anonymous_mock_user',
            profile: {
              displayName: 'John Doe',
              email: 'demo@atspilot.co'
            },
            analyses: {
              'mock_analysis_1': {
                score: 72,
                targetRole: 'Backend Developer',
                createdAt: new Date().toISOString()
              }
            }
          };
        } else {
          const user = auth.currentUser;
          if (!user) throw new Error('Authorization required.');

          const userRef = ref(db, `users/${user.uid}`);
          const snap = await get(userRef);
          if (snap.exists()) {
            exportData = snap.val();
          } else {
            exportData = {
              userId: user.uid,
              profile: {
                displayName: user.displayName || '',
                email: user.email || ''
              },
              info: 'No analysis history found.'
            };
          }
        }

        // Trigger JSON file download
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `resumetrices_data_export_${Date.now()}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();

        showToast('Profile data exported successfully!', 'success');
      } catch (err) {
        console.error('Data export failure:', err);
        showToast(err.message || 'Failed to export profile data.', 'error');
      } finally {
        btnExportData.disabled = false;
        btnExportData.innerHTML = originalText;
      }
    });
  }

  // Initialize
  auth.onAuthStateChanged((user) => {
    if (user || isMockMode) {
      loadSettings();
    }
  });
});
