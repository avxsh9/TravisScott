/**
 * TicketAdda - Travis Scott Concert Landing Page
 * Vanilla JavaScript - ES6+ Module Pattern
 * All interactive functionality including filters, countdown, modal, FOMO notifications
 * + Firebase Authentication Integration for Persistent Login
 */

(function () {
  'use strict';

  // ==========================================
  // FIREBASE AUTHENTICATION SETUP
  // ==========================================

  // --- IMPORTANT: Replace with your actual Firebase project configuration ---
  // You can find this in your Firebase project settings.
  const firebaseConfig = {
    apiKey: "AIzaSyDSPYXYwrxaVTna2CfFI2EktEysXb7z5iE",
    authDomain: "ticketaddda.firebaseapp.com",
    projectId: "ticketaddda",
    storageBucket: "ticketaddda.firebasestorage.app",
    messagingSenderId: "987839286443",
    appId: "1:987839286443:web:235ed8857cd8cc8477fbee",
    measurementId: "G-EDDVKVVXHS"
  };

  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  const db = firebase.firestore();

  /**
   * Manages the user interface changes based on the user's authentication state.
   * This is the core function for handling the sign-in, sign-out, and user info display.
   */
  function setupAuthUI() {
    const authActions = document.getElementById('authActions');
    const userMenu = document.getElementById('userMenu');
    const userNameElm = document.getElementById('userNameElm');
    const userAvatar = document.getElementById('userAvatar');
    const logoutBtn = document.getElementById('logoutBtn');
    const mobileNav = document.getElementById('mobileNav');

    // Set persistence to LOCAL to keep the user logged in across browser sessions.[1, 2, 3]
    // This is the key to making the login "stick" until the user explicitly signs out.
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
      .then(() => {
        console.log('Firebase auth persistence set to LOCAL.');

        // onAuthStateChanged is the recommended real-time listener for auth state.[4, 5]
        // It triggers on sign-in, sign-out, and page load.
        auth.onAuthStateChanged(async (user) => {
          if (user) {
            // --- USER IS SIGNED IN ---
            let displayName = (user.displayName || '').trim();

            // Fallback 1: Try to get full name from Firestore collection 'users'
            if (!displayName) {
              try {
                const userDoc = await db.collection('users').doc(user.uid).get();
                if (userDoc.exists) {
                  displayName = userDoc.data().fullName || '';
                }
              } catch (err) {
                console.warn('Failed to read user document from Firestore:', err);
              }
            }

            // Fallback 2: Use the part of the email before the '@' symbol
            if (!displayName) {
              displayName = (user.email || 'User').split('@');
            }

            // Update Desktop Header UI
            if (authActions) authActions.style.display = 'none';
            if (userMenu) {
              userMenu.style.display = 'flex';
              if (userNameElm) userNameElm.textContent = `Hi, ${displayName}`;
              if (user.photoURL && userAvatar) userAvatar.src = user.photoURL;
            }

            // Update Mobile Navigation to show a Logout link
            const existingMobileAuth = mobileNav.querySelector('.mobile-auth-link');
            if (existingMobileAuth) existingMobileAuth.remove();

            const mobileLogoutLink = document.createElement('a');
            mobileLogoutLink.href = '#';
            mobileLogoutLink.className = 'mobile-nav-link mobile-auth-link';
            mobileLogoutLink.textContent = 'Logout';
            mobileLogoutLink.onclick = (e) => {
              e.preventDefault();
              auth.signOut();
            };
            mobileNav.appendChild(mobileLogoutLink);

          } else {
            // --- USER IS SIGNED OUT ---
            if (authActions) authActions.style.display = 'flex';
            if (userMenu) userMenu.style.display = 'none';

            // Update Mobile Navigation to show a Sign In link
            const existingMobileAuth = mobileNav.querySelector('.mobile-auth-link');
            if (existingMobileAuth) existingMobileAuth.remove();

            const mobileLoginLink = document.createElement('a');
            mobileLoginLink.href = 'login.html';
            mobileLoginLink.className = 'mobile-nav-link mobile-auth-link';
            mobileLoginLink.textContent = 'Sign In';
            mobileNav.appendChild(mobileLoginLink);
          }
        });
      })
      .catch((error) => {
        console.error("Error setting session persistence:", error);
      });

    // Add event listener for the main logout button in the header
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        auth.signOut().catch(err => console.error('Logout failed:', err));
      });
    }
  }

  // ==========================================
  // ORIGINAL PAGE DATA & LOGIC
  // ==========================================
  const EVENT_DATA = {
    event: {
      id: "ts-delhi-2025",
      artist: "Travis Scott",
      date: "2025-10-18T19:30:00+05:30",
      venue: "JLN Stadium",
      city: "Delhi",
      poster: "assets/travis_poster.jpg"
    },
    tickets: [
      {
        id: "t1",
        category: "Gold Left",
        price: 15000,
        perks: "Access to ground standing ticket in the Gold Left zone",
        extraInfo: "Standing section with access to main floor. Arrive early for best spots!",

      },
      {
        id: "t2",
        category: "Gold Right",
        price: 15000,
        perks: "Access to ground standing ticket in the Right Left zone",
        extraInfo: "Priority entry 30 mins before doors open. VIP lounge access with complimentary drinks.",

      },
      {
        id: "t3",
        category: "Silver",
        price: 6500,
        perks: "Access to ground standing general ticket in the Silver zone",
        extraInfo: "Ultimate experience! Meet Travis Scott, exclusive backstage tour, premium gift bag, and VIP parking.",

      }
    ],
    testimonials: [
      {
        name: "Amit Sharma",
        location: "Mumbai",
        text: "Got my VIP tickets in seconds! The entire process was smooth and secure. Can't wait for the concert!",
        avatar: "A"
      },
      {
        name: "Neha Patel",
        location: "Delhi",
        text: "Best ticket booking platform! Genuine tickets, verified sellers, and amazing customer support.",
        avatar: "N"
      },
      {
        name: "Rohan Singh",
        location: "Bangalore",
        text: "Used TicketAdda for multiple concerts. Never disappointed! Highly recommended for Travis Scott fans.",
        avatar: "R"
      }
    ],
    faqs: [
      {
        question: "Are these tickets genuine and verified?",

        answer: "Tickets on TicketAdda are not sold directly by us — they’re genuine resale listings from verified users who’ve already purchased them. Every ticket is verified, and you’ll get the seller’s contact and full details once you select a listing."

      },

      {

        question: "What payment methods are accepted?",

        answer: "Currently, TicketAdda doesn’t handle payments directly. We simply connect buyers and sellers. You’ll pay the seller directly for the ticket — TicketAdda doesn’t charge any fee right now, as we’re in our initial launch phase."

      },

      {

        question: "Can I get a refund if the event is cancelled?",

        answer: "In case the event gets cancelled (which is very unlikely), you’ll need to contact the seller directly for a refund or ticket resolution. TicketAdda only connects buyers and sellers and doesn’t process payments."

      },

      {

        question: "When will I receive my e-ticket?",

        answer: "It totally depends on the seller. Once they confirm, they’ll send the e-ticket directly to you. We don’t control the timing, we’re just connecting you with them."

      },

      {

        question: "Is there an age restriction for the concert?",

        answer: "You’ll have to check that yourself on the official site where the tickets are listed. This is just a resell platform, so the age restriction depends on the specific event—you can find the details in the event info section."

      }

    ]

  };


  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  let filteredTickets = [...EVENT_DATA.tickets];
  let currentTicket = null;
  let ticketQuantity = 1;
  let fomoInterval = null;
  let countdownInterval = null;
  let testimonialInterval = null;
  let currentTestimonialIndex = 0;
  let isMusicPlaying = false;

  // ==========================================
  // DOM ELEMENTS
  // ==========================================
  const elements = {
    mobileMenuBtn: document.getElementById('mobileMenuBtn'),
    mobileNav: document.getElementById('mobileNav'),
    navLinks: document.querySelectorAll('.nav-link,.mobile-nav-link'),
    musicToggle: document.getElementById('musicToggle'),
    bgMusic: document.getElementById('bgMusic'),
    daysEl: document.getElementById('days'),
    hoursEl: document.getElementById('hours'),
    minutesEl: document.getElementById('minutes'),
    secondsEl: document.getElementById('seconds'),
    categoryFilter: document.getElementById('categoryFilter'),
    sortFilter: document.getElementById('sortFilter'),
    searchFilter: document.getElementById('searchFilter'),
    ticketsGrid: document.getElementById('ticketsGrid'),
    checkoutModal: document.getElementById('checkoutModal'),
    modalBackdrop: document.getElementById('modalBackdrop'),
    modalClose: document.getElementById('modalClose'),
    modalBody: document.getElementById('modalBody'),
    fomoToast: document.getElementById('fomoToast'),
    testimonialsCarousel: document.getElementById('testimonialsCarousel'),
    faqAccordion: document.getElementById('faqAccordion'),
    mobileCta: document.getElementById('mobileCta')
  };

  // ==========================================
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

  // ==========================================
  // EVENT BINDINGS (Original)
  // ==========================================
  function bindEvents() {
    elements.mobileMenuBtn?.addEventListener('click', toggleMobileMenu);
    elements.navLinks.forEach(link => {
      link.addEventListener('click', handleNavClick);
    });
    elements.musicToggle?.addEventListener('click', toggleMusic);
    elements.categoryFilter?.addEventListener('change', applyFilters);
    elements.sortFilter?.addEventListener('change', applyFilters);
    elements.searchFilter?.addEventListener('input', applyFilters);
    elements.modalClose?.addEventListener('click', closeCheckoutModal);
    elements.modalBackdrop?.addEventListener('click', closeCheckoutModal);
    document.addEventListener('keydown', handleKeyboard);
    window.addEventListener('scroll', handleScroll);
  }

  // ==========================================
  // NAVIGATION (Original)
  // ==========================================
  function toggleMobileMenu() {
    elements.mobileNav?.classList.toggle('active');
    elements.mobileMenuBtn?.classList.toggle('active');
  }

  function handleNavClick(e) {
    const targetId = e.target.getAttribute('href');
    // Prevent default only for internal links
    if (targetId && targetId.startsWith('#')) {
      e.preventDefault();
      const targetSection = document.querySelector(targetId);

      if (targetSection) {
        const headerOffset = 80;
        const elementPosition = targetSection.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });

        // Close mobile menu if open
        elements.mobileNav?.classList.remove('active');
        elements.mobileMenuBtn?.classList.remove('active');
      }
    }
  }

  function handleScroll() {
    handleMobileStickyCTA();
  }

  function handleMobileStickyCTA() {
    if (!elements.mobileCta) return;
    const ticketsSection = document.getElementById('tickets');
    if (!ticketsSection) return;
    const ticketsSectionTop = ticketsSection.offsetTop;
    const scrollPosition = window.scrollY + window.innerHeight;
    if (scrollPosition > ticketsSectionTop + 200) {
      elements.mobileCta.classList.add('visible');
    } else {
      elements.mobileCta.classList.remove('visible');
    }
  }

  // ==========================================
  // MUSIC TOGGLE (Original)
  // ==========================================
  function toggleMusic() {
    if (!elements.bgMusic || !elements.musicToggle) return;
    if (isMusicPlaying) {
      elements.bgMusic.pause();
      elements.musicToggle.classList.remove('playing');
      elements.musicToggle.querySelector('.music-text').textContent = 'Play FEIN';
      isMusicPlaying = false;
    } else {
      elements.bgMusic.play().catch(err => {
        console.error('Audio playback failed:', err);
      });
      elements.musicToggle.classList.add('playing');
      elements.musicToggle.querySelector('.music-text').textContent = 'Pause FEIN';
      isMusicPlaying = true;
    }
  }

  // ==========================================
  // COUNTDOWN TIMER (Original)
  // ==========================================
  function startCountdown() {
    if (!elements.daysEl) return;
    const eventDate = new Date(EVENT_DATA.event.date).getTime();
    function updateCountdown() {
      const now = new Date().getTime();
      const distance = eventDate - now;
      if (distance < 0) {
        clearInterval(countdownInterval);
        elements.daysEl.textContent = '00';
        elements.hoursEl.textContent = '00';
        elements.minutesEl.textContent = '00';
        elements.secondsEl.textContent = '00';
        return;
      }
      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);
      elements.daysEl.textContent = String(days).padStart(2, '0');
      elements.hoursEl.textContent = String(hours).padStart(2, '0');
      elements.minutesEl.textContent = String(minutes).padStart(2, '0');
      elements.secondsEl.textContent = String(seconds).padStart(2, '0');
    }
    updateCountdown();
    countdownInterval = setInterval(updateCountdown, 1000);
  }

  // ==========================================
  // TICKETS RENDERING (Original)
  // ==========================================
  function renderTickets() {
    if (!elements.ticketsGrid) return;
    elements.ticketsGrid.innerHTML = '';
    if (filteredTickets.length === 0) {
      elements.ticketsGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--color-text-grey);"><p style="font-size: 18px;">No tickets found matching your filters.</p></div>`;
      return;
    }
    filteredTickets.forEach(ticket => {
      const card = createTicketCard(ticket);
      elements.ticketsGrid.appendChild(card);
    });
  }

  function createTicketCard(ticket) {
    const card = document.createElement('div');
    card.className = 'ticket-card';
    card.setAttribute('role', 'listitem');
    const badgeHTML = ticket.badge || (ticket.qty < 20 ? `Only ${ticket.qty} left` : '');
    card.innerHTML = `
      <div class="ticket-category">${ticket.category}</div>
      <div class="ticket-price"><span class="ticket-price-symbol">₹</span>${ticket.price.toLocaleString('en-IN')}</div>
      <p class="ticket-perks">${ticket.perks}</p>
      ${badgeHTML ? `<span class="ticket-badge">${badgeHTML}</span>` : ''}
      <div class="ticket-extra-info">${ticket.extraInfo}</div>
      <button class="ticket-select-btn" data-ticket-id="${ticket.id}">Select Ticket</button>`;
    const selectBtn = card.querySelector('.ticket-select-btn');
    selectBtn.addEventListener('click', () => openCheckoutModal(ticket));
    return card;
  }

  // ==========================================
  // FILTERS & SORTING (Original)
  // ==========================================
  function applyFilters() {
    let tickets = [...EVENT_DATA.tickets];

    // Category filter
    const categoryValue = elements.categoryFilter?.value || 'all';
    if (categoryValue !== 'all') {
      tickets = tickets.filter(t => t.category === categoryValue);
    }

    // Search filter
    const searchValue = (elements.searchFilter?.value || '').toLowerCase();
    if (searchValue) {
      tickets = tickets.filter(t =>
        t.category.toLowerCase().includes(searchValue) ||
        t.perks.toLowerCase().includes(searchValue) ||
        EVENT_DATA.event.city.toLowerCase().includes(searchValue)
      );
    }

    // Sorting
    const sortValue = elements.sortFilter?.value || 'popular';
    if (sortValue === 'price-low') {
      tickets.sort((a, b) => a.price - b.price);
    } else if (sortValue === 'price-high') {
      tickets.sort((a, b) => b.price - a.price);
    } else {
      // Popular - sort by category (VVIP > VIP > General)
      const categoryOrder = { 'VVIP': 3, 'VIP': 2, 'General': 1 };
      tickets.sort((a, b) => categoryOrder[b.category] - categoryOrder[a.category]);
    }

    filteredTickets = tickets;
    renderTickets();
  }
  // ==========================================
  // CHECKOUT MODAL (Original)
  // ==========================================
  function openCheckoutModal(ticket) {
    currentTicket = ticket;
    ticketQuantity = 1;
    if (!elements.checkoutModal) return;
    renderModalContent();
    elements.checkoutModal.classList.add('active');
    elements.checkoutModal.querySelector('button')?.focus();
  }

  function renderModalContent() {
    if (!elements.modalBody || !currentTicket) return;
    const total = currentTicket.price * ticketQuantity;
    elements.modalBody.innerHTML = `
      <div class="checkout-summary">
        <div class="summary-row"><span class="summary-label">Category:</span><span class="summary-value">${currentTicket.category}</span></div>
        <div class="summary-row"><span class="summary-label">Price per ticket:</span><span class="summary-value">₹${currentTicket.price.toLocaleString('en-IN')}</span></div>
      </div>
      <div class="quantity-selector">
        <button class="quantity-btn" id="decreaseQty" aria-label="Decrease quantity">-</button>
        <span class="quantity-value" id="quantityValue">${ticketQuantity}</span>
        <button class="quantity-btn" id="increaseQty" aria-label="Increase quantity">+</button>
      </div>
      <div class="checkout-summary">
        <div class="summary-row summary-total"><span class="summary-label">Total:</span><span class="summary-value">₹${total.toLocaleString('en-IN')}</span></div>
      </div>
      <button class="checkout-btn" id="proceedPayment">Get Owner details</button>`;
    document.getElementById('decreaseQty')?.addEventListener('click', decreaseQuantity);
    document.getElementById('increaseQty')?.addEventListener('click', increaseQuantity);
    document.getElementById('proceedPayment')?.addEventListener('click', processPayment);
  }

  function decreaseQuantity() {
    if (ticketQuantity > 1) {
      ticketQuantity--;
      renderModalContent();
    }
  }

  function increaseQuantity() {
    if (currentTicket && ticketQuantity < currentTicket.qty && ticketQuantity < 10) {
      ticketQuantity++;
      renderModalContent();
    }
  }

  function closeCheckoutModal() {
    elements.checkoutModal?.classList.remove('active');
    currentTicket = null;
    ticketQuantity = 1;
  }

  function processPayment() {
    alert("This is a resale platform. After this step, you would be connected with the seller directly to complete the payment. No payment is processed here.");
    closeCheckoutModal();
  }

  // ==========================================
  // TESTIMONIALS & FAQ (Original)
  // ==========================================
  function renderTestimonials() {
    if (!elements.testimonialsCarousel) return;
    elements.testimonialsCarousel.innerHTML = EVENT_DATA.testimonials.map(t => `<div class="testimonial-card"><p class="testimonial-text">"${t.text}"</p><div class="testimonial-author"><div class="testimonial-avatar">${t.avatar}</div><div class="testimonial-info"><div class="testimonial-name">${t.name}</div><div class="testimonial-location">${t.location}</div></div></div></div>`).join('');
  }

  function startTestimonialCarousel() { }

  function renderFAQ() {
    if (!elements.faqAccordion) return;
    elements.faqAccordion.innerHTML = EVENT_DATA.faqs.map((faq, index) => `
      <div class="faq-item" data-faq-index="${index}">
        <button class="faq-question" aria-expanded="false">
          <span>${faq.question}</span>
          <svg class="faq-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </button>
        <div class="faq-answer"><div class="faq-answer-content">${faq.answer}</div></div>
      </div>`).join('');
    elements.faqAccordion.querySelectorAll('.faq-question').forEach(btn => {
      btn.addEventListener('click', toggleFAQ);
    });
  }

  function toggleFAQ(e) {
    const button = e.currentTarget;
    const faqItem = button.closest('.faq-item');
    const isActive = faqItem.classList.contains('active');
    document.querySelectorAll('.faq-item.active').forEach(item => {
      if (item !== faqItem) {
        item.classList.remove('active');
        item.querySelector('.faq-question')?.setAttribute('aria-expanded', 'false');
      }
    });
    faqItem.classList.toggle('active');
    button.setAttribute('aria-expanded', String(!isActive));
  }

  // ==========================================
  // KEYBOARD NAVIGATION (Original)
  // ==========================================
  function handleKeyboard(e) {
    if (e.key === 'Escape') {
      if (elements.checkoutModal?.classList.contains('active')) closeCheckoutModal();
      if (elements.mobileNav?.classList.contains('active')) toggleMobileMenu();
    }
  }

  // ==========================================
  // CLEANUP (Original)
  // ==========================================
  window.addEventListener('beforeunload', () => {
    if (countdownInterval) clearInterval(countdownInterval);
    if (fomoInterval) clearInterval(fomoInterval);
    if (testimonialInterval) clearInterval(testimonialInterval);
  });

  // ==========================================
  // START APPLICATION
  // ==========================================
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

