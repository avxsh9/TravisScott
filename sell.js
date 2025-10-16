(function () {
    'use strict';
  
    // ===== CONFIG =====
    const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbz-fZxL0bo27SnhkFVwJKM03dqkrgtMPA7PqUX_Aj7oLvGxoUSoMUDTpmBrVnKoZSKa/exec";
    const PLATFORM_FEE_RATE = 0.00;
    const totalSteps = 4;
    let currentStep = 1;
  
    const firebaseConfig = {
      apiKey: "AIzaSyDSPYXYwrxaVTna2CfFI2EktEysXb7z5iE",
      authDomain: "ticketaddda.firebaseapp.com",
      projectId: "ticketaddda",
      storageBucket: "ticketaddda.firebasestorage.app",
      messagingSenderId: "987839286443",
      appId: "1:987839286443:web:235ed8857cd8cc8477fbee",
      measurementId: "G-EDDVKVVXHS"
    };
  
    // ===== Helpers =====
    function formatINR(num) {
      if (isNaN(num)) num = 0;
      return '₹' + Number(num).toLocaleString('en-IN', { maximumFractionDigits: 0 });
    }
  
    function readFileAsDataURL(file) {
      return new Promise((resolve, reject) => {
        if (!file) return resolve('');
        if (file.size > 50* 1024 * 1024) return reject(new Error('File too large. Max 50MB allowed.'));
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
      });
    }
  
    // ===== Firebase auth init & UI sync =====
    function initFirebaseAuth() {
      // requires firebase (compat) included on page
      if (typeof firebase === 'undefined') {
        console.warn('Firebase SDK not found (initFirebaseAuth skipped).');
        return;
      }
  
      try {
        // initialize only if not already initialized
        if (!(firebase.apps && firebase.apps.length)) {
          firebase.initializeApp(firebaseConfig);
        }
      } catch (err) {
        // if already initialized, ignore
        console.warn('Firebase init warning:', err && err.message ? err.message : err);
      }
  
      const auth = firebase.auth();
  
      // prefer LOCAL persistence
      if (auth && auth.setPersistence) {
        try {
          auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(() => { /* ignore */ });
        } catch (e) { /* ignore */ }
      }
  
      const authActions = document.getElementById('authActions'); // sign-in container
      const userMenu = document.getElementById('userMenu');       // signed-in menu container
      const userNameElm = document.getElementById('userNameElm');
      const userAvatar = document.getElementById('userAvatar');
      const logoutBtn = document.getElementById('logoutBtn');
  
      function updateUIforUser(user) {
        if (user) {
          let displayName = (user.displayName || '').trim();
          if (!displayName && user.email) displayName = user.email.split('@')[0];
          if (!displayName) displayName = 'User';
          if (authActions) authActions.style.display = 'none';
          if (userMenu) userMenu.style.display = 'flex';
          if (userNameElm) userNameElm.textContent = `Hi, ${displayName}`;
          if (userAvatar && user.photoURL) userAvatar.src = user.photoURL;
        } else {
          if (authActions) authActions.style.display = '';
          if (userMenu) userMenu.style.display = 'none';
        }
      }
  
      // listen for state changes
      auth.onAuthStateChanged(user => {
        updateUIforUser(user);
      });
  
      // wire logout
      if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
          e.preventDefault();
          auth.signOut().catch(err => console.error('Sign out failed:', err));
        });
      }
    }
  
    // ===== Main DOM logic =====
    document.addEventListener('DOMContentLoaded', function () {
      // Initialize Firebase auth UI sync
      initFirebaseAuth();
  
      // Elements
      const form = document.getElementById('ticketListingForm');
      const steps = Array.from(document.querySelectorAll('.form-step'));
      const nextBtn = document.getElementById('nextBtn');
      const prevBtn = document.getElementById('prevBtn');
      const submitBtn = document.getElementById('submitBtn');
      const progressSteps = Array.from(document.querySelectorAll('.progress-indicator .step'));
  
      // status holder
      const statusHolder = document.createElement('div');
      statusHolder.id = 'formStatus';
      const formContainer = document.querySelector('.sell-form-container');
      if (formContainer) formContainer.appendChild(statusHolder);
  
      // preview elements
      const previewPrice = document.getElementById('previewPrice');
      const previewQuantity = document.getElementById('previewQuantity');
      const previewTotal = document.getElementById('previewTotal');
      const previewFee = document.getElementById('previewFee');
      const previewEarnings = document.getElementById('previewEarnings');
      const previewEventName = document.getElementById('previewEventName');
      const previewCategory = document.getElementById('previewCategory');
      const previewEventDate = document.getElementById('previewEventDate');
      const previewVenue = document.getElementById('previewVenue');
      const previewTicketInfo = document.getElementById('previewTicketInfo');
      const previewPriceInfo = document.getElementById('previewPriceInfo');
      const previewTicketUpload = document.getElementById('previewTicketUpload');
      const previewPaymentProof = document.getElementById('previewPaymentProof');
  
      // file inputs + previews (IDs must match HTML)
      const ticketInput = document.getElementById('ticketUpload');
      const proofInput = document.getElementById('paymentProofUpload');
      const ticketPreview = document.getElementById('ticketUploadPreview');
      const proofPreview = document.getElementById('paymentProofUploadPreview');
  
      // hero calculator elements
      const heroPrice = document.getElementById('ticketPrice');
      const heroQty = document.getElementById('ticketQuantity');
      const heroTotalSaleEl = document.getElementById('totalSale');
      const heroPlatformFeeEl = document.getElementById('platformFee');
      const heroYouEarnEl = document.getElementById('youEarn');
  
      // ===== Functions =====
      function updateHeroCalculator() {
        if (!heroPrice || !heroQty) return;
        const price = parseFloat(heroPrice.value) || 0;
        const qty = parseInt(heroQty.value) || 1;
        const total = price * qty;
        const fee = Math.round(total * PLATFORM_FEE_RATE);
        const earn = total - fee;
        if (heroTotalSaleEl) heroTotalSaleEl.textContent = formatINR(total);
        if (heroPlatformFeeEl) heroPlatformFeeEl.textContent = formatINR(fee);
        if (heroYouEarnEl) heroYouEarnEl.textContent = formatINR(earn);
      }
  
      function showStep(i) {
        currentStep = i;
        steps.forEach(s => s.classList.toggle('active', parseInt(s.getAttribute('data-step')) === i));
        progressSteps.forEach(p => p.classList.toggle('active', parseInt(p.getAttribute('data-step')) <= i));
        if (prevBtn) prevBtn.style.display = i === 1 ? 'none' : 'inline-flex';
        if (nextBtn) nextBtn.style.display = i === totalSteps ? 'none' : 'inline-flex';
        if (submitBtn) submitBtn.style.display = i === totalSteps ? 'inline-flex' : 'none';
        const formEl = document.getElementById('sellForm');
        if (formEl) window.scrollTo({ top: formEl.offsetTop - 20, behavior: 'smooth' });
        updatePreviewSection();
      }
  
      function createPreview(container, file) {
        if (!container) return;
        container.innerHTML = '';
        container.style.display = file ? 'block' : 'none';
        if (!file) return;
        if (file.type && file.type.startsWith('image/')) {
          const img = document.createElement('img');
          img.src = URL.createObjectURL(file);
          img.style.maxWidth = '120px';
          container.appendChild(img);
        } else {
          const div = document.createElement('div');
          div.textContent = file.name + ' (' + Math.round(file.size / 1024) + ' KB)';
          container.appendChild(div);
        }
      }
  
      function updateEarningsPreview() {
        const sellingPrice = document.getElementById('sellingPrice');
        const quantity = document.getElementById('quantity');
        const price = parseInt(sellingPrice ? sellingPrice.value : 0) || 0;
        const qty = parseInt(quantity ? quantity.value : 0) || 0;
        const total = price * qty;
        const fee = Math.round(total * PLATFORM_FEE_RATE);
        const earnings = total - fee;
        if (previewPrice) previewPrice.textContent = formatINR(price);
        if (previewQuantity) previewQuantity.textContent = String(qty);
        if (previewTotal) previewTotal.textContent = formatINR(total);
        if (previewFee) previewFee.textContent = formatINR(fee);
        if (previewEarnings) previewEarnings.textContent = formatINR(earnings);
      }
  
      function updatePreviewSection() {
        const eventName = document.getElementById('eventName')?.value || '';
        const eventCategory = document.getElementById('eventCategory')?.value || '';
        const eventDate = document.getElementById('eventDate')?.value || '';
        const eventTime = document.getElementById('eventTime')?.value || '';
        const venue = document.getElementById('venue')?.value || '';
        const quantity = document.getElementById('quantity')?.value || '';
        const ticketSection = document.getElementById('ticketSection')?.value || '';
        const ticketRow = document.getElementById('ticketRow')?.value || '';
        const seatNumbers = document.getElementById('seatNumbers')?.value || '';
        const sellingPrice = document.getElementById('sellingPrice')?.value || '';
  
        if (previewEventName) previewEventName.textContent = eventName || 'Event Name';
        if (previewCategory) previewCategory.textContent = eventCategory || 'Category';
  
        if (eventDate) {
          const d = new Date(eventDate);
          let dateStr = d.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
          if (eventTime) dateStr += ' at ' + eventTime;
          if (previewEventDate) previewEventDate.textContent = dateStr;
        } else if (previewEventDate) previewEventDate.textContent = 'Date';
  
        if (previewVenue) previewVenue.textContent = venue || 'Venue';
  
        let ticketInfo = '';
        if (quantity) ticketInfo += quantity + ' ticket' + (parseInt(quantity) > 1 ? 's' : '');
        if (ticketSection) ticketInfo += ' • ' + ticketSection;
        if (ticketRow) ticketInfo += ' • Row ' + ticketRow;
        if (seatNumbers) ticketInfo += ' • Seats ' + seatNumbers;
        if (previewTicketInfo) previewTicketInfo.textContent = ticketInfo || 'Ticket info';
  
        if (previewPriceInfo) previewPriceInfo.textContent = sellingPrice ? (formatINR(sellingPrice) + ' per ticket') : 'Price info';
  
        if (previewTicketUpload) previewTicketUpload.textContent = ticketInput && ticketInput.files && ticketInput.files.length ? ticketInput.files[0].name : 'No ticket file provided';
        if (previewPaymentProof) previewPaymentProof.textContent = proofInput && proofInput.files && proofInput.files.length ? proofInput.files[0].name : 'No proof file provided';
  
        updateEarningsPreview();
      }
  
      function validateStep(stepNum) {
        const step = document.querySelector(`.form-step[data-step="${stepNum}"]`);
        if (!step) return true;
        let isValid = true;
        const requiredFields = step.querySelectorAll('input[required], select[required], textarea[required]');
  
        requiredFields.forEach(field => {
          field.classList.remove('error-border');
          const fieldType = (field.type || '').toLowerCase();
  
          if (fieldType === 'file') {
            if (!field.files || field.files.length === 0) {
              const label = field.parentElement && field.parentElement.querySelector('.file-upload-label');
              if (label) label.classList.add('error-border');
              isValid = false;
            }
          } else if (fieldType === 'checkbox') {
            if (!field.checked) {
              const checkmark = field.parentElement && field.parentElement.querySelector('.checkmark');
              if (checkmark) checkmark.classList.add('error-border');
              field.classList.add('error-border');
              isValid = false;
            }
          } else if (fieldType === 'radio') {
            const radios = step.querySelectorAll(`input[type="radio"][name="${field.name}"]`);
            const anyChecked = Array.from(radios).some(r => r.checked);
            if (!anyChecked) {
              radios.forEach(r => r.classList.add('error-border'));
              isValid = false;
            } else {
              radios.forEach(r => r.classList.remove('error-border'));
            }
          } else {
            if (!String(field.value || '').trim()) {
              field.classList.add('error-border');
              isValid = false;
            }
          }
        });
  
        return isValid;
      }
  
      // ===== Extras: suggestions + pricing buttons + live binding =====
      (function initExtras() {
        const eventInput = document.getElementById('eventName');
        const suggestions = document.getElementById('eventSuggestions');
        const mockEvents = [
          'Mumbai Indians vs Chennai Super Kings',
          'Royal Challengers Bangalore vs Kolkata Knight Riders',
          'Coldplay India Tour 2025',
          'Diljit Dosanjh Live Concert',
          'Sunburn Festival Goa',
          'Ed Sheeran Mumbai Concert',
          'India vs Australia Test Match'
        ];
  
        if (eventInput && suggestions) {
          eventInput.addEventListener('input', function () {
            const v = this.value.toLowerCase();
            if (v.length < 2) { suggestions.style.display = 'none'; return; }
            const matches = mockEvents.filter(m => m.toLowerCase().includes(v));
            if (!matches.length) { suggestions.style.display = 'none'; return; }
            suggestions.innerHTML = matches.map(m => `<div class="suggestion-item" data-value="${m}">${m}</div>`).join('');
            suggestions.style.display = 'block';
          });
  
          suggestions.addEventListener('click', function (e) {
            if (e.target.classList.contains('suggestion-item')) {
              eventInput.value = e.target.getAttribute('data-value');
              suggestions.style.display = 'none';
              updatePreviewSection();
            }
          });
  
          document.addEventListener('click', function (e) {
            if (!eventInput.contains(e.target) && !suggestions.contains(e.target)) suggestions.style.display = 'none';
          });
        }
  
        const buttons = document.querySelectorAll('.suggestion-btn');
        const priceInput = document.getElementById('sellingPrice');
        buttons.forEach(btn => btn.addEventListener('click', function () {
          if (priceInput) {
            priceInput.value = this.dataset.price;
            updateEarningsPreview();
            updatePreviewSection();
          }
        }));
  
        // wire inputs for live preview
        document.querySelectorAll('#ticketListingForm input, #ticketListingForm select, #ticketListingForm textarea').forEach(el => {
          el.addEventListener('input', function () { updateEarningsPreview(); updatePreviewSection(); });
          el.addEventListener('change', function () { updateEarningsPreview(); updatePreviewSection(); });
        });
  
        // hero calculator watchers
        if (heroPrice) heroPrice.addEventListener('input', updateHeroCalculator);
        if (heroQty) heroQty.addEventListener('change', updateHeroCalculator);
  
        // initial updates
        updateHeroCalculator();
        updatePreviewSection();
      })();
  
      // wire file previews
      if (ticketInput && ticketPreview) {
        ticketInput.addEventListener('change', function (e) {
          createPreview(ticketPreview, e.target.files[0]);
          const label = this.parentElement && this.parentElement.querySelector('.file-upload-label');
          if (label) label.classList.remove('error-border');
          updatePreviewSection();
        });
      }
      if (proofInput && proofPreview) {
        proofInput.addEventListener('change', function (e) {
          createPreview(proofPreview, e.target.files[0]);
          const label = this.parentElement && this.parentElement.querySelector('.file-upload-label');
          if (label) label.classList.remove('error-border');
          updatePreviewSection();
        });
      }
  
      // navigation
      if (nextBtn) nextBtn.addEventListener('click', function () {
        if (!validateStep(currentStep)) return;
        if (currentStep < totalSteps) showStep(currentStep + 1);
      });
      if (prevBtn) prevBtn.addEventListener('click', function () {
        if (currentStep > 1) showStep(currentStep - 1);
      });
  
      // submit
      if (form) {
        form.addEventListener('submit', async function (e) {
          e.preventDefault();
  
          if (!validateStep(currentStep)) return;
  
          // final validate all steps
          for (let i = 1; i <= totalSteps; i++) {
            if (!validateStep(i)) { showStep(i); return; }
          }
  
          // prepare
          statusHolder.textContent = 'Preparing submission...';
  
          const data = {
            eventName: document.getElementById('eventName')?.value || '',
            eventCategory: document.getElementById('eventCategory')?.value || '',
            eventDate: document.getElementById('eventDate')?.value || '',
            eventTime: document.getElementById('eventTime')?.value || '',
            venue: document.getElementById('venue')?.value || '',
            ticketSection: document.getElementById('ticketSection')?.value || '',
            ticketRow: document.getElementById('ticketRow')?.value || '',
            seatNumbers: document.getElementById('seatNumbers')?.value || '',
            quantity: document.getElementById('quantity')?.value || '',
            ticketType: (document.querySelector('input[name="ticketType"]:checked') || {}).value || '',
            sellingPrice: document.getElementById('sellingPrice')?.value || '',
            agreeTerms: !!document.getElementById('agreeTerms')?.checked,
            agreeTransfer: !!document.getElementById('agreeTransfer')?.checked,
            additionalNotes: ''
          };
  
          try {
            const ticketFile = ticketInput && ticketInput.files && ticketInput.files[0];
            const proofFile = proofInput && proofInput.files && proofInput.files[0];
  
            data.ticketFileData = await readFileAsDataURL(ticketFile);
            data.ticketFileName = ticketFile ? ticketFile.name : '';
            data.paymentProofData = await readFileAsDataURL(proofFile);
            data.paymentProofName = proofFile ? proofFile.name : '';
  
            // UI uploading
            statusHolder.textContent = 'Uploading — please wait...';
            if (submitBtn) {
              submitBtn.disabled = true;
              submitBtn.innerHTML = '<span class="loading-spinner"></span> Processing...';
            }
  
            // Send (no Content-Type header -> reduce preflight)
            const resp = await fetch(WEBAPP_URL, {
              method: 'POST',
              body: JSON.stringify(data)
            });
  
            const text = await resp.text();
            let json = {};
            try { json = text ? JSON.parse(text) : {}; } catch {
              throw new Error('Server returned non-JSON response: ' + text);
            }
  
            if (!resp.ok) throw new Error(json.error || `HTTP ${resp.status} ${resp.statusText}`);
  
            if (json.result === 'success') {
              statusHolder.innerHTML = `
                <strong>Submitted successfully!</strong><br>
                Ticket File: ${json.ticketFileUrl ? `<a target="_blank" href="${json.ticketFileUrl}">Open</a>` : 'None'}<br>
                Payment Proof: ${json.paymentProofUrl ? `<a target="_blank" href="${json.paymentProofUrl}">Open</a>` : 'None'}
              `;
              form.reset();
              if (ticketPreview) ticketPreview.innerHTML = '';
              if (proofPreview) proofPreview.innerHTML = '';
              showStep(1);
            } else {
              throw new Error('Server error: ' + (json.error || JSON.stringify(json)));
            }
          } catch (err) {
            console.error(err);
            statusHolder.innerHTML = `<span class="error-text">Submission failed: ${err.message}</span>`;
          } finally {
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.innerHTML = 'List my tickets <i class="fas fa-check"></i>';
            }
          }
        });
      }
  
      // initial UI
      showStep(1);
      updateHeroCalculator();
      updatePreviewSection();
    }); // DOMContentLoaded end
  
  })(); // IIFE end
  
  document.addEventListener("DOMContentLoaded", () => {
    const ticketsData = [
        {
        seller: "Rajveer Suvarna",
        price: "₹8,500/ticket",
        seat: "Silver Ground",
        concert: "Travis Scott Live in Mumbai",
        date: "18 Oct 2025"
      },
      {
        seller: "Amit Sharma",
        price: "₹15,000",
        seat: "Gold Left - Row A12",
        concert: "Travis Scott Live in India",
        date: "18 Oct 2025"
      },
      {
        seller: "Riya Patel",
        price: "₹12,500",
        seat: "Silver - Block C14",
        concert: "Travis Scott Live in India",
        date: "18 Oct 2025"
      },
      {
        seller: "Vikram Singh",
        price: "₹18,000",
        seat: "Gold Right - Row B5",
        concert: "Travis Scott Live in India",
        date: "18 Oct 2025"
      },
      {
        seller: "Kunal Verma",
        price: "₹10,000",
        seat: "Silver - Row E20",
        concert: "Travis Scott Live in India",
        date: "18 Oct 2025"
      }
    ];
  
    const ticketsContainer = document.getElementById("sellerTicketsList");
  
    ticketsData.forEach(ticket => {
      const card = document.createElement("div");
      card.classList.add("ticket-card");
      card.innerHTML = `
        <div class="ticket-header">
          <span class="seller-name">${ticket.seller}</span>
          <span class="ticket-price">${ticket.price}</span>
        </div>
        <div class="ticket-info">Seat: ${ticket.seat}</div>
        <div class="ticket-info">Concert: ${ticket.concert}</div>
        <div class="ticket-info">Date: ${ticket.date}</div>
        <a href="#" class="buy-btn">Contact Seller</a>
      `;
      ticketsContainer.appendChild(card);
    });
  });
 
    
