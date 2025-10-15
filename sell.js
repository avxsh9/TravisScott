/** sell.js - Full working file for Sell Tickets page
 *  Paste this file as-is. Make sure firebase compat scripts are loaded in HTML before this file.
 */

(function () {
    'use strict';
  
    
    // ---------------------------
    // Firebase config (user-provided)
    // ---------------------------
    const firebaseConfig = {
      apiKey: "AIzaSyDSPYXYwrxaVTna2CfFI2EktEysXb7z5iE",
      authDomain: "ticketaddda.firebaseapp.com",
      projectId: "ticketaddda",
      storageBucket: "ticketaddda.firebasestorage.app",
      messagingSenderId: "987839286443",
      appId: "1:987839286443:web:235ed8857cd8cc8477fbee",
      measurementId: "G-EDDVKVVXHS"
    };
  
    // small helper to query element by id
    function qs(id) { return document.getElementById(id); }
    function log(...args){ console.log('[sell.js]', ...args); }
    function warn(...args){ console.warn('[sell.js]', ...args); }
    function err(...args){ console.error('[sell.js]', ...args); }
  
    // ---------------------------
    // Initialize Firebase (compat)
    // ---------------------------
    try {
      if (typeof firebase === 'undefined') {
        throw new Error('Firebase SDK not found. Make sure firebase-app-compat + auth-compat + firestore-compat (+ storage-compat) scripts are included in HTML BEFORE sell.js');
      }
      if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        log('Firebase initialized.');
      } else {
        log('Firebase already initialized, reusing instance.');
      }
    } catch (e) {
      err('Firebase init failed:', e);
      // continue - code will handle missing SDK gracefully
    }
  
    // SDK refs (compat)
    const auth = (typeof firebase !== 'undefined' && firebase.auth) ? firebase.auth() : null;
    const db = (typeof firebase !== 'undefined' && firebase.firestore) ? firebase.firestore() : null;
    const storage = (typeof firebase !== 'undefined' && firebase.storage) ? firebase.storage() : null;
  
    // ---------------------------
    // State + constants
    // ---------------------------
    const PLATFORM_FEE_RATE = 0.02;
    let currentStep = 1;
    const totalSteps = 4;
  
    const formData = {
      eventName: '',
      eventCategory: '',
      eventDate: '',
      eventTime: '',
      venue: '',
      ticketSection: '',
      ticketRow: '',
      seatNumbers: '',
      quantity: 0,
      ticketType: 'mobile',
      sellingPrice: 0,
      agreeTerms: false,
      agreeTransfer: false
    };
  
    // ---------------------------
    // Small helpers
    // ---------------------------
    function formatINR(num) {
      if (isNaN(num)) num = 0;
      return '₹' + Number(num).toLocaleString('en-IN', { maximumFractionDigits: 0 });
    }
  
    function escapeHtml(text) {
      if (!text) return '';
      const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
      return String(text).replace(/[&<>"']/g, m => map[m]);
    }
  
    // ---------------------------
    // Header auth UI handling
    // ---------------------------
    function updateHeaderForUser(user) {
      const authActions = qs('authActions');
      const userMenu = qs('userMenu');
      const userNameElm = qs('userNameElm');
      const userAvatar = qs('userAvatar');
      const mobileNav = qs('mobileNav'); // may not exist on sell.html, that's fine
  
      if (user) {
        let displayName = (user.displayName || '').trim();
        if (!displayName && user.email) displayName = user.email.split('@')[0];
        if (!displayName) displayName = 'User';
  
        if (authActions) authActions.style.display = 'none';
        if (userMenu) userMenu.style.display = 'flex';
        if (userNameElm) userNameElm.textContent = `Hi, ${displayName}`;
        if (userAvatar && user.photoURL) userAvatar.src = user.photoURL;
  
        // mobile nav link
        if (mobileNav) {
          const existing = mobileNav.querySelector('.mobile-auth-link');
          if (existing) existing.remove();
          const a = document.createElement('a');
          a.href = '#';
          a.className = 'mobile-nav-link mobile-auth-link';
          a.textContent = 'Logout';
          a.addEventListener('click', (e) => { e.preventDefault(); auth.signOut(); });
          mobileNav.appendChild(a);
        }
      } else {
        if (authActions) authActions.style.display = 'flex';
        if (userMenu) userMenu.style.display = 'none';
        if (mobileNav) {
          const existing = mobileNav.querySelector('.mobile-auth-link');
          if (existing) existing.remove();
          const a = document.createElement('a');
          a.href = 'login.html';
          a.className = 'mobile-nav-link mobile-auth-link';
          a.textContent = 'Sign In';
          mobileNav.appendChild(a);
        }
      }
    }
  
    // ---------------------------
    // Setup firebase auth persistence + listener
    // ---------------------------
    if (auth) {
      // set persistence to LOCAL to keep user logged across pages
      auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
        .then(() => {
          log('Auth persistence set to LOCAL.');
        })
        .catch(e => {
          warn('Could not set auth persistence:', e);
        });
  
      // onAuthStateChanged will fire on page load if user is already logged in
      auth.onAuthStateChanged(user => {
        log('onAuthStateChanged fired. user=', !!user);
        updateHeaderForUser(user);
  
        // optional redirect back to saved url after login
        try {
          const post = localStorage.getItem('postSignInRedirect');
          if (user && post) {
            localStorage.removeItem('postSignInRedirect');
            if (window.location.pathname !== post) {
              log('Redirecting to saved postSignInRedirect:', post);
              window.location.href = post;
            }
          }
        } catch (e) { /* ignore */ }
      });
    } else {
      warn('Firebase Auth SDK not found - header login will not update.');
    }
  
    // helper to store path before redirecting to login
    window.savePostSignInRedirect = function () {
      try { localStorage.setItem('postSignInRedirect', window.location.pathname); } catch (e) { /* ignore */ }
    };
  
    // wire logout button (delegated)
    document.addEventListener('click', function (ev) {
      if (!ev.target) return;
      if (ev.target.id === 'logoutBtn' || ev.target.closest && ev.target.closest('#logoutBtn')) {
        ev.preventDefault();
        if (auth) {
          auth.signOut().catch(e => console.error('Sign out failed:', e));
        }
      }
    });
  
    // ---------------------------
    // Hero earnings calculator
    // ---------------------------
    function calculateHero() {
      const priceInput = qs('ticketPrice');
      const qtyInput = qs('ticketQuantity');
      if (!priceInput || !qtyInput) return;
      const price = parseInt(priceInput.value, 10) || 0;
      const qty = parseInt(qtyInput.value, 10) || 1;
      const total = price * qty;
      const fee = Math.round(total * PLATFORM_FEE_RATE);
      const earnings = total - fee;
      if (qs('totalSale')) qs('totalSale').textContent = formatINR(total);
      if (qs('platformFee')) qs('platformFee').textContent = formatINR(fee);
      if (qs('youEarn')) qs('youEarn').textContent = formatINR(earnings);
    }
  
    // ---------------------------
    // Previews
    // ---------------------------
    function updateEarningsPreview() {
      const price = parseInt(formData.sellingPrice, 10) || 0;
      const qty = parseInt(formData.quantity, 10) || 0;
      const total = price * qty;
      const fee = Math.round(total * PLATFORM_FEE_RATE);
      const earnings = total - fee;
      if (qs('previewPrice')) qs('previewPrice').textContent = formatINR(price);
      if (qs('previewQuantity')) qs('previewQuantity').textContent = String(qty);
      if (qs('previewTotal')) qs('previewTotal').textContent = formatINR(total);
      if (qs('previewFee')) qs('previewFee').textContent = formatINR(fee);
      if (qs('previewEarnings')) qs('previewEarnings').textContent = formatINR(earnings);
    }
  
    function updateListingPreview() {
      if (qs('previewEventName')) qs('previewEventName').textContent = formData.eventName || 'Event Name';
      if (qs('previewCategory')) qs('previewCategory').textContent = formData.eventCategory || 'Category';
  
      if (formData.eventDate) {
        const d = new Date(formData.eventDate);
        const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        let dateStr = d.toLocaleDateString('en-IN', opts);
        if (formData.eventTime) dateStr += ' at ' + formData.eventTime;
        if (qs('previewEventDate')) qs('previewEventDate').textContent = dateStr;
      } else {
        if (qs('previewEventDate')) qs('previewEventDate').textContent = 'Date';
      }
  
      if (qs('previewVenue')) qs('previewVenue').textContent = formData.venue || 'Venue';
  
      const parts = [];
      if (formData.quantity) parts.push(`${formData.quantity} ticket${formData.quantity > 1 ? 's' : ''}`);
      if (formData.ticketSection) parts.push(formData.ticketSection);
      if (formData.ticketRow) parts.push(`Row ${formData.ticketRow}`);
      if (formData.seatNumbers) parts.push(`Seats ${formData.seatNumbers}`);
      if (qs('previewTicketInfo')) qs('previewTicketInfo').textContent = parts.join(' • ') || 'Ticket info';
  
      const price = parseInt(formData.sellingPrice, 10) || 0;
      const qty = parseInt(formData.quantity, 10) || 1;
      if (qs('previewPriceInfo')) qs('previewPriceInfo').textContent = `${formatINR(price)} per ticket • Total: ${formatINR(price * qty)}`;
    }
  
    function updatePreview() {
      updateEarningsPreview();
      updateListingPreview();
    }
  
    // ---------------------------
    // Validation & navigation
    // ---------------------------
    function validateCurrentStep() {
      const currentFormStep = document.querySelector(`.form-step[data-step="${currentStep}"]`);
      if (!currentFormStep) return true;
      const requiredFields = currentFormStep.querySelectorAll('input[required], select[required]');
      let valid = true;
      requiredFields.forEach(field => {
        field.classList.remove('error-border');
        const fileWrapper = field.closest('.file-upload-wrapper');
        if (fileWrapper) {
          const label = fileWrapper.querySelector('.file-upload-label');
          if (label) label.classList.remove('error-border');
        }
        if (field.type === 'checkbox') {
          if (!field.checked) {
            const ck = field.parentElement.querySelector('.checkmark');
            if (ck) ck.classList.add('error-border');
            valid = false;
          }
        } else if (field.type === 'file') {
          if (!field.files || field.files.length === 0) {
            const label = field.parentElement.querySelector('.file-upload-label');
            if (label) label.classList.add('error-border');
            valid = false;
          }
        } else {
          if (!String(field.value || '').trim()) {
            field.classList.add('error-border');
            valid = false;
          }
        }
      });
      return valid;
    }
  
    function nextStep() {
      if (!validateCurrentStep()) return;
      if (currentStep < totalSteps) {
        currentStep++;
        updateStepDisplay();
      }
    }
  
    function prevStep() {
      if (currentStep > 1) {
        currentStep--;
        updateStepDisplay();
      }
    }
  
    function updateStepDisplay() {
      document.querySelectorAll('.form-step').forEach(stepEl => {
        const stepNum = parseInt(stepEl.getAttribute('data-step'), 10);
        stepEl.classList.toggle('active', stepNum === currentStep);
      });
      document.querySelectorAll('.progress-indicator .step').forEach(ind => {
        const stepNum = parseInt(ind.getAttribute('data-step'), 10);
        ind.classList.toggle('active', stepNum <= currentStep);
      });
      if (qs('prevBtn')) qs('prevBtn').style.display = currentStep === 1 ? 'none' : 'inline-flex';
      if (qs('nextBtn')) qs('nextBtn').style.display = currentStep === totalSteps ? 'none' : 'inline-flex';
      if (qs('submitBtn')) qs('submitBtn').style.display = currentStep === totalSteps ? 'inline-flex' : 'none';
      if (currentStep === totalSteps) populateReview();
    }
  
    function populateReview() {
      updateListingPreview();
      updateEarningsPreview();
      const ticketUpload = qs('ticketUpload');
      const paymentProof = qs('paymentProofUpload');
      if (qs('previewTicketUpload')) {
        qs('previewTicketUpload').textContent = ticketUpload && ticketUpload.files && ticketUpload.files[0] ? ticketUpload.files[0].name : 'No file provided';
      }
      if (qs('previewPaymentProof')) {
        qs('previewPaymentProof').textContent = paymentProof && paymentProof.files && paymentProof.files[0] ? paymentProof.files[0].name : 'No file provided';
      }
    }
  
    // ---------------------------
    // File preview helper
    // ---------------------------
    function setupFileUpload(inputId, previewId) {
      const input = qs(inputId);
      const preview = qs(previewId);
      if (!input || !preview) return;
      input.addEventListener('change', function () {
        const label = this.parentElement.querySelector('.file-upload-label');
        if (this.files && this.files.length) {
          preview.style.display = 'flex';
          preview.innerHTML = `<i class="fas fa-check-circle"></i> ${escapeHtml(this.files[0].name)}`;
          if (label) label.classList.remove('error-border');
        } else {
          preview.style.display = 'none';
        }
      });
    }
  
    // ---------------------------
    // Suggestions & pricing quick picks
    // ---------------------------
    function initializeEventSuggestions() {
      const eventInput = qs('eventName');
      const suggestions = qs('eventSuggestions');
      if (!eventInput || !suggestions) return;
      const mockEvents = [
        'Mumbai Indians vs Chennai Super Kings',
        'Royal Challengers Bangalore vs Kolkata Knight Riders',
        'Coldplay India Tour 2025',
        'Diljit Dosanjh Live Concert',
        'Sunburn Festival Goa',
        'Ed Sheeran Mumbai Concert',
        'India vs Australia Test Match'
      ];
      eventInput.addEventListener('input', function () {
        const v = this.value.toLowerCase();
        if (v.length < 2) { suggestions.style.display = 'none'; return; }
        const matches = mockEvents.filter(ev => ev.toLowerCase().includes(v));
        if (!matches.length) { suggestions.style.display = 'none'; return; }
        suggestions.innerHTML = matches.map(ev => `<div class="suggestion-item" data-value="${escapeHtml(ev)}">${escapeHtml(ev)}</div>`).join('');
        suggestions.style.display = 'block';
      });
      suggestions.addEventListener('click', function (e) {
        if (e.target.classList.contains('suggestion-item')) {
          const val = e.target.getAttribute('data-value');
          eventInput.value = val;
          formData.eventName = val;
          suggestions.style.display = 'none';
          updatePreview();
        }
      });
      document.addEventListener('click', function (e) {
        if (!eventInput.contains(e.target) && !suggestions.contains(e.target)) suggestions.style.display = 'none';
      });
    }
  
    function initializePricingSuggestions() {
      document.querySelectorAll('.suggestion-btn').forEach(btn => {
        btn.addEventListener('click', function () {
          const val = parseInt(this.getAttribute('data-price'), 10) || 0;
          const selling = qs('sellingPrice');
          if (selling) selling.value = val;
          formData.sellingPrice = val;
          updatePreview();
        });
      });
    }
  
    // ---------------------------
    // Form input listeners -> formData
    // ---------------------------
    function addFormInputListeners() {
      const form = qs('ticketListingForm');
      if (!form) return;
      form.addEventListener('input', function (e) {
        const t = e.target;
        if (!t || !t.name) return;
        if (t.type === 'checkbox') {
          formData[t.name] = t.checked;
        } else if (t.type === 'radio') {
          if (t.checked) formData[t.name] = t.value;
        } else {
          formData[t.name] = t.value;
        }
        if (t.name === 'quantity') formData.quantity = parseInt(t.value, 10) || 0;
        if (t.name === 'sellingPrice') formData.sellingPrice = parseInt(t.value, 10) || 0;
        updatePreview();
      });
  
      const qty = qs('quantity');
      if (qty) qty.addEventListener('change', (e) => { formData.quantity = parseInt(e.target.value, 10) || 0; updatePreview(); });
    }
  
    // ---------------------------
    // Upload file to Firebase Storage (compat)
    // returns download URL
    // ---------------------------
    async function uploadFileAndGetUrl(file, folder = 'listings') {
      if (!file) return null;
      if (!storage) {
        warn('Firebase Storage SDK not loaded.');
        return null;
      }
      try {
        const userId = (auth && auth.currentUser && auth.currentUser.uid) ? auth.currentUser.uid : 'anon';
        const safeName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
        const fullPath = `${folder}/${userId}/${safeName}`;
        const storageRef = storage.ref().child(fullPath);
        const snap = await storageRef.put(file);
        const url = await snap.ref.getDownloadURL();
        return url;
      } catch (e) {
        err('Upload failed:', e);
        throw e;
      }
    }
  
    // ---------------------------
    // Submit handler -> uploads files -> saves Firestore doc
    // ---------------------------
    async function handleSubmit(e) {
      e.preventDefault();
      if (!validateCurrentStep()) return;
  
      const submitBtn = qs('submitBtn');
      if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<span class="loading-spinner"></span> Listing...'; }
  
      try {
        if (!auth) throw new Error('Auth SDK unavailable.');
  
        const user = auth.currentUser;
        if (!user) {
          alert('Please sign in to list tickets.');
          try { localStorage.setItem('postSignInRedirect', window.location.pathname); } catch (ex) { /* ignore */ }
          window.location.href = 'login.html';
          return;
        }
  
        // build payload
        const payload = {
          sellerUid: user.uid,
          sellerEmail: user.email || null,
          eventName: qs('eventName')?.value || '',
          eventCategory: qs('eventCategory')?.value || '',
          eventDate: qs('eventDate')?.value || '',
          eventTime: qs('eventTime')?.value || '',
          venue: qs('venue')?.value || '',
          ticketSection: qs('ticketSection')?.value || '',
          ticketRow: qs('ticketRow')?.value || '',
          seatNumbers: qs('seatNumbers')?.value || '',
          quantity: Number(qs('quantity')?.value) || 0,
          ticketType: (document.querySelector('input[name="ticketType"]:checked')?.value) || 'mobile',
          sellingPrice: Number(qs('sellingPrice')?.value) || 0,
          ticketFileUrl: null,
          paymentProofUrl: null,
          agreeTerms: !!qs('agreeTerms')?.checked,
          agreeTransfer: !!qs('agreeTransfer')?.checked,
          createdAt: (db && firebase.firestore.FieldValue) ? firebase.firestore.FieldValue.serverTimestamp() : new Date().toISOString()
        };
  
        // upload files
        const ticketInput = qs('ticketUpload');
        const proofInput = qs('paymentProofUpload');
  
        if (ticketInput && ticketInput.files && ticketInput.files[0]) {
          payload.ticketFileUrl = await uploadFileAndGetUrl(ticketInput.files[0], 'tickets');
          log('Ticket file uploaded:', payload.ticketFileUrl);
        }
        if (proofInput && proofInput.files && proofInput.files[0]) {
          payload.paymentProofUrl = await uploadFileAndGetUrl(proofInput.files[0], 'proofs');
          log('Payment proof uploaded:', payload.paymentProofUrl);
        }
  
        // write to Firestore
        if (!db) throw new Error('Firestore SDK not loaded on this page.');
        const docRef = await db.collection('listings').add(payload);
        log('Listing saved. id=', docRef.id);
  
        alert('Listing saved! Document ID: ' + docRef.id);
        // redirect to my-listings or reload
        window.location.href = '/my-listings.html';
      } catch (e) {
        err('Listing save failed:', e);
        alert('Failed to save listing. Check console for details.');
        if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = 'List my tickets'; }
      }
    }
  
    // ---------------------------
    // DOMContentLoaded wiring
    // ---------------------------
    document.addEventListener('DOMContentLoaded', function () {
      // hero
      calculateHero();
      const priceInput = qs('ticketPrice');
      const qtyInput = qs('ticketQuantity');
      if (priceInput) priceInput.addEventListener('input', calculateHero);
      if (qtyInput) qtyInput.addEventListener('change', calculateHero);
  
      // nav buttons
      const nextBtn = qs('nextBtn');
      const prevBtn = qs('prevBtn');
      if (nextBtn) nextBtn.addEventListener('click', nextStep);
      if (prevBtn) prevBtn.addEventListener('click', prevStep);
  
      // form
      const form = qs('ticketListingForm');
      if (form) form.addEventListener('submit', handleSubmit);
  
      // previews / uploads
      setupFileUpload('ticketUpload', 'ticketUploadPreview');
      setupFileUpload('paymentProofUpload', 'paymentProofUploadPreview');
  
      // suggestions / pricing
      initializeEventSuggestions();
      initializePricingSuggestions();
  
      // inputs -> formData
      addFormInputListeners();
  
      // initial UI
      updateStepDisplay();
      updatePreview();
  
      // debug - show current auth state at load time
      if (auth) {
        log('Current user at DOMContentLoaded:', !!auth.currentUser, auth.currentUser ? auth.currentUser.uid : null);
      } else {
        warn('Auth not available at DOMContentLoaded');
      }
    });
  
  })(); // end IIFE
  