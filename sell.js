(function () {
    'use strict';
  
    // ===== CONFIG =====
    const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbxYpYj4c_6SPuXjEOTUlbbpW5iHZlMJX40har2NJnoAYYhRukDMEPrIbzofbEEz_cIG/exec";
    const PLATFORM_FEE_RATE = 0.00; // Currently 0%
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
        // Increased max file size check to 50MB as per previous code context
        if (file.size > 50 * 1024 * 1024) return reject(new Error('File too large. Max 50MB allowed.'));
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
      });
    }

    // ===== Firebase auth init & UI sync =====
    function initFirebaseAuth() {
      if (typeof firebase === 'undefined') {
        console.warn('Firebase SDK not found (initFirebaseAuth skipped).');
        // If Firebase is missing, maybe default to showing login wall?
        const loginWall = document.getElementById('loginWall');
        const sellPageContent = document.getElementById('sellPageContent');
        if (loginWall) loginWall.style.display = 'block';
        if (sellPageContent) sellPageContent.style.display = 'none';
        return;
      }
  
      try {
        if (!(firebase.apps && firebase.apps.length)) {
          firebase.initializeApp(firebaseConfig);
        }
      } catch (err) {
        console.warn('Firebase init warning:', err && err.message ? err.message : err);
      }
  
      const auth = firebase.auth();
  
      if (auth && auth.setPersistence) {
        try {
          auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(() => { /* ignore */ });
        } catch (e) { /* ignore */ }
      }
  
      const authActions = document.getElementById('authActions');
      const userMenu = document.getElementById('userMenu');
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
     
      // ===== THIS IS THE CORE LOGIC =====
      auth.onAuthStateChanged(user => {
        // 1. Update Header
        updateUIforUser(user);

        // 2. Control Page Content Visibility
        const loginWall = document.getElementById('loginWall');
        const sellPageContent = document.getElementById('sellPageContent');

        if (user) {
            // --- USER IS LOGGED IN ---
            // Show the form, hide the login message
            if (loginWall) loginWall.style.display = 'none';
            if (sellPageContent) sellPageContent.style.display = 'block';
        } else {
            // --- USER IS LOGGED OUT ---
            // Show the login message, hide the form
            if (loginWall) loginWall.style.display = 'block';
            if (sellPageContent) sellPageContent.style.display = 'none';
        }
      });
      // ===== LOGIC ENDS HERE =====

      // wire logout
      if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
          e.preventDefault();
          auth.signOut().catch(err => console.error('Sign out failed:', err));
        });
      }
    }
  
    // ===== Main DOM logic (Form handling, etc.) =====
    document.addEventListener('DOMContentLoaded', function () {
      // Initialize Firebase auth (this will handle showing/hiding content)
      initFirebaseAuth();
  
      // Elements (only needed if user is logged in, but we wire them anyway)
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
  
      // file inputs + previews
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
  
      // ===== Functions (Form related) =====
      function updateHeroCalculator() {
        if (!heroPrice || !heroQty) return;
        const price = parseFloat(heroPrice.value) || 0;
        const qty = parseInt(heroQty.value) || 1;
        const total = price * qty;
        const fee = Math.round(total * PLATFORM_FEE_RATE); // Use 0 fee rate
        const earn = total - fee;
        if (heroTotalSaleEl) heroTotalSaleEl.textContent = formatINR(total);
        if (heroPlatformFeeEl) heroPlatformFeeEl.textContent = formatINR(fee); // Will show ₹0
        if (heroYouEarnEl) heroYouEarnEl.textContent = formatINR(earn); // Will show total
      }
  
      function showStep(i) {
        currentStep = i;
        steps.forEach(s => s.classList.toggle('active', parseInt(s.getAttribute('data-step')) === i));
        progressSteps.forEach(p => p.classList.toggle('active', parseInt(p.getAttribute('data-step')) <= i));
        if (prevBtn) prevBtn.style.display = i === 1 ? 'none' : 'inline-flex';
        if (nextBtn) nextBtn.style.display = i === totalSteps ? 'none' : 'inline-flex';
        if (submitBtn) submitBtn.style.display = i === totalSteps ? 'inline-flex' : 'none';
        const formEl = document.getElementById('sellForm');
        if (formEl) window.scrollTo({ top: formEl.offsetTop - 80, behavior: 'smooth' }); // Adjusted offset
        updatePreviewSection();
      }
  
      function createPreview(container, file) {
        if (!container) return;
        container.innerHTML = ''; // Clear previous preview
        container.style.display = file ? 'flex' : 'none'; // Use flex for alignment
        if (!file) return;

        const icon = document.createElement('i');
        icon.className = 'fas fa-check-circle'; // Success icon
        icon.style.color = 'var(--color-success)';
        icon.style.marginRight = '8px';

        const text = document.createElement('span');
        text.textContent = file.name + ' (' + Math.round(file.size / 1024) + ' KB)';
        
        container.appendChild(icon);
        container.appendChild(text);

        // Removed image preview generation to simplify and use consistent text format
      }
  
      function updateEarningsPreview() {
        const sellingPrice = document.getElementById('sellingPrice');
        const quantity = document.getElementById('quantity');
        const price = parseInt(sellingPrice ? sellingPrice.value : 0) || 0;
        const qty = parseInt(quantity ? quantity.value : 0) || 0;
        const total = price * qty;
        const fee = Math.round(total * PLATFORM_FEE_RATE); // Use 0 fee rate
        const earnings = total - fee;
        if (previewPrice) previewPrice.textContent = formatINR(price);
        if (previewQuantity) previewQuantity.textContent = String(qty);
        if (previewTotal) previewTotal.textContent = formatINR(total);
        if (previewFee) previewFee.textContent = formatINR(fee); // Shows ₹0
        if (previewEarnings) previewEarnings.textContent = formatINR(earnings); // Shows total
      }
  
      function updatePreviewSection() {
        // Ensure elements exist before accessing .value
        const eventName = document.getElementById('eventName')?.value || '';
        const eventCategory = document.getElementById('eventCategory')?.value || '';
        const eventDate = document.getElementById('eventDate')?.value || '';
        const eventTime = document.getElementById('eventTime')?.value || '';
        const venue = document.getElementById('venue')?.value || '';
        const quantity = document.getElementById('quantity')?.value || '';
        const ticketSection = document.getElementById('ticketSection')?.value || '';
        const ticketRow = document.getElementById('ticketRow')?.value || ''; // Phone Number
        const ticketemail = document.getElementById('ticketemail')?.value || ''; // Email
        const seatNumbers = document.getElementById('seatNumbers')?.value || ''; // Seller Name
        const sellingPrice = document.getElementById('sellingPrice')?.value || '';
  
        if (previewEventName) previewEventName.textContent = eventName || 'Event Name';
        if (previewCategory) {
           previewCategory.textContent = eventCategory || 'Category';
           // Add a class based on category for potential styling
           previewCategory.className = 'preview-category'; // Reset class
           if(eventCategory) {
               previewCategory.classList.add(`category-${eventCategory.toLowerCase()}`);
           }
        }
  
        if (eventDate) {
          try {
              const d = new Date(eventDate + 'T00:00:00'); // Ensure it's treated as local date
              let dateStr = d.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
              if (eventTime) {
                 // Format time nicely
                 let [hours, minutes] = eventTime.split(':');
                 let ampm = hours >= 12 ? 'PM' : 'AM';
                 hours = hours % 12;
                 hours = hours ? hours : 12; // Handle midnight
                 dateStr += ` at ${hours}:${minutes} ${ampm}`;
              }
              if (previewEventDate) previewEventDate.textContent = dateStr;
          } catch (e) {
              if (previewEventDate) previewEventDate.textContent = 'Invalid Date';
          }
        } else if (previewEventDate) previewEventDate.textContent = 'Date';
  
        if (previewVenue) previewVenue.textContent = venue || 'Venue';
  
        let ticketInfo = '';
        if (quantity) ticketInfo += quantity + ' ticket' + (parseInt(quantity) > 1 ? 's' : '');
        if (ticketSection) ticketInfo += (ticketInfo ? ' • ' : '') + ticketSection;
        // Combine Phone, Email, Seller Name under Ticket Info for brevity in preview
        if (ticketRow) ticketInfo += (ticketInfo ? ' • 📞 ' : '📞 ') + ticketRow;
        if (ticketemail) ticketInfo += (ticketInfo ? ' • 📧 ' : '📧 ') + ticketemail;
        if (seatNumbers) ticketInfo += (ticketInfo ? ' • 👤 ' : '👤 ') + seatNumbers;

        if (previewTicketInfo) previewTicketInfo.textContent = ticketInfo || 'Ticket info';
  
        if (previewPriceInfo) previewPriceInfo.textContent = sellingPrice ? (formatINR(sellingPrice) + ' per ticket') : 'Price info';
  
        if (previewTicketUpload) previewTicketUpload.textContent = ticketInput?.files?.length ? ticketInput.files[0].name : 'No ticket file provided';
        if (previewPaymentProof) previewPaymentProof.textContent = proofInput?.files?.length ? proofInput.files[0].name : 'No proof file provided';
  
        updateEarningsPreview();
      }
  
      function validateStep(stepNum) {
        const step = document.querySelector(`.form-step[data-step="${stepNum}"]`);
        if (!step) return true;
        let isValid = true;
        const requiredFields = step.querySelectorAll('input[required], select[required], textarea[required]');
  
        requiredFields.forEach(field => {
          // Reset error states first
          field.classList.remove('error-border');
          const parentWrapper = field.closest('.input-wrapper, .price-input-wrapper, .file-upload-wrapper, .checkbox-wrapper');
          if(parentWrapper) parentWrapper.classList.remove('error-border');
          const fileLabel = field.type === 'file' ? field.parentElement?.querySelector('.file-upload-label') : null;
          if(fileLabel) fileLabel.classList.remove('error-border');
          const checkmark = field.type === 'checkbox' ? field.parentElement?.querySelector('.checkmark') : null;
           if(checkmark) checkmark.classList.remove('error-border');

          const fieldType = (field.type || field.tagName).toLowerCase();
          let value = (field.value || '').trim();

          let hasError = false;
  
          if (fieldType === 'file') {
            if (!field.files || field.files.length === 0) hasError = true;
          } else if (fieldType === 'checkbox') {
            if (!field.checked) hasError = true;
          } else if (fieldType === 'radio') {
             // Validation for radio is handled implicitly by browser/required attribute normally.
             // If needed, check if any radio in the group is checked.
             const radioGroup = step.querySelectorAll(`input[type="radio"][name="${field.name}"]`);
             if (!Array.from(radioGroup).some(r => r.checked)) hasError = true;
          } else if (fieldType === 'select' || fieldType === 'select-one') {
             if (!value) hasError = true; // Check if a selection is made
          } else { // Text, email, tel, date, time, number etc.
            if (!value) hasError = true;
            // Add specific type validations if needed (e.g., email format)
            if (fieldType === 'email' && value && !/^\S+@\S+\.\S+$/.test(value)) hasError = true;
            if (fieldType === 'tel' && value && !/^\+?[0-9\s-()]{7,}$/.test(value)) hasError = true; // Basic phone check
            if (fieldType === 'number' && field.min && parseFloat(value) < parseFloat(field.min)) hasError = true;
            if (fieldType === 'number' && field.max && parseFloat(value) > parseFloat(field.max)) hasError = true;
          }

          if (hasError) {
              isValid = false;
              field.classList.add('error-border');
              // Add error class to specific wrappers for better visual feedback
              if(parentWrapper) parentWrapper.classList.add('error-border');
              if(fileLabel) fileLabel.classList.add('error-border');
              if(checkmark) checkmark.classList.add('error-border');
          }
        });
  
        return isValid;
      }
  
      // ===== Extras: suggestions + pricing buttons + live binding =====
      (function initExtras() {
        const eventInput = document.getElementById('eventName');
        const suggestions = document.getElementById('eventSuggestions');
        const mockEvents = [ // Example list
          'Mumbai Indians vs Chennai Super Kings', 'IPL Final 2025',
          'Coldplay Live in Mumbai', 'Arijit Singh Concert Delhi',
          'Sunburn Goa 2025', 'India vs England Cricket Match',
          'Theatre Play: Mughal-e-Azam'
        ];
  
        if (eventInput && suggestions) {
          eventInput.addEventListener('input', function () {
            const query = this.value.toLowerCase().trim();
            if (query.length < 2) { suggestions.style.display = 'none'; return; }
            const matches = mockEvents.filter(m => m.toLowerCase().includes(query));
            suggestions.innerHTML = matches.map(m => `<div class="suggestion-item" data-value="${m}">${m}</div>`).join('');
            suggestions.style.display = matches.length ? 'block' : 'none';
          });
          suggestions.addEventListener('click', function (e) {
            if (e.target.classList.contains('suggestion-item')) {
              eventInput.value = e.target.getAttribute('data-value');
              suggestions.style.display = 'none';
              updatePreviewSection(); // Update preview when suggestion selected
            }
          });
          document.addEventListener('click', (e) => { // Hide on outside click
            if (!eventInput.contains(e.target) && !suggestions.contains(e.target)) {
              suggestions.style.display = 'none';
            }
          });
        }
  
        // Pricing suggestion buttons
        const priceButtons = document.querySelectorAll('.suggestion-btn');
        const priceInput = document.getElementById('sellingPrice');
        priceButtons.forEach(btn => btn.addEventListener('click', function () {
          if (priceInput) {
            priceInput.value = this.dataset.price;
            updateEarningsPreview(); // Update dependent previews
            updatePreviewSection();
          }
        }));
  
        // Wire ALL form inputs for live preview updates
        const formInputs = document.querySelectorAll('#ticketListingForm input, #ticketListingForm select, #ticketListingForm textarea');
        formInputs.forEach(el => {
            // Use 'input' for text fields, 'change' for selects, files, checkboxes, radios
            const eventType = ['checkbox', 'radio', 'file', 'select-one'].includes(el.type) ? 'change' : 'input';
            el.addEventListener(eventType, () => {
                updateEarningsPreview(); // Update earnings part of preview
                updatePreviewSection(); // Update general preview
            });
        });
  
        // Hero calculator watchers
        if (heroPrice) heroPrice.addEventListener('input', updateHeroCalculator);
        if (heroQty) heroQty.addEventListener('change', updateHeroCalculator);
  
        // Initial calculations and preview population
        updateHeroCalculator();
        updatePreviewSection();
      })();
  
      // Wire file input changes to preview function
      if (ticketInput && ticketPreview) {
        ticketInput.addEventListener('change', function (e) {
          createPreview(ticketPreview, e.target.files[0]);
          const label = this.parentElement?.querySelector('.file-upload-label');
          if (label) label.classList.remove('error-border'); // Remove error on file select
          updatePreviewSection(); // Update main preview
        });
      }
      if (proofInput && proofPreview) {
        proofInput.addEventListener('change', function (e) {
          createPreview(proofPreview, e.target.files[0]);
          const label = this.parentElement?.querySelector('.file-upload-label');
           if (label) label.classList.remove('error-border'); // Remove error on file select
          updatePreviewSection(); // Update main preview
        });
      }
  
      // Navigation Button Logic
      if (nextBtn) nextBtn.addEventListener('click', function () {
        if (!validateStep(currentStep)) return; // Validate before proceeding
        
        // No login check needed here anymore, page content is already gated
        
        if (currentStep < totalSteps) {
          showStep(currentStep + 1);
        }
      });

      if (prevBtn) prevBtn.addEventListener('click', function () {
        if (currentStep > 1) {
          showStep(currentStep - 1);
        }
      });
  
      // Form Submission Logic
      if (form) {
        form.addEventListener('submit', async function (e) {
          e.preventDefault(); // Prevent default browser submission
  
          // Final validation of the current (last) step
          if (!validateStep(currentStep)) return; 
          
          // No login check needed here anymore

          // Optional: Re-validate all steps just before submission (belt-and-suspenders)
          for (let i = 1; i <= totalSteps; i++) {
            if (!validateStep(i)) {
               showStep(i); // Go to the first invalid step
               console.warn(`Validation failed at step ${i} before submission.`);
               return;
            }
          }
  
          // --- Submission Preparation ---
          statusHolder.textContent = 'Preparing submission...';
          statusHolder.style.color = 'var(--color-text-secondary)'; // Neutral color
          if (submitBtn) {
              submitBtn.disabled = true;
              submitBtn.innerHTML = '<span class="loading-spinner"></span> Processing...';
          }
  
          // Gather form data
          const data = {
            eventName: document.getElementById('eventName')?.value || '',
            eventCategory: document.getElementById('eventCategory')?.value || '',
            eventDate: document.getElementById('eventDate')?.value || '',
            eventTime: document.getElementById('eventTime')?.value || '',
            venue: document.getElementById('venue')?.value || '',
            ticketSection: document.getElementById('ticketSection')?.value || '', // Section/Category
            ticketRow: document.getElementById('ticketRow')?.value || '', // Phone
            ticketemail: document.getElementById('ticketemail')?.value || '', // Email
            seatNumbers: document.getElementById('seatNumbers')?.value || '', // Seller Name
            quantity: document.getElementById('quantity')?.value || '',
            ticketType: document.querySelector('input[name="ticketType"]:checked')?.value || '',
            sellingPrice: document.getElementById('sellingPrice')?.value || '',
            agreeTerms: document.getElementById('agreeTerms')?.checked || false,
            agreeTransfer: document.getElementById('agreeTransfer')?.checked || false,
            // additionalNotes: document.getElementById('additionalNotes')?.value || '' // If you add an additional notes field
          };
  
          try {
            // Read files as Base64 data URLs
            const ticketFile = ticketInput?.files?.[0];
            const proofFile = proofInput?.files?.[0];
  
            // Use Promise.all for potentially faster file reading
            const [ticketFileData, paymentProofData] = await Promise.all([
                readFileAsDataURL(ticketFile),
                readFileAsDataURL(proofFile)
            ]);

            data.ticketFileData = ticketFileData;
            data.ticketFileName = ticketFile ? ticketFile.name : '';
            data.paymentProofData = paymentProofData;
            data.paymentProofName = proofFile ? proofFile.name : '';
  
            // --- Send data to Google Apps Script ---
            statusHolder.textContent = 'Uploading data, please wait...';
            
            const resp = await fetch(WEBAPP_URL, {
              redirect: "follow", // Important for Apps Script web apps
              method: 'POST',
              body: JSON.stringify(data),
              headers: {
                "Content-Type": "text/plain;charset=utf-8", // Required for Apps Script POST
              },
            });
  
            // --- Process Response ---
            const textResponse = await resp.text();
            let jsonResult = {};
            try {
                jsonResult = JSON.parse(textResponse);
            } catch (parseError) {
                console.error("Failed to parse server response:", textResponse);
                throw new Error('Server returned an invalid response. Please try again.');
            }

            if (!resp.ok) { // Check HTTP status
                 throw new Error(jsonResult.error || `Server error: ${resp.status}`);
            }
  
            if (jsonResult.result === 'success') {
              statusHolder.innerHTML = `
                <strong style="color: var(--color-success);">Listing submitted successfully!</strong><br>
                It will be reviewed and posted shortly.`;
              // Reset form and UI
              form.reset();
              if (ticketPreview) ticketPreview.style.display = 'none'; // Hide previews
              if (proofPreview) proofPreview.style.display = 'none';
              showStep(1); // Go back to the first step
              // Optionally scroll to top
              window.scrollTo({ top: 0, behavior: 'smooth'});
            } else {
              // Handle specific errors from Apps Script if provided
              throw new Error(jsonResult.error || 'An unknown error occurred on the server.');
            }
          } catch (err) {
            // Display error message to user
            console.error('Submission Error:', err);
            statusHolder.innerHTML = `<strong style="color: var(--color-error);">Submission Failed:</strong> ${err.message}`;
          } finally {
            // Re-enable submit button regardless of success or failure
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.innerHTML = 'List my tickets <i class="fas fa-check"></i>';
            }
          }
        });
      }
  
      // Initial UI setup (Show step 1, calculate initial values)
      showStep(1);
      updateHeroCalculator();
      updatePreviewSection(); // Populate preview initially

    }); // DOMContentLoaded end
  
})(); // IIFE end

