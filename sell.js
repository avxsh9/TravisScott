(function() {
    'use strict';

    const PLATFORM_FEE_RATE = 0.00;

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

    function formatINR(num) {
        if (isNaN(num)) num = 0;
        return '₹' + Number(num).toLocaleString('en-IN', { maximumFractionDigits: 0 });
    }

    function calculate() {
        const priceInput = document.getElementById('ticketPrice');
        const qtyInput = document.getElementById('ticketQuantity');

        if (!priceInput || !qtyInput) return;

        let price = parseInt(priceInput.value) || 0;
        let qty = parseInt(qtyInput.value) || 1;

        let totalSale = price * qty;
        const platformFee = Math.round(totalSale * PLATFORM_FEE_RATE);
        const earnings = totalSale - platformFee;

        const totalSaleEl = document.getElementById('totalSale');
        const platformFeeEl = document.getElementById('platformFee');
        const youEarnEl = document.getElementById('youEarn');

        if (totalSaleEl) totalSaleEl.textContent = formatINR(totalSale);
        if (platformFeeEl) platformFeeEl.textContent = formatINR(platformFee);
        if (youEarnEl) youEarnEl.textContent = formatINR(earnings);
    }

    function updatePreview() {
        updateEarningsPreview();
        updateListingPreview();
    }

    // INITIALIZATION
    // ==========================================
    function init() {
        console.log('🎫 TicketAdda - Initializing...');
    
        // Setup Firebase Auth UI first
        setupAuthUI();
  
        // Render original page content
        renderTickets();
        renderTestimonials();
        renderFAQ();
    
        // Start original page timers
        startCountdown();
        startTestimonialCarousel();
    
        // Bind original page events
        bindEvents();
    
        // Handle original mobile CTA
        handleMobileStickyCTA();
    
        console.log('✅ TicketAdda - Ready!');
      }

    function updateEarningsPreview() {
        const price = parseInt(formData.sellingPrice) || 0;
        const qty = parseInt(formData.quantity) || 0;

        let totalSale = price * qty;
        const fee = Math.round(totalSale * PLATFORM_FEE_RATE);
        const earnings = totalSale - fee;

        const previewPrice = document.getElementById('previewPrice');
        const previewQuantity = document.getElementById('previewQuantity');
        const previewTotal = document.getElementById('previewTotal');
        const previewFee = document.getElementById('previewFee');
        const previewEarnings = document.getElementById('previewEarnings');

        if (previewPrice) previewPrice.textContent = formatINR(price);
        if (previewQuantity) previewQuantity.textContent = String(qty);
        if (previewTotal) previewTotal.textContent = formatINR(totalSale);
        if (previewFee) previewFee.textContent = formatINR(fee);
        if (previewEarnings) previewEarnings.textContent = formatINR(earnings);
    }

    function updateListingPreview() {
        const previewEventName = document.getElementById('previewEventName');
        const previewCategory = document.getElementById('previewCategory');
        const previewEventDate = document.getElementById('previewEventDate');
        const previewVenue = document.getElementById('previewVenue');
        const previewTicketInfo = document.getElementById('previewTicketInfo');
        const previewPriceInfo = document.getElementById('previewPriceInfo');

        if (previewEventName) previewEventName.textContent = formData.eventName || 'Event Name';
        if (previewCategory) previewCategory.textContent = formData.eventCategory || 'Category';

        if (formData.eventDate) {
            const d = new Date(formData.eventDate);
            const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            let dateStr = d.toLocaleDateString('en-IN', opts);
            if (formData.eventTime) dateStr += ' at ' + formData.eventTime;
            if (previewEventDate) previewEventDate.textContent = dateStr;
        } else {
            if (previewEventDate) previewEventDate.textContent = 'Date';
        }

        if (previewVenue) previewVenue.textContent = formData.venue || 'Venue';

        let ticketInfo = '';
        if (formData.quantity) ticketInfo += `${formData.quantity} ticket${formData.quantity > 1 ? 's' : ''}`;
        if (formData.ticketSection) ticketInfo += ` • ${formData.ticketSection}`;
        if (formData.ticketRow) ticketInfo += ` • Row ${formData.ticketRow}`;
        if (formData.seatNumbers) ticketInfo += ` • Seats ${formData.seatNumbers}`;
        if (previewTicketInfo) previewTicketInfo.textContent = ticketInfo || 'Ticket info';

        const price = parseInt(formData.sellingPrice) || 0;
        const qty = parseInt(formData.quantity) || 1;
        let total = price * qty;
        if (previewPriceInfo) previewPriceInfo.textContent = `${formatINR(price)} per ticket • Total: ${formatINR(total)}`;
    }

    function validateCurrentStep() {
        const currentFormStep = document.querySelector(`.form-step[data-step="${currentStep}"]`);
        if (!currentFormStep) return true;

        const required = currentFormStep.querySelectorAll('input[required], select[required]');
        let ok = true;

        required.forEach(inp => {
            inp.classList.remove('error-border');
            const parentLabel = inp.closest('.file-upload-wrapper');
            if (parentLabel) {
                const label = parentLabel.querySelector('.file-upload-label');
                if (label) label.classList.remove('error-border');
            }
            const checkmarkParent = inp.parentElement;
            if (checkmarkParent) {
                const checkmark = checkmarkParent.querySelector('.checkmark');
                if (checkmark) checkmark.classList.remove('error-border');
            }

            if (inp.type === 'checkbox') {
                if (!inp.checked) {
                    const checkmark = inp.parentElement.querySelector('.checkmark');
                    if (checkmark) checkmark.classList.add('error-border');
                    ok = false;
                }
            } else if (inp.type === 'file') {
                if (!inp.files || !inp.files.length) {
                    const label = inp.parentElement.querySelector('.file-upload-label');
                    if (label) label.classList.add('error-border');
                    ok = false;
                }
            } else {
                if (!String(inp.value || '').trim()) {
                    inp.classList.add('error-border');
                    ok = false;
                }
            }
        });

        return ok;
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
        const steps = document.querySelectorAll('.form-step');
        steps.forEach(s => {
            const stepNum = parseInt(s.getAttribute('data-step'));
            s.classList.toggle('active', stepNum === currentStep);
        });

        const indicators = document.querySelectorAll('.progress-indicator .step');
        indicators.forEach(ind => {
            const stepNum = parseInt(ind.getAttribute('data-step'));
            ind.classList.toggle('active', stepNum <= currentStep);
        });

        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const submitBtn = document.getElementById('submitBtn');

        if (prevBtn) prevBtn.style.display = currentStep === 1 ? 'none' : 'inline-flex';
        if (nextBtn) nextBtn.style.display = currentStep === totalSteps ? 'none' : 'inline-flex';
        if (submitBtn) submitBtn.style.display = currentStep === totalSteps ? 'inline-flex' : 'none';

        if (currentStep === totalSteps) {
            populateReview();
        }
    }

    function populateReview() {
        updateListingPreview();
        updateEarningsPreview();

        const ticketUpload = document.getElementById('ticketUpload');
        const paymentProofUpload = document.getElementById('paymentProofUpload');
        const previewTicketUpload = document.getElementById('previewTicketUpload');
        const previewPaymentProof = document.getElementById('previewPaymentProof');

        if (ticketUpload && previewTicketUpload) {
            previewTicketUpload.textContent = ticketUpload.files && ticketUpload.files.length ? ticketUpload.files[0].name : 'No file provided';
        }

        if (paymentProofUpload && previewPaymentProof) {
            previewPaymentProof.textContent = paymentProofUpload.files && paymentProofUpload.files.length ? paymentProofUpload.files[0].name : 'No file provided';
        }
    }

    function handleSubmit(e) {
        e.preventDefault();
        if (!validateCurrentStep()) return;

        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) {
            submitBtn.innerHTML = '<span class="loading-spinner"></span> Processing...';
            submitBtn.disabled = true;

            setTimeout(() => {
                alert('Tickets listed successfully! Thank you for using TicketAdda.');
                window.location.reload();
            }, 1500);
        }
    }

    function setupFileUpload(inputId, previewId) {
        const input = document.getElementById(inputId);
        const preview = document.getElementById(previewId);

        if (!input || !preview) return;

        input.addEventListener('change', function() {
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

    function escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    function initializeEventSuggestions() {
        const eventInput = document.getElementById('eventName');
        const suggestions = document.getElementById('eventSuggestions');

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

        eventInput.addEventListener('input', function() {
            const value = this.value.toLowerCase();
            if (value.length < 2) {
                suggestions.style.display = 'none';
                return;
            }
            const matches = mockEvents.filter(event => event.toLowerCase().includes(value));
            if (matches.length === 0) {
                suggestions.style.display = 'none';
                return;
            }
            suggestions.innerHTML = matches.map(event => `<div class="suggestion-item" data-value="${escapeHtml(event)}">${escapeHtml(event)}</div>`).join('');
            suggestions.style.display = 'block';
        });

        suggestions.addEventListener('click', function(e) {
            if (e.target.classList.contains('suggestion-item')) {
                const value = e.target.getAttribute('data-value');
                eventInput.value = value;
                formData.eventName = value;
                suggestions.style.display = 'none';
                updatePreview();
            }
        });

        document.addEventListener('click', function(e) {
            if (!eventInput.contains(e.target) && !suggestions.contains(e.target)) {
                suggestions.style.display = 'none';
            }
        });
    }

    function initializePricingSuggestions() {
        const buttons = document.querySelectorAll('.suggestion-btn');
        const priceInput = document.getElementById('sellingPrice');

        if (!priceInput) return;

        buttons.forEach(btn => {
            btn.addEventListener('click', function() {
                const price = this.getAttribute('data-price');
                priceInput.value = price;
                formData.sellingPrice = price;
                updatePreview();
            });
        });
    }

    function addFormInputListeners() {
        const form = document.getElementById('ticketListingForm');
        if (!form) return;

        form.addEventListener('input', function(e) {
            const target = e.target;
            if (target.name) {
                if (target.type === 'checkbox') {
                    formData[target.name] = target.checked;
                } else if (target.type === 'radio') {
                    if (target.checked) formData[target.name] = target.value;
                } else {
                    formData[target.name] = target.value;
                }
                updatePreview();
            }
        });
    }

    window.scrollToForm = function() {
        const form = document.getElementById('sellForm');
        if (form) {
            form.scrollIntoView({ behavior: 'smooth' });
        }
    };

    document.addEventListener('DOMContentLoaded', function() {
        calculate();

        const ticketPriceInput = document.getElementById('ticketPrice');
        const ticketQuantityInput = document.getElementById('ticketQuantity');

        if (ticketPriceInput) ticketPriceInput.addEventListener('input', calculate);
        if (ticketQuantityInput) ticketQuantityInput.addEventListener('change', calculate);

        const form = document.getElementById('ticketListingForm');
        const nextBtn = document.getElementById('nextBtn');
        const prevBtn = document.getElementById('prevBtn');

        if (form) form.addEventListener('submit', handleSubmit);
        if (nextBtn) nextBtn.addEventListener('click', nextStep);
        if (prevBtn) prevBtn.addEventListener('click', prevStep);

        addFormInputListeners();
        initializeEventSuggestions();
        initializePricingSuggestions();
        setupFileUpload('ticketUpload', 'ticketUploadPreview');
        setupFileUpload('paymentProofUpload', 'paymentProofUploadPreview');
        updateStepDisplay();
    });
})();


// --- Firebase auth UI fix for multi-page app ---
// Paste this at top of sell.js (AFTER firebase scripts are loaded)
// It will: set persistence (LOCAL), listen onAuthStateChanged and toggle header UI.
// Make sure firebaseConfig matches the one you use on index.html.

(function() {
    // if firebase not loaded -> bail
    if (typeof firebase === 'undefined' || !firebase.apps) {
      console.warn('Firebase SDK not found on this page. Include firebase-app & firebase-auth scripts.');
      return;
    }
  
    // safe init: if already initialized, reuse
    const firebaseConfig = {
      apiKey: "AIzaSyDSPYXYwrxaVTna2CfFI2EktEysXb7z5iE",
      authDomain: "ticketaddda.firebaseapp.com",
      projectId: "ticketaddda",
      storageBucket: "ticketaddda.firebasestorage.app",
      messagingSenderId: "987839286443",
      appId: "1:987839286443:web:235ed8857cd8cc8477fbee",
      measurementId: "G-EDDVKVVXHS"
    };
    try {
      if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    } catch (err) {
      // ignore "already exists"
    }
  
    const auth = firebase.auth();
  
    // Enforce LOCAL persistence so user stays signed in across tabs/sessions
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(err => {
      console.warn('Could not set auth persistence:', err);
    });
  
    // selectors used by JS on index.html — adjust if your sell.html uses different IDs/classes
    const authActions = document.getElementById('authActions');      // container with Sign in link
    const userMenu = document.getElementById('userMenu');            // container shown when signed in
    const userNameElm = document.getElementById('userNameElm');      // text node for username
    const userAvatar = document.getElementById('userAvatar');        // img for avatar
    const logoutBtn = document.getElementById('logoutBtn');          // logout button
    const mobileNav = document.getElementById('mobileNav');          // mobile nav container (optional)
  
    // update header UI based on firebase user
    function updateUIforUser(user) {
      if (user) {
        // display name fallback logic
        let displayName = (user.displayName || '').trim();
        if (!displayName && user.email) displayName = user.email.split('@')[0];
        if (!displayName) displayName = 'User';
  
        if (authActions) authActions.style.display = 'none';
        if (userMenu) userMenu.style.display = 'flex';
        if (userNameElm) userNameElm.textContent = `Hi, ${displayName}`;
        if (userAvatar && user.photoURL) userAvatar.src = user.photoURL;
  
        // mobile nav: add logout link if not present
        if (mobileNav) {
          let existing = mobileNav.querySelector('.mobile-auth-link');
          if (existing) existing.remove();
          const mobileLogout = document.createElement('a');
          mobileLogout.href = '#';
          mobileLogout.className = 'mobile-nav-link mobile-auth-link';
          mobileLogout.textContent = 'Logout';
          mobileLogout.addEventListener('click', (e)=>{ e.preventDefault(); auth.signOut(); });
          mobileNav.appendChild(mobileLogout);
        }
      } else {
        // signed out UI
        if (authActions) authActions.style.display = 'flex';
        if (userMenu) userMenu.style.display = 'none';
  
        if (mobileNav) {
          let existing = mobileNav.querySelector('.mobile-auth-link');
          if (existing) existing.remove();
          const loginLink = document.createElement('a');
          loginLink.href = 'login.html';
          loginLink.className = 'mobile-nav-link mobile-auth-link';
          loginLink.textContent = 'Sign In';
          mobileNav.appendChild(loginLink);
        }
      }
    }
  
    // listen for auth changes on this page
    auth.onAuthStateChanged(user => {
      updateUIforUser(user);
  
      // optional: if we stored a redirect target before signin, go there now
      const postSignIn = localStorage.getItem('postSignInRedirect');
      if (user && postSignIn) {
        localStorage.removeItem('postSignInRedirect');
        // if current page is different than stored, redirect
        if (window.location.pathname !== postSignIn) {
          window.location.href = postSignIn;
        }
      }
    });
  
    // wire logout button if present
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        auth.signOut().catch(err => console.error('Sign out failed:', err));
      });
    }
  
    // OPTIONAL helper: before sending user to sign-in page, save current path
    // Usage on your sign-in trigger: localStorage.setItem('postSignInRedirect', window.location.pathname);
    // Then redirect to login.html / start redirect flow.
    window.savePostSignInRedirect = function() {
      try { localStorage.setItem('postSignInRedirect', window.location.pathname); } catch(e){/* ignore */ }
    };
  
  })();
  