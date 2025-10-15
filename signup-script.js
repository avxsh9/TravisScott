// signup-script.js (updated)
// Load as module: <script type="module" src="signup-script.js"></script>

// Firebase imports (v12)
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-analytics.js";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

/* ---------------- Firebase config (your project) ---------------- */
const firebaseConfig = {
  apiKey: "AIzaSyDSPYXYwrxaVTna2CfFI2EktEysXb7z5iE",
  authDomain: "ticketaddda.firebaseapp.com",
  projectId: "ticketaddda",
  storageBucket: "ticketaddda.firebasestorage.app",
  messagingSenderId: "987839286443",
  appId: "1:987839286443:web:235ed8857cd8cc8477fbee",
  measurementId: "G-EDDVKVVXHS"
};

/* ------------- Init Firebase (safe: avoid double-init) ------------- */
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
try {
  // analytics can fail in some environments (like file://), so protect it
  getAnalytics(app);
} catch (err) {
  // ignore analytics init errors silently
}
const auth = getAuth(app);
const db = getFirestore(app);

/* ----------------- Signup logic ----------------- */
document.addEventListener('DOMContentLoaded', () => {
  const signupForm = document.getElementById('signupForm');
  if (!signupForm) return;

  const inputs = {
    fullName: document.getElementById('fullName'),
    email: document.getElementById('email'),
    password: document.getElementById('password'),
    confirmPassword: document.getElementById('confirmPassword'),
    terms: document.getElementById('terms')
  };

  const createBtn = signupForm.querySelector('.btn-primary');
  const strengthFill = document.querySelector('.strength-fill');
  const strengthText = document.querySelector('.strength-text');

  /* --------- Password visibility toggles --------- */
  document.querySelectorAll('.toggle-password').forEach(toggle => {
    toggle.addEventListener('click', function() {
      const targetId = this.getAttribute('data-target');
      const targetInput = document.getElementById(targetId);
      const icon = this.querySelector('i');
      if (!targetInput) return;
      if (targetInput.type === 'password') {
        targetInput.type = 'text';
        if (icon) { icon.classList.remove('fa-eye'); icon.classList.add('fa-eye-slash'); }
      } else {
        targetInput.type = 'password';
        if (icon) { icon.classList.remove('fa-eye-slash'); icon.classList.add('fa-eye'); }
      }
    });
  });

  /* --------- Password strength meter --------- */
  if (inputs.password) {
    inputs.password.addEventListener('input', function() {
      const strength = calculatePasswordStrength(this.value);
      if (strengthFill) strengthFill.style.width = `${strength.score}%`;
      if (!strengthText) return;
      if (this.value.length === 0) {
        strengthText.textContent = 'Password strength';
        strengthText.style.color = '#6c757d';
      } else if (strength.score <= 25) {
        strengthText.textContent = 'Weak';
        strengthText.style.color = '#ef4444';
      } else if (strength.score <= 50) {
        strengthText.textContent = 'Fair';
        strengthText.style.color = '#f59e0b';
      } else if (strength.score <= 75) {
        strengthText.textContent = 'Good';
        strengthText.style.color = '#eab308';
      } else {
        strengthText.textContent = 'Strong';
        strengthText.style.color = '#22c55e';
      }
    });
  }

  /* --------- Real-time validation handlers --------- */
  Object.keys(inputs).forEach(key => {
    const el = inputs[key];
    if (!el) return;
    if (key === 'terms') return;
    el.addEventListener('blur', () => validateField(key));
    el.addEventListener('input', () => clearError(key));
  });

  /* --------- Form submit --------- */
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (validateForm()) {
      await submitForm();
    }
  });

  /* ---------------- helper functions ---------------- */

  function validateField(fieldName) {
    const field = inputs[fieldName];
    if (!field) return true;
    const value = (field.type === 'checkbox') ? field.checked : field.value.trim();
    clearError(fieldName);
    let ok = true;

    switch (fieldName) {
      case 'fullName':
        if (!value) { showError(fieldName, 'Full name is required'); ok = false; }
        break;
      case 'email':
        if (!value) { showError(fieldName, 'Email is required'); ok = false; }
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) { showError(fieldName, 'Invalid email format'); ok = false; }
        break;
      case 'password':
        if (!value) { showError(fieldName, 'Password is required'); ok = false; }
        else if (value.length < 8) { showError(fieldName, 'Password must be at least 8 characters'); ok = false; }
        break;
      case 'confirmPassword':
        if (!value) { showError(fieldName, 'Please confirm your password'); ok = false; }
        else if (value !== inputs.password.value) { showError(fieldName, 'Passwords do not match'); ok = false; }
        break;
      case 'terms':
        if (!value) { showError(fieldName, 'You must accept the terms'); ok = false; }
        break;
      default:
        break;
    }
    return ok;
  }

  function validateForm() {
    let valid = true;
    Object.keys(inputs).forEach(fn => {
      if (!validateField(fn)) valid = false;
    });
    return valid;
  }

  function calculatePasswordStrength(password) {
    let score = 0;
    if (password.length >= 8) score += 25;
    if (/[A-Z]/.test(password)) score += 25;
    if (/[0-9]/.test(password)) score += 25;
    if (/[^A-Za-z0-9]/.test(password)) score += 25;
    return { score: Math.min(Math.max(score, 0), 100) };
  }

  function showError(fieldName, message) {
    const err = document.getElementById(fieldName + 'Error');
    const el = inputs[fieldName];
    if (err) { err.textContent = message; err.classList.add('show'); }
    if (el && el.type !== 'checkbox') el.classList.add('error');
  }

  function clearError(fieldName) {
    const err = document.getElementById(fieldName + 'Error');
    const el = inputs[fieldName];
    if (err) { err.textContent = ''; err.classList.remove('show'); }
    if (el && el.type !== 'checkbox') el.classList.remove('error');
  }

  /* --------- Submit to Firebase (Email + Password only) --------- */
  async function submitForm() {
    if (!createBtn) return;
    createBtn.disabled = true;
    const original = createBtn.innerHTML;
    createBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Creating Account...`;

    const fullName = inputs.fullName.value.trim();
    const email = inputs.email.value.trim();
    const password = inputs.password.value;

    try {
      // Ensure auth persistence so user stays logged in across tabs/sessions
      await setPersistence(auth, browserLocalPersistence);

      // Create user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update display name in Firebase Auth profile
      await updateProfile(user, { displayName: fullName });

      // Save user record in Firestore under collection "users"
      try {
        await setDoc(doc(db, 'users', user.uid), {
          fullName: fullName,
          email: email,
          provider: 'password',
          createdAt: serverTimestamp()
        });
      } catch (fireErr) {
        console.warn('Failed to write user to Firestore:', fireErr);
        // not fatal, continue
      }

      // Optionally send email verification (non-blocking)
      sendEmailVerification(user).catch(() => { /* ignore send-email failure */ });

      // success — redirect to index while user is logged in
      showSuccessMessage();
      // short delay so user sees message
      setTimeout(() => { window.location.href = 'index.html'; }, 1200);

    } catch (error) {
      console.error('Signup error:', error);
      let msg = error.message || 'Signup failed';
      if (error.code === 'auth/email-already-in-use') msg = 'Email already in use. Try logging in.';
      if (error.code === 'auth/weak-password') msg = 'Weak password. Use 8+ chars, a number and a symbol.';
      alert(msg);
      createBtn.disabled = false;
      createBtn.innerHTML = original;
    }
  }

  function showSuccessMessage() {
    const formSection = document.querySelector('.auth-form-section');
    if (!formSection) return;
    formSection.innerHTML = `
      <div class="success-message">
        <div class="success-icon"><i class="fas fa-check-circle"></i></div>
        <h2 class="success-title">Welcome to TicketAdda!</h2>
        <p class="success-text">Your account has been created. Check your inbox for verification (if any). Redirecting to homepage...</p>
        <div class="success-actions">
          <a href="index.html" class="btn-primary">Go to Home</a>
          <a href="login.html" class="btn-secondary">Sign in</a>
        </div>
      </div>`;
  }

}); // DOMContentLoaded end