document.addEventListener("DOMContentLoaded", () => {
  const ticketsData = [
    {
      seller: "Rajveer Suvarna",
      price: "₹8,500/ticket",
      quan: "2",
      seat: "Silver Ground",
      city: "Mumbai",
      concert: "Travis Scott Live in Mumbai",
      date: "18 Oct 2025"
    },
    {
      seller: "Amit Sharma",
      price: "₹15,000/ticket",
      quan: "3",
      seat: "Gold Left - Row A12",
      city: "Mumbai",
      concert: "Travis Scott Live in India",
      date: "18 Oct 2025"
    },
    {
      seller: "Riya Patel",
      price: "₹12,500/ticket",
      quan: "1",
      seat: "Silver - Block C14",
      city: "Mumbai",
      concert: "Travis Scott Live in India",
      date: "18 Oct 2025"
    },
    {
      seller: "Vikram Singh",
      price: "₹18,000/ticket",
      quan: "5",
      seat: "Gold Right - Row B5",
      city: "Mumbai",
      concert: "Travis Scott Live in India",
      date: "18 Oct 2025"
    },
    {
      seller: "Kunal Verma",
      price: "₹10,000/ticket",
      quan: "2",
      seat: "Silver - Row E20",
      city: "Mumbai",
      concert: "Travis Scott Live in India",
      date: "18 Oct 2025"
    },

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
    <div class="ticket-info">Quantity: ${ticket.quan}</div>
    <div class="ticket-info">Seat: ${ticket.seat}</div>
    <div class="ticket-info">city: ${ticket.city}</div>
    <div class="ticket-info">Concert: ${ticket.concert}</div>
    <div class="ticket-info">Date: ${ticket.date}</div>
    <a href="#" class="buy-btn">Contact Seller</a>
  `;
    ticketsContainer.appendChild(card);
  });
});



// ---------- Contact Owner flow ----------
function onContactOwnerClick(e) {
  e.preventDefault();
  const id = e.currentTarget.dataset.id;
  const seller = SELLERS.find(s => s.id === id);
  const user = getCurrentUser();
  if (!seller) return;

  // if(!user){
  //   // open must-sign modal (offer sign-in)
  //   const must = document.getElementById('mustSignModal');
  //   openModal(must);
  //   // when "Sign in" clicked, open signIn modal
  //   document.getElementById('mustSignOpenSignin').onclick = () => {
  //     closeModal(must);
  //     document.getElementById('openSignInBtn').click();
  //     // store intended action so after sign-in we can open owner details
  //     sessionStorage.setItem('afterSignInOpenOwner', id);
  //   };
  //   return;
  // }

  // user signed in -> show owner details
  showOwnerDetails(seller);
}

function showOwnerDetails(seller) {
  const ownerBody = document.getElementById('ownerBody');
  ownerBody.innerHTML = `
  <div style="color:var(--muted);">
    <p><strong>Seller:</strong> ${escapeHTML(seller.seller)}</p>
    <p><strong>Price:</strong> ${formatINR(seller.price)}</p>
    <p><strong>Quantity:</strong> ${escapeHTML(seller.quantity)}</p>
    <p><strong>Seat:</strong> ${escapeHTML(seller.seat)}</p>
    <p><strong>Date:</strong> ${escapeHTML(seller.date)}</p>
    <hr style="border:none;border-top:1px solid rgba(255,255,255,0.04);margin:10px 0">
    <p><strong>Phone:</strong> <a href="tel:${encodeURIComponent(seller.phone)}">${escapeHTML(seller.phone)}</a></p>
    <p><strong>Email:</strong> <a href="mailto:${encodeURIComponent(seller.email)}">${escapeHTML(seller.email)}</a></p>
    <p><strong>Note:</strong> ${escapeHTML(seller.note)}</p>

    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">
      <a class="btn-light" href="mailto:${encodeURIComponent(seller.email)}"><i class="fa fa-envelope"></i> Email</a>
      <a class="btn-primary" href="https://wa.me/${seller.phone.replace(/\D/g, '')}" target="_blank"><i class="fa fa-whatsapp"></i> WhatsApp</a>
    </div>
  </div>
`;
  openModal(document.getElementById('ownerModal'));
}

document.addEventListener('DOMContentLoaded', () => {
  // --- DATA: Har seller ki contact details yahan hain ---
  window.sellerTickets = [
    {
      id: 1,
      seller: "Rajveer Suvarna",
      price: "8500/Ticket",
      quantity: 2,
      seat: "Silver ground",
      concert: "Travis scott mumbai concert",
      city: "Mahalakshmi race course, Mumbai",
      date: "19 Nov 2025, 5:00 PM",
      phone: "9987098572",
      email: "rajveer@example.com",
      note: "Physical tickets available. Verified."
    },
    {
      id: 2,
      seller: "Rajveer Prakash", // seller not provided in source row
      price: "8500/Ticket",
      quantity: 2,
      seat: "Silver ground",
      concert: "Travis mumbai concert",
      city: "Mahalakshmi race course, Mumbai",
      date: "19 Nov 2025, 5:00 PM",
      phone: "9987098572",
      email: "",
      note: "Physical tickets available. Verified."
    },
  
    // -- JLN / Jawaharlal Nehru Stadium (Delhi) entries (2025-10-19)

    ];
  

  // --- DOM ELEMENTS ---
  const ticketsContainer = document.getElementById('sellerTicketsList');
  const contactModal = document.getElementById('contactModal');

  // --- FUNCTIONS ---

  // Modal ko kholne aur band karne ke functions
  const openModal = (modal) => modal.classList.add('active');
  const closeModal = (modal) => modal.classList.remove('active');
  const closeAllModals = () => {
    document.querySelectorAll('.modal').forEach(closeModal);
  };

  // Function: Seller ke ticket cards ko screen par render karta hai
  const renderTickets = () => {
    if (!ticketsContainer) return;
    ticketsContainer.innerHTML = '';
    sellerTickets.forEach(ticket => {
      const card = document.createElement('div');
      card.className = 'seller-ticket-card';
      card.innerHTML = `
            <div class="seller-card-header">
                <span class="seller-name">${ticket.seller}</span>
                <span class="seller-price">₹${ticket.price.toLocaleString('en-IN')}</span>
            </div>
            <div class="seller-card-body">
                <div class="info-row"><i class="fa fa-ticket"></i> Quantity: <span>${ticket.quantity}</span></div>
                <div class="info-row"><i class="fa-solid fa-chair"></i> Seat: <span>${ticket.seat}</span></div>
                <div class="info-row"><i class="fa fa-music"></i> Concert: <span>${ticket.concert}</span></div>
                <div class="info-row"><i class="fa fa-city"></i> CIty <span>${ticket.city}</span></div>
                <div class="info-row"><i class="fa fa-calendar-days"></i> Date: <span>${ticket.date}</span></div>
            </div>
            <button class="contact-seller-btn" data-ticket-id="${ticket.id}">Contact Seller</button>
        `;
      ticketsContainer.appendChild(card);
    });
  };

  // Function: "Contact Seller" button click ko handle karta hai
  const handleContactClick = (e) => {
    if (!e.target.classList.contains('contact-seller-btn')) return;

    // Sign-in check HATA diya gaya hai

    const ticketId = parseInt(e.target.dataset.ticketId);
    const ticket = sellerTickets.find(t => t.id === ticketId);

    if (ticket) {
      const modalBody = contactModal.querySelector('#modalBody');
      modalBody.innerHTML = `
            <p>You can contact <strong>${ticket.seller}</strong> using the details below:</p>
            <div class="info-row"><i class="fa fa-phone"></i> Phone: <span><a href="tel:${ticket.phone}">${ticket.phone}</a></span></div>
            <div class="info-row"><i class="fa fa-envelope"></i> Email: <span><a href="mailto:${ticket.email}">${ticket.email}</a></span></div>
            <br>
            <p><strong>Seller's Note:</strong><br>${ticket.note}</p>
        `;
      openModal(contactModal);
    }
  };

  // Countdown Timer Logic
  const startCountdown = () => {
    const countdownEl = {
      days: document.getElementById('days'),
      hours: document.getElementById('hours'),
      minutes: document.getElementById('minutes'),
      seconds: document.getElementById('seconds')
    };
    if (!countdownEl.days) return;

    const eventDate = new Date("2025-11-19T17:00:00+05:30").getTime();

    const update = () => {
      const now = new Date().getTime();
      const distance = eventDate - now;

      if (distance < 0) {
        clearInterval(interval);
        Object.values(countdownEl).forEach(el => el.textContent = '00');
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      countdownEl.days.textContent = String(days).padStart(2, '0');
      countdownEl.hours.textContent = String(hours).padStart(2, '0');
      countdownEl.minutes.textContent = String(minutes).padStart(2, '0');
      countdownEl.seconds.textContent = String(seconds).padStart(2, '0');
    };

    update();
    const interval = setInterval(update, 1000);
  };

  // --- EVENT LISTENERS ---
  document.querySelectorAll('[data-close-modal]').forEach(btn => btn.addEventListener('click', closeAllModals));
  document.querySelectorAll('.modal-backdrop').forEach(bd => bd.addEventListener('click', closeAllModals));

  if (ticketsContainer) ticketsContainer.addEventListener('click', handleContactClick);

  // --- INITIALIZATION ---
  // renderTickets();
  // startCountdown(); // Countdown logic ko chalu rakha hai
  // renderTickets(); // old renderer — disabled, new filtered renderer will handle it
  startCountdown();

});

/* === Ticket filters + price-sort logic (UPDATED) ===
   Replace your old block with this one.
*/
(function () {
  // run after DOM ready
  function parsePriceToNumber(price) {
    if (typeof price === 'number') return price;
    if (!price) return Infinity;
    // remove non-digits, keep digits
    const digits = String(price).replace(/[^\d]/g, '');
    return digits ? parseInt(digits, 10) : Infinity;
  }

  function getSourceTickets() {
    // Use global window.sellerTickets (safer)
    if (typeof window.sellerTickets !== 'undefined' && Array.isArray(window.sellerTickets)) {
      return window.sellerTickets.map(t => {
        // normalize price number
        return Object.assign({}, t, { __priceNum: parsePriceToNumber(t.price) });
      });
    } else {
      console.warn('sellerTickets array not found. Make sure window.sellerTickets is defined before this script.');
      return [];
    }
  }

  function formatPriceDisplay(ticket) {
    // Always return a string like "₹2,800/Ticket" when numeric part exists
    const priceRaw = ticket.price;
    // If price is a number
    if (typeof priceRaw === 'number') {
      return `₹${priceRaw.toLocaleString('en-IN')}/Ticket`;
    }
    // If price is string, extract digits
    if (typeof priceRaw === 'string') {
      const digits = String(priceRaw).replace(/[^\d]/g, '');
      if (digits) {
        const num = parseInt(digits, 10);
        return `₹${num.toLocaleString('en-IN')}/Ticket`;
      }
      // fallback: show original trimmed (rare case)
      return String(priceRaw).trim();
    }
    // fallback generic
    const fallbackNum = ticket.__priceNum || parsePriceToNumber(priceRaw) || 0;
    return `₹${fallbackNum.toLocaleString('en-IN')}/Ticket`;
  }

  function renderFilteredTickets() {
    const container = document.getElementById('sellerTicketsList');
    if (!container) return;
    let list = getSourceTickets();

    // availability filter
    const avail = document.getElementById('availabilityFilter')?.value || 'all';
    if (avail === 'available') {
      list = list.filter(t => {
        // support both "quantity" and "quan" keys
        const q = t.quantity ?? t.quan ?? t.qty ?? 0;
        return Number(q) > 0;
      });
    }

    // search
    const q = (document.getElementById('searchTickets')?.value || '').toLowerCase().trim();
    if (q) {
      list = list.filter(t => {
        const seller = String(t.seller || '').toLowerCase();
        const city = String(t.city || '').toLowerCase();
        const seat = String(t.seat || '').toLowerCase();
        const concert = String(t.concert || '').toLowerCase();
        return seller.includes(q) || city.includes(q) || seat.includes(q) || concert.includes(q);
      });
    }

    // sort
    const sortVal = document.getElementById('sortPrice')?.value || 'default';
    if (sortVal === 'price-low') {
      list.sort((a, b) => (a.__priceNum || 0) - (b.__priceNum || 0));
    } else if (sortVal === 'price-high') {
      list.sort((a, b) => (b.__priceNum || 0) - (a.__priceNum || 0));
    } // default -> leave original order

    // render
    container.innerHTML = '';
    if (list.length === 0) {
      container.innerHTML = `<div class="no-tickets" style="padding:2rem;text-align:center;color:#666">No tickets match your filters.</div>`;
      return;
    }

    list.forEach(ticket => {
      // create card - match your existing classes so styles stay consistent
      const card = document.createElement('div');
      card.className = 'seller-ticket-card';

      // format price display consistently
      const priceDisplay = formatPriceDisplay(ticket);
      const quantity = ticket.quantity ?? ticket.quan ?? ticket.qty ?? 0;

      card.innerHTML = `
        <div class="seller-card-header">
          <span class="seller-name">${escapeHTML(ticket.seller || 'Seller')}</span>
          <span class="seller-price">${escapeHTML(priceDisplay)}</span>
        </div>
        <div class="seller-card-body">
          <div class="info-row"><i class="fa fa-ticket"></i> Quantity: <span>${escapeHTML(String(quantity))}</span></div>
          <div class="info-row"><i class="fa-solid fa-chair"></i> Seat: <span>${escapeHTML(ticket.seat || '-')}</span></div>
          <div class="info-row"><i class="fa fa-music"></i> Concert: <span>${escapeHTML(ticket.concert || '-')}</span></div>
          <div class="info-row"><i class="fa fa-city"></i> City: <span>${escapeHTML(ticket.city || '-')}</span></div>
          <div class="info-row"><i class="fa fa-calendar-days"></i> Date: <span>${escapeHTML(ticket.date || '-')}</span></div>
        </div>
        <button class="contact-seller-btn" data-ticket-id="${escapeHTML(String(ticket.id))}">Contact Seller</button>
      `;
      container.appendChild(card);
    });
  }

  // Simple HTML-escape helper to avoid accidental injection if ticket data is untrusted
  function escapeHTML(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // hook events
  function initFilters() {
    const search = document.getElementById('searchTickets');
    const sort = document.getElementById('sortPrice');
    const avail = document.getElementById('availabilityFilter');
    const reset = document.getElementById('resetFilters');

    [search, sort, avail].forEach(el => {
      if (!el) return;
      el.addEventListener('input', debounce(renderFilteredTickets, 180));
      el.addEventListener('change', renderFilteredTickets);
    });

    if (reset) {
      reset.addEventListener('click', () => {
        if (search) search.value = '';
        if (sort) sort.value = 'default';
        if (avail) avail.value = 'all';
        renderFilteredTickets();
      });
    }

    // initial render
    renderFilteredTickets();

    // delegate contact button clicks to container (if you already have a global handler, this is a safe backup)
    // const container = document.getElementById('sellerTicketsList');
    // if (container) {
    //   container.addEventListener('click', function (e) {
    //     const btn = e.target.closest('.contact-seller-btn');
    //     if (!btn) return;
    //     const id = btn.dataset.ticketId;
    //     // Trigger any global handler if present
    //     if (typeof onContactOwnerClick === 'function') {
    //       try { onContactOwnerClick({ currentTarget: { dataset: { id } }, preventDefault: () => { } }); }
    //       catch (err) { console.warn('onContactOwnerClick failed', err); }
    //       return;
    //     }
    //     // Fallback modal display if no global handler
    //     const ticket = (window.sellerTickets || []).find(t => String(t.id) === String(id));
    //     if (ticket) {
    //       const contactModal = document.getElementById('contactModal');
    //       if (contactModal) {
    //         const modalBody = contactModal.querySelector('#modalBody');
    //         if (modalBody) {
    //           modalBody.innerHTML = `
    //             <p>You can contact <strong>${escapeHTML(ticket.seller)}</strong> using the details below:</p>
    //             <div class="info-row"><i class="fa fa-phone"></i> Phone: <span><a href="tel:${escapeHTML(ticket.phone || '')}">${escapeHTML(ticket.phone || 'N/A')}</a></span></div>
    //             <div class="info-row"><i class="fa fa-envelope"></i> Email: <span><a href="mailto:${escapeHTML(ticket.email || '')}">${escapeHTML(ticket.email || 'N/A')}</a></span></div>
    //             <br>
    //             <p><strong>Seller's Note:</strong><br>${escapeHTML(ticket.note || '')}</p>
    //           `;
    //           contactModal.classList.add('active');
    //         }
    //       }
    //     }
    //   });
    // }
    // delegate contact button clicks to container (if you already have a global handler, this is a safe backup)
    const container = document.getElementById('sellerTicketsList');
    if (container) {
      container.addEventListener('click', function (e) {
        const btn = e.target.closest('.contact-seller-btn');
        if (!btn) return; // Agar button nahi hai toh kuch mat karo

        const id = btn.dataset.ticketId;
        const ticket = (window.sellerTickets || []).find(t => String(t.id) === String(id));
        if (!ticket) return; // Agar ticket nahi mila toh kuch mat karo

        // Firebase se current user ki details check karo
        const currentUser = firebase.auth().currentUser;

        if (currentUser) {
            // --- USER LOGGED IN HAI ---
            // User sign-in hai, toh contact details wala modal dikhao
            const contactModal = document.getElementById('contactModal');
            if (contactModal) {
                const modalBody = contactModal.querySelector('#modalBody');
                if (modalBody) {
                    modalBody.innerHTML = `
                        <p>Aap <strong>${escapeHTML(ticket.seller)}</strong> se neeche di gayi details par contact kar sakte hain:</p>
                        <div class="info-row"><i class="fa fa-phone"></i> Phone: <span><a href="tel:${escapeHTML(ticket.phone || '')}">${escapeHTML(ticket.phone || 'N/A')}</a></span></div>
                        <div class="info-row"><i class="fa fa-envelope"></i> Email: <span><a href="mailto:${escapeHTML(ticket.email || '')}">${escapeHTML(ticket.email || 'N/A')}</a></span></div>
                        <br>
                        <p><strong>Seller ka Note:</strong><br>${escapeHTML(ticket.note || '')}</p>
                    `;
                    contactModal.classList.add('active'); // Modal ko dikhao
                }
            }
        } else {
            // --- USER LOGGED OUT HAI ---
            // User sign-in nahi hai, toh "login required" wala modal dikhao
            const loginModal = document.getElementById('loginRequiredModal');
            if (loginModal) {
                // (Optional) Hum user ko login ke baad waapis yahin bhej sakte hain
                sessionStorage.setItem('loginRedirect', window.location.pathname + '#tickets');
                
                loginModal.classList.add('active'); // Login wala modal dikhao
            } else {
                // Agar naya modal nahi mila (fallback)
                alert("Seller details dekhne ke liye aapko login karna hoga.");
                window.location.href = 'login.html';
            }
        }
      });
    }
  }

  // small debounce helper
  function debounce(fn, wait) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  // ensure DOM loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFilters);
  } else {
    initFilters();
  }

})();

