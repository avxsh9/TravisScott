/**
 * Sell Tickets Page Logic (sell.js) - CLEANED & FIXED
 * - Firebase Firestore submission
 * - Form validation, step navigation, dynamic pricing preview
 * - Realtime approved listings listener (populates window.sellerTickets)
 */
(function () {
  'use strict';

  // ===== CONFIG =====
  const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbxYpYj4c_6SPuXjEOTUlbbpW5iHZlMJX40har2NJnoAYYhRukDMEPrIbzofbEEz_cIG/exec";
  const PLATFORM_FEE_RATE = 0.00; // 0% for now
  const totalSteps = 4;
  let currentStep = 1;

  // --- Firebase Config ---
  const firebaseConfig = {
    apiKey: "AIzaSyDSPYXYwrxaVTna2CfFI2EktEysXb7z5iE",
    authDomain: "ticketaddda.firebaseapp.com",
    projectId: "ticketaddda",
    storageBucket: "ticketaddda.firebasestorage.app",
    messagingSenderId: "987839286443",
    appId: "1:987839286443:web:235ed8857cd8cc8477fbee",
    measurementId: "G-EDDVKVVXHS"
  };

  // Init Firebase (v8 style)
  if (!window.firebase) {
    throw new Error('Firebase SDK not loaded. Include firebase-app.js + firebase-auth.js + firebase-firestore.js before this script.');
  }
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  const auth = firebase.auth();
  const db = firebase.firestore();
  const listingsRef = db.collection('listings');

  // ===== Helpers =====
  function formatINR(num) {
    const n = Number(num) || 0;
    return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  }

  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      if (!file) return resolve('');
      if (file.size > 50 * 1024 * 1024) return reject(new Error('File too large. Max 50MB allowed.'));
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  }

  function createMockFileUrl(file) {
    if (!file) return null;
    return `mock-file-url/data_proofs/${encodeURIComponent(file.name)}?size=${file.size}`;
  }

  function showToast(message, isError = false) {
    let toast = document.getElementById('formStatus');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'formStatus';
      toast.style.position = 'fixed';
      toast.style.left = '16px';
      toast.style.bottom = '16px';
      toast.style.background = 'rgba(0,0,0,0.75)';
      toast.style.color = '#fff';
      toast.style.padding = '10px 14px';
      toast.style.borderRadius = '8px';
      toast.style.zIndex = 9999;
      document.body.appendChild(toast);
    }
    toast.innerHTML = isError ? `<strong style="color:#ff7b7b">Error:</strong> ${message}` : `<strong style="color:#7bffbd">Success:</strong> ${message}`;
    toast.style.display = 'block';
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { toast.style.display = 'none'; }, 4500);
  }

  // ===== Approved Listings Listener (Realtime / one-time) =====
  function startApprovedListingsListener({ realtime = true } = {}) {
    if (!db) {
      console.warn('Firestore not available - skipping approved listings listener.');
      return null;
    }

    const q = db.collection('listings').where('status', '==', 'approved');

    if (realtime) {
      console.log('Starting realtime approved listings listener...');
      const unsubscribe = q.onSnapshot(snapshot => {
        try {
          const approved = snapshot.docs.map(doc => {
            const d = doc.data() || {};
            const priceRaw = d.price ?? d.sellingPrice ?? d.listPrice ?? d.amount ?? '';
            const priceDigits = String(priceRaw).replace(/[^\d]/g, '');
            return {
              id: doc.id,
              seller: d.seller || d.name || (d.sellerName || 'Seller'),
              price: priceRaw,
              quantity: d.quantity ?? d.quan ?? d.qty ?? 0,
              seat: d.seat || d.section || '-',
              concert: d.concert || d.eventName || '-',
              city: d.city || '-',
              date: d.date || '-',
              phone: d.phone || '',
              email: d.email || '',
              note: d.note || '',
              __priceNum: priceDigits ? parseInt(priceDigits, 10) : Infinity
            };
          });

          window.sellerTickets = approved;
          if (typeof window.resetPagination === 'function') window.resetPagination();
          if (typeof window.renderFilteredTickets === 'function') window.renderFilteredTickets();
          console.log('Approved listings updated:', approved.length);
        } catch (err) {
          console.error('Error processing approved listings snapshot:', err);
        }
      }, err => {
        console.error('Firestore onSnapshot error (approved listings):', err);
      });
      return unsubscribe;
    } else {
      // one-time fetch
      return q.get().then(snapshot => {
        const approved = snapshot.docs.map(doc => {
          const d = doc.data() || {};
          const priceRaw = d.price ?? d.sellingPrice ?? d.listPrice ?? d.amount ?? '';
          const priceDigits = String(priceRaw).replace(/[^\d]/g, '');
          return {
            id: doc.id,
            seller: d.seller || d.name || (d.sellerName || 'Seller'),
            price: priceRaw,
            quantity: d.quantity ?? d.quan ?? d.qty ?? 0,
            seat: d.seat || d.section || '-',
            concert: d.concert || d.eventName || '-',
            city: d.city || '-',
            date: d.date || '-',
            phone: d.phone || '',
            email: d.email || '',
            note: d.note || '',
            __priceNum: priceDigits ? parseInt(priceDigits, 10) : Infinity
          };
        });

        window.sellerTickets = approved;
        if (typeof window.resetPagination === 'function') window.resetPagination();
        if (typeof window.renderFilteredTickets === 'function') window.renderFilteredTickets();
        console.log('Approved listings fetched (one-time):', approved.length);
        return approved;
      }).catch(err => {
        console.error('Error fetching approved listings:', err);
        return [];
      });
    }
  }

  // ===== Firebase auth init & UI sync =====
  function initFirebaseAuth() {
    const authActions = document.getElementById('authActions');
    const userMenu = document.getElementById('userMenu');
    const userNameElm = document.getElementById('userNameElm');
    const userAvatar = document.getElementById('userAvatar');
    const logoutBtn = document.getElementById('logoutBtn');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');

    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(() => { /* ignore */ });

    auth.onAuthStateChanged(user => {
      const loginWall = document.getElementById('loginWall');
      const sellPageContent = document.getElementById('sellPageContent');

      if (user) {
        let displayName = (user.displayName || '').trim() || (user.email ? user.email.split('@')[0] : '');
        if (authActions) authActions.style.display = 'none';
        if (userMenu) {
          userMenu.style.display = 'flex';
          if (userNameElm) userNameElm.textContent = `Hi, ${displayName || 'User'}`;
          if (userAvatar && user.photoURL) userAvatar.src = user.photoURL;
        }
        if (loginWall) loginWall.style.display = 'none';
        if (sellPageContent) sellPageContent.style.display = 'block';
      } else {
        if (authActions) authActions.style.display = 'flex';
        if (userMenu) userMenu.style.display = 'none';
        if (loginWall) loginWall.style.display = 'block';
        if (sellPageContent) sellPageContent.style.display = 'none';
      }
    });

    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        auth.signOut().catch(err => console.error('Sign out failed:', err));
      });
    }

    if (mobileMenuBtn) {
      mobileMenuBtn.addEventListener('click', () => {
        const navMenu = document.getElementById('navMenu');
        navMenu?.classList.toggle('active');
        mobileMenuBtn.classList.toggle('active');
      });
    }
  }

  // ===== Form helpers / preview logic =====
  function updateHeroCalculator() {
    const heroPrice = document.getElementById('ticketPrice');
    const heroQty = document.getElementById('ticketQuantity');
    if (!heroPrice || !heroQty) return;
    const price = parseFloat(heroPrice.value) || 0;
    const qty = parseInt(heroQty.value) || 1;
    const total = price * qty;
    const fee = Math.round(total * PLATFORM_FEE_RATE);
    const earn = total - fee;
    const totalSaleEl = document.getElementById('totalSale');
    const platformFeeEl = document.getElementById('platformFee');
    const youEarnEl = document.getElementById('youEarn');
    if (totalSaleEl) totalSaleEl.textContent = formatINR(total);
    if (platformFeeEl) platformFeeEl.textContent = formatINR(fee);
    if (youEarnEl) youEarnEl.textContent = formatINR(earn);
  }

  function updateEarningsPreview() {
    const sellingPrice = document.getElementById('sellingPrice');
    const quantity = document.getElementById('quantity');
    if (!sellingPrice || !quantity) return;
    const price = parseInt(sellingPrice.value) || 0;
    const qty = parseInt(quantity.value) || 0;
    const total = price * qty;
    const fee = Math.round(total * PLATFORM_FEE_RATE);
    const earnings = total - fee;
    const previewPrice = document.getElementById('previewPrice');
    const previewQuantity = document.getElementById('previewQuantity');
    const previewTotal = document.getElementById('previewTotal');
    const previewFee = document.getElementById('previewFee');
    const previewEarnings = document.getElementById('previewEarnings');
    if (previewPrice) previewPrice.textContent = formatINR(price);
    if (previewQuantity) previewQuantity.textContent = String(qty);
    if (previewTotal) previewTotal.textContent = formatINR(total);
    if (previewFee) previewFee.textContent = formatINR(fee);
    if (previewEarnings) previewEarnings.textContent = formatINR(earnings);
  }

  function createPreview(container, file) {
    if (!container) return;
    container.innerHTML = '';
    container.style.display = file ? 'flex' : 'none';
    if (!file) return;
    const icon = document.createElement('i');
    icon.className = 'fas fa-check-circle';
    icon.style.marginRight = '8px';
    const text = document.createElement('span');
    text.textContent = `${file.name} (${Math.round(file.size / 1024)} KB)`;
    container.appendChild(icon);
    container.appendChild(text);
  }

  function validateStep(stepNum) {
    const step = document.querySelector(`.form-step[data-step="${stepNum}"]`);
    if (!step) return true;
    let isValid = true;
    const requiredFields = step.querySelectorAll('[required]');
    requiredFields.forEach(field => {
      field.classList.remove('error-border');
      const parentWrapper = field.closest('.input-wrapper, .price-input-wrapper, .file-upload-wrapper, .checkbox-wrapper');
      if (parentWrapper) parentWrapper.classList.remove('error-border');
      if (!field.checkValidity()) {
        isValid = false;
        field.classList.add('error-border');
        if (parentWrapper) parentWrapper.classList.add('error-border');
      }
    });
    if (!isValid) {
      step.querySelector(':invalid')?.focus();
    }
    return isValid;
  }

  function updatePreviewSection() {
    const getValue = id => document.getElementById(id)?.value || '';
    const previewEventName = document.getElementById('previewEventName');
    const previewCategory = document.getElementById('previewCategory');
    const previewVenue = document.getElementById('previewVenue');
    const previewEventDate = document.getElementById('previewEventDate');
    const previewTicketInfo = document.getElementById('previewTicketInfo');
    const previewPriceInfo = document.getElementById('previewPriceInfo');
    const ticketInput = document.getElementById('ticketUpload');
    const proofInput = document.getElementById('paymentProofUpload');

    if (previewEventName) previewEventName.textContent = getValue('eventName') || 'Event Name';
    if (previewCategory) {
      previewCategory.textContent = getValue('eventCategory') || 'Category';
      previewCategory.className = 'preview-category';
      const cat = getValue('eventCategory');
      if (cat) {
        previewCategory.classList.add(`category-${cat.toLowerCase().replace(/\s+/g, '-')}`);
      }
    }
    if (previewVenue) previewVenue.textContent = getValue('venue') || 'Venue';

    // date/time formatting
    let dateStr = 'Date';
    if (getValue('eventDate')) {
      const d = new Date(getValue('eventDate') + 'T00:00:00');
      dateStr = d.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
    }
    if (getValue('eventTime')) {
      const [hStr, mStr] = getValue('eventTime').split(':');
      let h = parseInt(hStr, 10) || 0;
      const m = mStr || '00';
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      dateStr += ` at ${h}:${m} ${ampm}`;
    }
    if (previewEventDate) previewEventDate.textContent = dateStr;

    // Ticket info
    let ticketInfo = '';
    if (getValue('quantity')) ticketInfo += `${getValue('quantity')} ticket(s)`;
    if (getValue('ticketSection')) ticketInfo += (ticketInfo ? ' • ' : '') + getValue('ticketSection');
    if (previewTicketInfo) previewTicketInfo.textContent = ticketInfo || 'Ticket info';

    // Price info
    const price = getValue('sellingPrice');
    if (previewPriceInfo) previewPriceInfo.textContent = price ? `${formatINR(price)} per ticket` : 'Price info';

    // File status
    const prefTicketUpload = document.getElementById('previewTicketUpload');
    const prefPaymentProof = document.getElementById('previewPaymentProof');
    if (prefTicketUpload) prefTicketUpload.textContent = ticketInput?.files?.length ? ticketInput.files[0].name : 'No ticket file provided';
    if (prefPaymentProof) prefPaymentProof.textContent = proofInput?.files?.length ? proofInput.files[0].name : 'No proof file provided';

    updateEarningsPreview();
  }

  function showStep(i) {
    currentStep = i;
    const steps = Array.from(document.querySelectorAll('.form-step'));
    const progressSteps = Array.from(document.querySelectorAll('.progress-indicator .step'));
    const formEl = document.getElementById('sellForm');
    const nextBtn = document.getElementById('nextBtn');
    const prevBtn = document.getElementById('prevBtn');
    const submitBtn = document.getElementById('submitBtn');

    steps.forEach(s => s.classList.toggle('active', parseInt(s.getAttribute('data-step'), 10) === i));
    progressSteps.forEach(p => p.classList.toggle('active', parseInt(p.getAttribute('data-step'), 10) <= i));
    if (prevBtn) prevBtn.style.display = i === 1 ? 'none' : 'inline-flex';
    if (nextBtn) nextBtn.style.display = i === totalSteps ? 'none' : 'inline-flex';
    if (submitBtn) submitBtn.style.display = i === totalSteps ? 'inline-flex' : 'none';
    if (formEl) window.scrollTo({ top: formEl.offsetTop - 80, behavior: 'smooth' });
    updatePreviewSection();
  }

  // ===== Main Initialization =====
  function init() {
    initFirebaseAuth();

    // Start approved listings listener to keep window.sellerTickets updated (safe to call even on sell page)
    try {
      startApprovedListingsListener({ realtime: true });
    } catch (err) {
      console.warn('Failed to start approved listings listener:', err);
    }

    const form = document.getElementById('ticketListingForm');
    const nextBtn = document.getElementById('nextBtn');
    const prevBtn = document.getElementById('prevBtn');
    const ticketInput = document.getElementById('ticketUpload');
    const proofInput = document.getElementById('paymentProofUpload');
    const ticketPreview = document.getElementById('ticketUploadPreview');
    const proofPreview = document.getElementById('paymentProofUploadPreview');
    const heroPrice = document.getElementById('ticketPrice');
    const heroQty = document.getElementById('ticketQuantity');

    // Navigation
    if (nextBtn) nextBtn.addEventListener('click', function () {
      if (validateStep(currentStep)) showStep(Math.min(totalSteps, currentStep + 1));
    });
    if (prevBtn) prevBtn.addEventListener('click', function () {
      if (currentStep > 1) showStep(Math.max(1, currentStep - 1));
    });

    // Price suggestion buttons
    const priceButtons = document.querySelectorAll('.suggestion-btn') || [];
    const priceInput = document.getElementById('sellingPrice');
    if (priceButtons.length && priceInput) {
      priceButtons.forEach(btn => btn.addEventListener('click', function () {
        const val = this.dataset.price;
        if (val !== undefined) {
          priceInput.value = val;
          updateEarningsPreview();
          updatePreviewSection();
        }
      }));
    }

    // Live update binding
    const liveEls = document.querySelectorAll('#ticketListingForm input, #ticketListingForm select, #ticketListingForm textarea') || [];
    liveEls.forEach(el => {
      const eventType = ['checkbox', 'radio', 'file', 'select-one'].includes(el.type) ? 'change' : 'input';
      el.addEventListener(eventType, () => {
        updateEarningsPreview();
        updatePreviewSection();
      });
    });

    // File previews
    if (ticketInput) ticketInput.addEventListener('change', (e) => createPreview(ticketPreview, e.target.files?.[0]));
    if (proofInput) proofInput.addEventListener('change', (e) => createPreview(proofPreview, e.target.files?.[0]));

    // Hero calculator watchers
    if (heroPrice) heroPrice.addEventListener('input', updateHeroCalculator);
    if (heroQty) heroQty.addEventListener('change', updateHeroCalculator);

    // Form submission
    if (form) {
      form.addEventListener('submit', async function (e) {
        e.preventDefault();
        const submitBtn = document.getElementById('submitBtn');
        const statusHolder = document.getElementById('formStatus') || document.getElementById('statusHolder');

        if (!validateStep(currentStep)) return;

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<span class="loading-spinner"></span> Submitting...';
        }
        if (statusHolder) statusHolder.textContent = 'Preparing listing for review...';

        // Get current user (must be signed in)
        const user = auth.currentUser;
        if (!user) {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'List my tickets <i class="fas fa-check"></i>';
          }
          showToast('Please sign in before listing a ticket.', true);
          return;
        }

        // Get files and form values
        const ticketFile = ticketInput?.files?.[0] ?? null;
        const proofFile = proofInput?.files?.[0] ?? null;

        const data = {};
        form.querySelectorAll('input, select, textarea').forEach(input => {
          if (input.name && input.type !== 'file') {
            data[input.name] = input.value;
          }
        });

        try {
          // Prepare doc
          data.status = "pending";
          data.submittedAt = firebase.firestore.FieldValue.serverTimestamp();
          data.sellerUid = user.uid;
          data.sellerEmail = user.email || '';
          data.sellerName = (data.sellerName || user.displayName || (user.email ? user.email.split('@')[0] : 'Seller'));

          // Normalize numeric fields
          data.sellingPrice = parseFloat(data.sellingPrice) || 0;
          data.quantity = parseInt(data.quantity, 10) || 1;

          // Attach mock file URLs (admin expects string URLs)
          data.ticketFileUrl = createMockFileUrl(ticketFile);
          data.paymentProofUrl = createMockFileUrl(proofFile);

          // Additional safe fields (optional)
          data.eventName = data.eventName || '';
          data.venue = data.venue || '';
          data.eventCategory = data.eventCategory || '';
          data.eventDate = data.eventDate || '';
          data.eventTime = data.eventTime || '';

          // Submit to Firestore
          await listingsRef.add(data);

          if (statusHolder) statusHolder.innerHTML = `<strong style="color: var(--color-success);">Listing Submitted!</strong> Your ticket is pending review on the Admin Dashboard.`;
          showToast('Listing submitted — pending admin review.');

          // Clear UI
          if (ticketPreview) ticketPreview.innerHTML = '';
          if (proofPreview) proofPreview.innerHTML = '';
          form.reset();
          showStep(1);
        } catch (err) {
          console.error('Firebase Submission Error:', err);
          showToast(err.message || 'An error occurred during submission.', true);
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'List my tickets <i class="fas fa-check"></i>';
          }
        }
      });
    }

    // initial UI state
    showStep(currentStep);
    updateHeroCalculator();
    updateEarningsPreview();
    updatePreviewSection();
  }

  // wait DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
