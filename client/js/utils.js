// escapeHTML helper
export function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

// formatTimeAgo helper
export function formatTimeAgo(dateStr) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - then) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// getStatusBadge helper
export function getStatusBadge(score) {
  if (score >= 85) return '<span style="display:inline-block;padding:0.2rem 0.6rem;border-radius:9999px;font-size:0.75rem;font-weight:700;background:rgba(16,185,129,0.12);color:var(--emerald);">Optimized</span>';
  if (score >= 60) return '<span style="display:inline-block;padding:0.2rem 0.6rem;border-radius:9999px;font-size:0.75rem;font-weight:700;background:rgba(59,130,246,0.12);color:var(--blue);">Good</span>';
  return '<span style="display:inline-block;padding:0.2rem 0.6rem;border-radius:9999px;font-size:0.75rem;font-weight:700;background:rgba(244,63,94,0.12);color:var(--rose);">Needs Review</span>';
}

// mapFriendlyErrorMessage helper to sanitize raw backend Exceptions, stack traces, and HTTP codes into empathetic action-oriented statements
export function mapFriendlyErrorMessage(error) {
  if (!error) return "We couldn't complete your request due to a temporary issue. Please try again.";
  const msg = (error.message || String(error)).toLowerCase();
  
  if (msg.includes('network') || msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('fetch')) {
    return "We couldn't connect to our servers right now. Please check your internet connection and try again.";
  }
  if (msg.includes('rate limit') || msg.includes('too many requests') || msg.includes('429')) {
    return "You're sending requests faster than our system can process them. Please wait a moment before trying again.";
  }
  if (msg.includes('timeout') || msg.includes('abort') || msg.includes('timed out')) {
    return "The server request took too long to respond. Please check your network stability and try again in a few moments.";
  }
  if (msg.includes('unauthorized') || msg.includes('forbidden') || msg.includes('401') || msg.includes('403') || msg.includes('auth')) {
    return "Your authorization credentials could not be verified. Please try signing out and signing in again.";
  }
  if (msg.includes('not found') || msg.includes('404') || msg.includes('endpoint')) {
    return "We couldn't find the requested page or analysis record. Please check the address or return to your dashboard.";
  }
  if (msg.includes('invalid_document_type') || msg.includes('not a resume') || msg.includes('document type') || msg.includes('format') || msg.includes('pdf')) {
    return "The uploaded file doesn't seem to be a valid PDF resume. Please make sure the file is in PDF format and try again.";
  }
  if (msg.includes('too large') || msg.includes('limit') || msg.includes('5mb') || msg.includes('oversized')) {
    return "The uploaded resume file exceeds our 5MB size limit. Please compress your PDF file and try uploading it again.";
  }
  if (msg.includes('openrouter') || msg.includes('ai_analysis_failed') || msg.includes('analysis could not be generated') || msg.includes('completions') || msg.includes('ai engine')) {
    return "Our resume scanning engine is currently processing a high volume of requests. Please wait a few moments and try your scan again.";
  }
  if (msg.includes('database') || msg.includes('firebase') || msg.includes('save') || msg.includes('store')) {
    return "We couldn't save your analysis results to our database. Please check your connection and try saving again.";
  }

  return "We couldn't process your request right now because our server is experiencing heavy traffic. Please try again in a few moments, or check your internet connection.";
}

// showToast helper
let toastTimeout = null;
export function showToast(message, type = 'success') {
  let displayMessage = message;
  if (type === 'error') {
    if (message instanceof Error) {
      displayMessage = mapFriendlyErrorMessage(message);
    } else {
      displayMessage = mapFriendlyErrorMessage({ message: String(message) });
    }
  }

  const toastNotification = document.getElementById('toast-notification');
  const toastMessage = document.getElementById('toast-message');

  if (toastTimeout) {
    clearTimeout(toastTimeout);
  }

  if (toastMessage) {
    toastMessage.textContent = displayMessage;
    toastMessage.style.whiteSpace = 'pre-line';
  }

  if (toastNotification) {
    if (type === 'error') {
      toastNotification.style.borderLeftColor = 'var(--rose)';
      toastNotification.classList.add('toast-error');
    } else {
      toastNotification.style.borderLeftColor = 'var(--emerald)';
      toastNotification.classList.remove('toast-error');
    }
    
    toastNotification.style.display = 'block';
    
    const duration = type === 'error' ? 8000 : 3000;
    toastTimeout = setTimeout(() => {
      toastNotification.style.display = 'none';
    }, duration);
  }
}

// getFriendlyAuthErrorMessage helper
export function getFriendlyAuthErrorMessage(error) {
  if (!error) return 'An unknown error occurred during authentication.';
  
  const code = error.code;
  if (code) {
    switch (code) {
      case 'auth/popup-closed-by-user':
        return 'Sign-in was cancelled. Please keep the Google sign-in window open to complete the process.';
      case 'auth/popup-blocked':
        return 'The sign-in popup was blocked by your browser. Please allow popups for this site and try again.';
      case 'auth/cancelled-popup-request':
        return 'The sign-in request was cancelled as another authentication attempt was initiated.';
      case 'auth/unauthorized-domain':
        return 'This domain is not authorized for Google Sign-In. Please add localhost/domain to the Authorized Domains in the Firebase Console.';
      case 'auth/operation-not-allowed':
        return 'Google Sign-In is not enabled. Please enable it in the Firebase Console settings.';
      case 'auth/network-request-failed':
        return 'A network error occurred. Please check your internet connection and try again.';
      case 'auth/email-already-in-use':
        return 'This email address is already registered. Please sign in instead.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/weak-password':
        return 'Your password is too weak. Please use at least 6 characters.';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Incorrect email or password. Please check your credentials and try again.';
      case 'auth/user-disabled':
        return 'This account has been disabled. Please contact support.';
      case 'auth/too-many-requests':
        return 'Too many sign-in attempts. Access has been temporarily disabled. Please try again later.';
      default:
        break;
    }
  }

  const msg = error.message || '';
  if (msg.includes('auth/popup-closed-by-user')) {
    return 'Sign-in was cancelled. Please keep the Google sign-in window open to complete the process.';
  }
  if (msg.includes('auth/popup-blocked')) {
    return 'The sign-in popup was blocked by your browser. Please allow popups for this site.';
  }
  if (msg.includes('auth/unauthorized-domain')) {
    return 'This domain is not authorized for Google Sign-In. Please add localhost/domain to the Authorized Domains in the Firebase Console.';
  }
  if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password') || msg.includes('auth/user-not-found')) {
    return 'Incorrect email or password. Please check your credentials and try again.';
  }
  return msg || 'An unknown error occurred during authentication.';
}

