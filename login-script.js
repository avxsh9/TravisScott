// login-script.js
// Module script — uses Firebase v12 (web modular SDK)

// Firebase imports
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

// Firebase config (same as signup)
const firebaseConfig = {
  apiKey: "AIzaSyDSPYXYwrxaVTna2CfFI2EktEysXb7z5iE",
  authDomain: "ticketaddda.firebaseapp.com",
  projectId: "ticketaddda",
  storageBucket: "ticketaddda.firebasestorage.app",
  messagingSenderId: "987839286443",
  appId: "1:987839286443:web:235ed8857cd8cc8477fbee",
  measurementId: "G-EDDVKVVXHS"
};

// init app safely (avoid double init)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

// DOM ready
document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const loginForm = document.getElementById('loginForm');
  const emailEl = document.getElementById('email');
  const passwordEl = document.getElementById('password');
  const togglePasswordBtn = document.getElementById('togglePassword');
  const rememberEl = document.getElementById('rememberMe');
  const submitBtn = document.getElementById('submitBtn');
  const googleBtn = document.getElementById('googleSignInBtn');
  const fbBtn = document.getElementById('facebookSignInBtn');
  const forgotLink = document.querySelector('.forgot-link');

  if (!loginForm) return; // nothing to do if form missing

  // Password visibility toggle
  if (togglePasswordBtn && passwordEl) {
    togglePasswordBtn.addEventListener('click', () => {
      const icon = togglePasswordBtn.querySelector('i');
      if (passwordEl.type === 'password') {
        passwordEl.type = 'text';
        if (icon) { icon.classList.remove('fa-eye'); icon.classList.add('fa-eye-slash'); }
      } else {
        passwordEl.type = 'password';
        if (icon) { icon.classList.remove('fa-eye-slash'); icon.classList.add('fa-eye'); }
      }
    });
  }

  // Inline validation helpers
  const inputs = { email: emailEl, password: passwordEl };
  function showError(name, msg) {
    const el = document.getElementById(name + 'Error');
    if (el) { el.textContent = msg; el.classList.add('show'); }
    if (inputs[name]) inputs[name].classList.add('error');
  }
  function clearError(name) {
    const el = document.getElementById(name + 'Error');
    if (el) { el.textContent = ''; el.classList.remove('show'); }
    if (inputs[name]) inputs[name].classList.remove('error');
  }
  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  Object.keys(inputs).forEach(k => {
    const el = inputs[k];
    if (!el) return;
    el.addEventListener('blur', () => validateField(k));
    el.addEventListener('input', () => clearError(k));
  });

  function validateField(field) {
    const el = inputs[field];
    if (!el) return false;
    const v = el.value.trim();
    if (field === 'email') {
      if (!v) { showError('email', 'Email is required'); return false; }
      if (!isValidEmail(v)) { showError('email', 'Enter a valid email'); return false; }
    }
    if (field === 'password') {
      if (!v) { showError('password', 'Password is required'); return false; }
      if (v.length < 6) { showError('password', 'Password must be at least 6 characters'); return false; }
    }
    return true;
  }

  function validateForm() {
    let ok = true;
    Object.keys(inputs).forEach(k => { if (!validateField(k)) ok = false; });
    return ok;
  }

  // Submit handler
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError('email'); clearError('password');

    if (!validateForm()) return;

    const email = emailEl.value.trim();
    const password = passwordEl.value;
    const remember = !!(rememberEl && rememberEl.checked);

    // set persistence according to remember checkbox
    try {
      await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
    } catch (err) {
      console.warn('setPersistence failed, falling back to default:', err);
      // continue; sign-in will still attempt
    }

    // UI feedback
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Signing In...`;
    }

    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      const user = userCred.user;
      console.log('Login success:', user);

      // show success + redirect
      showSuccessMessage(user.email);
    } catch (err) {
      console.error('Login error:', err);
      // friendly messages
      const code = err.code || '';
      let msg = err.message || 'Login failed';
      if (code === 'auth/wrong-password') msg = 'Incorrect password. Try again.';
      if (code === 'auth/user-not-found') msg = 'No account found with this email.';
      if (code === 'auth/too-many-requests') msg = 'Too many attempts. Try again later.';
      alert('❌ ' + msg);

      if (submitBtn) { submitBtn.disabled = false; submitBtn.innerText = 'Sign In'; }
    }
  });

  // Google sign-in (popup)
  if (googleBtn) {
    googleBtn.addEventListener('click', async () => {
      const provider = new GoogleAuthProvider();
      try {
        // use local persistence by default for social logins if remember checked
        await setPersistence(auth, (rememberEl && rememberEl.checked) ? browserLocalPersistence : browserSessionPersistence);
        const result = await signInWithPopup(auth, provider);
        console.log('Google sign in result:', result);
        showSuccessMessage(result.user.email || result.user.displayName || '');
      } catch (err) {
        console.error('Google sign-in failed:', err);
        alert('Google sign-in failed: ' + (err.message || err));
      }
    });
  }

  // Facebook button placeholder
  if (fbBtn) {
    fbBtn.addEventListener('click', () => {
      alert('Facebook sign-in not wired in this build. You can add FacebookAuthProvider config in Firebase console and implement signInWithPopup similarly.');
    });
  }

  // Forgot password flow
  if (forgotLink) {
    forgotLink.addEventListener('click', async (e) => {
      e.preventDefault();
      const email = emailEl.value.trim();
      if (!email) { alert('Enter your email first to receive password reset link.'); return; }
      if (!isValidEmail(email)) { alert('Enter a valid email first.'); return; }

      try {
        await sendPasswordResetEmail(auth, email);
        alert(`📩 Password reset link sent to ${email}`);
      } catch (err) {
        console.error('Password reset error:', err);
        alert('Failed to send reset link: ' + (err.message || err));
      }
    });
  }

  // success UI
  function showSuccessMessage(userEmail) {
    const formContainer = document.querySelector('.form-content');
    if (!formContainer) {
      window.location.href = 'index.html';
      return;
    }
    formContainer.innerHTML = `
      <div class="success-message">
        <div class="success-icon"><i class="fas fa-check-circle"></i></div>
        <h2 class="success-title">Welcome Back!</h2>
        <p class="success-text">You are logged in as <b>${userEmail || ''}</b>.<br>Redirecting to homepage...</p>
      </div>
    `;
    setTimeout(() => { window.location.href = 'index.html'; }, 1000);
  }
});