/* === Ticket filters + price-sort + incremental "View more" + flash ===
   Replace your old IIFE block with this updated one.
*/
(function () {
  // config: how many show initially & per click
  const INITIAL_SHOW = 9;
  const LOAD_MORE_COUNT = 6;

  // run after DOM ready
  function parsePriceToNumber(price) {
    if (typeof price === 'number') return price;
    if (!price) return Infinity;
    const digits = String(price).replace(/[^\d]/g, '');
    return digits ? parseInt(digits, 10) : Infinity;
  }

  function getSourceTickets() {
    if (typeof window.sellerTickets !== 'undefined' && Array.isArray(window.sellerTickets)) {
      return window.sellerTickets.map(t => Object.assign({}, t, { __priceNum: parsePriceToNumber(t.price) }));
    } else {
      console.warn('sellerTickets array not found. Make sure window.sellerTickets is defined before this script.');
      return [];
    }
  }

  // pagination state
  let displayedCount = INITIAL_SHOW;

  function resetPagination() {
    displayedCount = INITIAL_SHOW;
    updateLoadMoreVisibility();
  }

  function increasePagination() {
    displayedCount += LOAD_MORE_COUNT;
    updateLoadMoreVisibility();
  }

  function formatPriceDisplay(ticket) {
    const priceRaw = ticket.price;
    if (typeof priceRaw === 'number') return `₹${priceRaw.toLocaleString('en-IN')}/Ticket`;
    if (typeof priceRaw === 'string') {
      const digits = String(priceRaw).replace(/[^\d]/g, '');
      if (digits) {
        const num = parseInt(digits, 10);
        return `₹${num.toLocaleString('en-IN')}/Ticket`;
      }
      return String(priceRaw).trim();
    }
    const fallbackNum = ticket.__priceNum || parsePriceToNumber(priceRaw) || 0;
    return `₹${fallbackNum.toLocaleString('en-IN')}/Ticket`;
  }

  function escapeHTML(str) {
    return String(str || '')
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function renderFilteredTickets() {
    const container = document.getElementById('sellerTicketsList');
    if (!container) return;
    let list = getSourceTickets();

    // availability filter
    const avail = document.getElementById('availabilityFilter')?.value || 'all';
    if (avail === 'available') {
      list = list.filter(t => {
        const q = t.quantity ?? t.quan ?? t.qty ?? 0;
        return Number(q) > 0;
      });
    }

    // search (if present)
    const q = (document.getElementById('searchTickets')?.value || '').toLowerCase().trim();
    if (q) {
      list = list.filter(t => {
        const seller = String(t.seller || '').toLowerCase();
        const city = String(t.city || '').toLowerCase();
        const seat = String(t.seat || '').toLowerCase();
        const concert = String(t.concert || '').toLowerCase();
        return seller.includes(q) || city.includes(q) || seat.includes(q) || concert.includes(q);
      });
    }

    // sort
    const sortVal = document.getElementById('sortPrice')?.value || 'default';
    if (sortVal === 'price-low') {
      list.sort((a, b) => (a.__priceNum || 0) - (b.__priceNum || 0));
    } else if (sortVal === 'price-high') {
      list.sort((a, b) => (b.__priceNum || 0) - (a.__priceNum || 0));
    }

    // save full filtered list to window for debugging if needed
    window.__lastFilteredTickets = list;

    // pagination slice
    const totalAvailable = list.length;
    const displayList = list.slice(0, displayedCount);

    // render grid
    container.innerHTML = '';
    if (displayList.length === 0) {
      container.innerHTML = `<div class="no-tickets" style="padding:2rem;text-align:center;color:#666">No tickets match your filters.</div>`;
      updateLoadMoreVisibility();
      return;
    }

    displayList.forEach(ticket => {
      const card = document.createElement('div');
      card.className = 'seller-ticket-card';
      const priceDisplay = formatPriceDisplay(ticket);
      const quantity = ticket.quantity ?? ticket.quan ?? ticket.qty ?? 0;

      card.innerHTML = `
        <div class="seller-card-header">
          <span class="seller-name">${escapeHTML(ticket.seller || 'Seller')}</span>
          <span class="seller-price">${escapeHTML(priceDisplay)}</span>
        </div>
        <div class="seller-card-body">
          <div class="info-row"><i class="fa fa-ticket"></i> Quantity: <span>${escapeHTML(String(quantity))}</span></div>
          <div class="info-row"><i class="fa-solid fa-chair"></i> Seat: <span>${escapeHTML(ticket.seat || '-')}</span></div>
          <div class="info-row"><i class="fa fa-music"></i> Concert: <span>${escapeHTML(ticket.concert || '-')}</span></div>
          <div class="info-row"><i class="fa fa-city"></i> City: <span>${escapeHTML(ticket.city || '-')}</span></div>
          <div class="info-row"><i class="fa fa-calendar-days"></i> Date: <span>${escapeHTML(ticket.date || '-')}</span></div>
        </div>
        <button class="contact-seller-btn" data-ticket-id="${escapeHTML(String(ticket.id))}">Contact Seller</button>
      `;
      container.appendChild(card);
    });

    // update load more button label (like "View more (6 left)")
    const remaining = Math.max(0, totalAvailable - displayList.length);
    updateLoadMoreVisibility(remaining);
  }

  function updateLoadMoreVisibility(remainingCount = null) {
    const btn = document.getElementById('loadMoreBtn');
    const wrap = document.getElementById('loadMoreWrap');
    const list = window.__lastFilteredTickets || getSourceTickets();
    const total = list.length;
    const remaining = remainingCount === null ? Math.max(0, total - displayedCount) : remainingCount;
    if (!btn || !wrap) return;
    if (remaining > 0) {
      btn.style.display = 'inline-block';
      btn.textContent = `View more (${Math.min(remaining, LOAD_MORE_COUNT)} more)`;
    } else {
      btn.style.display = 'none';
    }
  }

  // flash box helper
  function showFlashBox(text = 'Loading more tickets…', ms = 900) {
    const fb = document.getElementById('flashBox');
    if (!fb) return;
    fb.textContent = text;
    fb.setAttribute('aria-hidden', 'false');
    fb.classList.add('show');
    // hide after ms
    clearTimeout(fb._t);
    fb._t = setTimeout(() => {
      fb.classList.remove('show');
      fb.setAttribute('aria-hidden', 'true');
    }, ms);
  }

  // hook events & init
  function initFilters() {
    const search = document.getElementById('searchTickets');
    const sort = document.getElementById('sortPrice');
    const avail = document.getElementById('availabilityFilter');
    const reset = document.getElementById('resetFilters');
    const loadBtn = document.getElementById('loadMoreBtn');

    [search, sort, avail].forEach(el => {
      if (!el) return;
      el.addEventListener('input', debounce(() => { resetPagination(); renderFilteredTickets(); }, 180));
      el.addEventListener('change', () => { resetPagination(); renderFilteredTickets(); });
    });

    if (reset) {
      reset.addEventListener('click', () => {
        if (search) search.value = '';
        if (sort) sort.value = 'default';
        if (avail) avail.value = 'all';
        resetPagination();
        renderFilteredTickets();
      });
    }

    if (loadBtn) {
      loadBtn.addEventListener('click', (e) => {
        e.preventDefault();
        increasePagination();
        showFlashBox('Loading more tickets…', 800);
        // small delay for UX, then render
        setTimeout(renderFilteredTickets, 240);
      });
    }

    // delegate contact button clicks to container (if no other handler)
    const container = document.getElementById('sellerTicketsList');
    if (container) {
      container.addEventListener('click', function (e) {
        const btn = e.target.closest('.contact-seller-btn');
        if (!btn) return;
        const id = btn.dataset.ticketId;
        if (typeof onContactOwnerClick === 'function') {
          try { onContactOwnerClick({ currentTarget: { dataset: { id } }, preventDefault: () => { } }); }
          catch (err) { console.warn('onContactOwnerClick failed', err); }
          return;
        }
        const ticket = (window.sellerTickets || []).find(t => String(t.id) === String(id));
        if (ticket) {
          const contactModal = document.getElementById('contactModal');
          if (contactModal) {
            const modalBody = contactModal.querySelector('#modalBody');
            if (modalBody) {
              modalBody.innerHTML = `
                <p>You can contact <strong>${escapeHTML(ticket.seller)}</strong> using the details below:</p>
                <div class="info-row"><i class="fa fa-phone"></i> Phone: <span><a href="tel:${escapeHTML(ticket.phone || '')}">${escapeHTML(ticket.phone || 'N/A')}</a></span></div>
                <div class="info-row"><i class="fa fa-envelope"></i> Email: <span><a href="mailto:${escapeHTML(ticket.email || '')}">${escapeHTML(ticket.email || 'N/A')}</a></span></div>
                <br>
                <p><strong>Seller's Note:</strong><br>${escapeHTML(ticket.note || '')}</p>
              `;
              contactModal.classList.add('active');
            }
          }
        }
      });
    }

    // initial render
    resetPagination();
    renderFilteredTickets();
  }

  // small debounce helper
  function debounce(fn, wait) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFilters);
  } else {
    initFilters();
  }

})();
