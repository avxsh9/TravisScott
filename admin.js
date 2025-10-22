/**
 * TicketAdda Admin Dashboard
 * Pure Vanilla JavaScript (ES6) for Firebase/Firestore backend
 * Final Updated Code (Syntax and Logic Fixes Applied)
 */
(function () {
    'use strict';

    // --- CONFIGURATION ---
    // !!! IMPORTANT: Replace with your actual Firebase project config !!!
    const firebaseConfig = {
        apiKey: "AIzaSyDSPYXYwrxaVTna2CfFI2EktEysXb7z5iE",
        authDomain: "ticketaddda.firebaseapp.com",
        projectId: "ticketaddda",
        storageBucket: "ticketaddda.firebasestorage.app",
        messagingSenderId: "987839286443",
        appId: "1:987839286443:web:235ed8857cd8cc8477fbee",
        measurementId: "G-EDDVKVVXHS"
    };

    // !!! IMPORTANT: Configure ADMIN UIDs here !!!
    // The UID 'gzTJ0gt8YuNR6ubcB93oYBEvuMS2' is kept as admin.
    const ADMIN_UIDS = ['gzTJ0gt8YuNR6ubcB93oYBEvuMS2', 'jfU1XJfXAuWXzcKOQKB6pnfy6nb2'];
    const LISTINGS_COLLECTION = 'listings';
    const ACTIVITY_COLLECTION = 'adminActivity';
    const ITEMS_PER_PAGE = 50;

    // --- FIREBASE INITIALIZATION ---
    let auth, db, storage, listingsRef;
    let listingsUnsubscribe = null;

    function initFirebase() {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        auth = firebase.auth();
        db = firebase.firestore();
        if (typeof firebase.storage === 'function') {
            storage = firebase.storage();
        } else {
            console.warn("Firebase Storage SDK not loaded or available.");
        }

        listingsRef = db.collection(LISTINGS_COLLECTION);
    }

    // --- STATE MANAGEMENT ---
    let allListings = [];
    let filteredListings = [];
    let selectedListingIds = new Set();
    let currentSort = { field: 'createdAt', direction: 'desc' };
    let isAdmin = false;
    let currentUser = null;
    let currentAdminEmail = 'N/A';

    // --- DOM ELEMENTS (Defined globally, mapped inside init) ---
    const elements = {};

    /**
     * Caches all required DOM elements. Called only after DOMContentLoaded.
     */
    function cacheDomElements() {
        elements.loginScreen = document.getElementById('loginScreen');
        elements.dashboard = document.getElementById('dashboard');
        elements.loginForm = document.getElementById('loginForm');
        elements.loginEmail = document.getElementById('loginEmail');
        elements.loginPassword = document.getElementById('loginPassword');
        elements.loginError = document.getElementById('loginError');
        elements.logoutBtn = document.getElementById('logoutBtn');
        elements.adminName = document.getElementById('adminName');
        elements.pendingCount = document.getElementById('pendingCount');
        elements.lastUpdated = document.getElementById('lastUpdated');
        elements.searchInput = document.getElementById('searchInput');
        elements.sortSelect = document.getElementById('sortSelect');
        elements.listingsTableBody = document.getElementById('listingsTableBody');
        elements.selectAllCheckbox = document.getElementById('selectAll');
        elements.bulkActions = document.querySelector('.action-bar .bulk-actions');
        elements.selectedCount = document.getElementById('selectedCount');
        elements.bulkApproveBtn = document.getElementById('bulkApproveBtn');
        elements.bulkRejectBtn = document.getElementById('bulkRejectBtn');
        elements.exportCsvBtn = document.getElementById('exportCsvBtn');

        // Modals
        elements.detailsModal = document.getElementById('detailsModal');
        elements.rejectionModal = document.getElementById('rejectionModal');
        elements.listingDetailsBody = document.getElementById('listingDetailsBody');
        elements.modalApproveBtn = document.getElementById('modalApproveBtn');
        elements.modalRejectBtn = document.getElementById('modalRejectBtn');
        elements.confirmRejectBtn = document.getElementById('confirmRejectBtn');
        elements.rejectionReason = document.getElementById('rejectionReason');
        elements.activityLogList = document.getElementById('activityLogList');

        // Other
        elements.allModals = document.querySelectorAll('.modal');
        elements.modalCloseBtns = document.querySelectorAll('[data-close-modal]');
    }

    // --- UTILITIES ---
    function formatINR(num) {
        if (isNaN(num)) return '₹0';
        return '₹' + Number(num).toLocaleString('en-IN', { maximumFractionDigits: 0 });
    }

    function formatDate(timestamp) {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate ? timestamp.toDate() : (typeof timestamp === 'string' || typeof timestamp === 'number' ? new Date(timestamp) : new Date());
        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    function escapeHTML(str) {
        if (typeof str === 'number') str = String(str);
        return str ? str.replace(/[&<>"']/g, function (m) {
            return {
                '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
            }[m];
        }) : '-';
    }

    function showToast(message, duration = 2000) {
        const toast = document.getElementById('csvToast');
        if (!toast) return;
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), duration);
    }

    function openModal(modalEl) {
        modalEl.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeModal(modalEl) {
        modalEl.classList.remove('active');
        document.body.style.overflow = '';
    }

    function closeAllModals() {
        elements.allModals.forEach(closeModal);
    }

    function debounce(func, delay) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    }

    // --- AUTHENTICATION & UI GATE ---

    function handleLogin(e) {
        e.preventDefault();
        const email = elements.loginEmail ? elements.loginEmail.value : '';
        const password = elements.loginPassword ? elements.loginPassword.value : '';

        if (!email || !password) {
            elements.loginError.textContent = 'Please enter both email and password.';
            elements.loginError.style.display = 'block';
            return;
        }

        elements.loginError.style.display = 'none';

        auth.signInWithEmailAndPassword(email, password)
            .then(() => {
                // Handled by onAuthStateChanged
            })
            .catch(error => {
                elements.loginError.textContent = `Login failed: ${error.message}`;
                elements.loginError.style.display = 'block';
            });
    }

    function updateAuthUI(user) {
        if (user) {
            currentUser = user;
            isAdmin = ADMIN_UIDS.includes(user.uid);
            currentAdminEmail = user.email || 'N/A';

            if (isAdmin) {
                elements.loginScreen.style.display = 'none';
                elements.dashboard.style.display = 'block';
                elements.logoutBtn.style.display = 'inline-flex';
                elements.adminName.textContent = `Hi, ${user.email.split('@')[0]}`;
                startRealtimeUpdates();
                startActivityLogUpdates();
            } else {
                auth.signOut();
                updateAuthUI(null);
                alert('Unauthorized Access: Your user ID is not configured as an admin. You will be logged out.');
            }
        } else {
            currentUser = null;
            isAdmin = false;
            currentAdminEmail = 'N/A';
            elements.loginScreen.style.display = 'flex';
            elements.dashboard.style.display = 'none';
            elements.logoutBtn.style.display = 'none';
            elements.adminName.textContent = 'Sign In';
            if (listingsUnsubscribe) {
                listingsUnsubscribe();
                listingsUnsubscribe = null;
            }
        }
    }

    // --- DATA FETCHING & REAL-TIME UPDATES ---

    function startRealtimeUpdates() {
        if (listingsUnsubscribe) {
            listingsUnsubscribe();
        }

        elements.listingsTableBody.innerHTML = `<tr><td colspan="7" class="loading-row"><i class="fas fa-spinner fa-spin"></i> Loading pending listings...</td></tr>`;

        listingsUnsubscribe = listingsRef.where('status', '==', 'pending')
            .onSnapshot(snapshot => {
                allListings = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                selectedListingIds.clear();
                applyFiltersAndSort();
                updateTimeAndCount();

            }, error => {
                console.error("Error listening to listings:", error);
                elements.listingsTableBody.innerHTML = `<tr><td colspan="7" class="loading-row error"><i class="fas fa-exclamation-triangle"></i> Error fetching data: ${error.message}</td></tr>`;
            });
    }

    function updateTimeAndCount() {
        elements.lastUpdated.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
        elements.pendingCount.textContent = allListings.length;
    }


    // --- LOGIC: FILTER, SORT, SEARCH ---

    function applyFiltersAndSort() {
        let list = [...allListings];

        // 1. Search Filter
        const query = elements.searchInput ? elements.searchInput.value.toLowerCase() : '';
        if (query) {
            list = list.filter(l =>
                (l.eventName && l.eventName.toLowerCase().includes(query)) ||
                (l.sellerName && l.sellerName.toLowerCase().includes(query)) ||
                (l.eventCategory && l.eventCategory.toLowerCase().includes(query)) ||
                (l.venue && l.venue.toLowerCase().includes(query))
            );
        }

        // 2. Sorting
        const sortVal = elements.sortSelect ? elements.sortSelect.value.split('_') : ['submittedAt', 'desc'];
        const field = sortVal[0];
        const direction = sortVal[1];
        currentSort = { field, direction };

        list.sort((a, b) => {
            let valA = a[field] || 0;
            let valB = b[field] || 0;

            // Handle Firestore Timestamp or ISO date strings
            if (field === 'createdAt' || field === 'submittedAt' || field === 'eventDate') {
                valA = a[field]?.seconds || new Date(a[field]).getTime() || 0;
                valB = b[field]?.seconds || new Date(b[field]).getTime() || 0;
            } else if (typeof valA === 'string' && typeof valB === 'string') {
                valA = valA.toLowerCase();
                valB = valB.toLowerCase();
            }

            if (valA < valB) return direction === 'asc' ? -1 : 1;
            if (valA > valB) return direction === 'asc' ? 1 : -1;
            return 0;
        });

        filteredListings = list;
        renderListingsTable();
    }

    // --- RENDERING ---

    function renderListingsTable() {
        const tbody = elements.listingsTableBody;
        if (!tbody) return;

        tbody.innerHTML = '';

        if (filteredListings.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="loading-row">${allListings.length > 0 ? 'No results found for your search/filter.' : 'No pending listings! 🎉'}</td></tr>`;
            return;
        }

        filteredListings.forEach(listing => {
            const row = tbody.insertRow();
            row.classList.add('highlight');
            row.dataset.id = listing.id;

            const checkboxCell = row.insertCell();
            checkboxCell.innerHTML = `<input type="checkbox" data-id="${listing.id}" class="select-row" ${selectedListingIds.has(listing.id) ? 'checked' : ''}>`;

            row.insertCell().textContent = escapeHTML(listing.eventName);
            row.insertCell().textContent = escapeHTML(listing.sellerName || listing.seatNumbers || 'N/A');
            row.insertCell().textContent = escapeHTML(listing.quantity);
            row.insertCell().textContent = formatINR(listing.sellingPrice);
            row.insertCell().textContent = formatDate(listing.submittedAt);

            const actionsCell = row.insertCell();
            actionsCell.className = 'action-btns';
            actionsCell.innerHTML = `
                <button class="btn btn-secondary action-view" data-id="${listing.id}" title="View Details"><i class="fas fa-eye"></i></button>
                <button class="btn btn-success action-approve" data-id="${listing.id}" title="Approve Listing"><i class="fas fa-check"></i></button>
                <button class="btn btn-danger action-reject" data-id="${listing.id}" title="Reject Listing"><i class="fas fa-times"></i></button>
            `;
        });

        attachTableEventListeners();
        updateBulkActionsUI();
    }

    // --- TABLE AND CHECKBOX HANDLERS ---

    function attachTableEventListeners() {
        elements.listingsTableBody.querySelectorAll('.select-row').forEach(checkbox => {
            checkbox.addEventListener('change', handleRowSelect);
        });
        elements.listingsTableBody.querySelectorAll('.action-view').forEach(btn => {
            btn.addEventListener('click', handleViewListing);
        });
        elements.listingsTableBody.querySelectorAll('.action-approve').forEach(btn => {
            btn.addEventListener('click', () => confirmAction(btn.dataset.id, 'approve'));
        });
        elements.listingsTableBody.querySelectorAll('.action-reject').forEach(btn => {
            btn.addEventListener('click', () => openRejectionModal(btn.dataset.id, 'single'));
        });
    }

    function handleRowSelect(e) {
        const id = e.target.dataset.id;
        if (e.target.checked) {
            selectedListingIds.add(id);
        } else {
            selectedListingIds.delete(id);
        }
        updateBulkActionsUI();
    }

    function handleSelectAll(e) {
        elements.listingsTableBody.querySelectorAll('.select-row').forEach(checkbox => {
            checkbox.checked = e.target.checked;
            const id = checkbox.dataset.id;
            if (e.target.checked) {
                selectedListingIds.add(id);
            } else {
                selectedListingIds.delete(id);
            }
        });
        updateBulkActionsUI();
    }

    function updateBulkActionsUI() {
        const count = selectedListingIds.size;
        elements.selectedCount.textContent = `${count} selected`;
        elements.bulkActions.style.display = count > 0 ? 'flex' : 'none';

        const totalRows = elements.listingsTableBody.querySelectorAll('tr.highlight').length;
        if (elements.selectAllCheckbox) {
            elements.selectAllCheckbox.checked = totalRows > 0 && count === totalRows;
            elements.selectAllCheckbox.indeterminate = count > 0 && count < totalRows;
        }
    }

    // --- DETAILS MODAL HANDLERS ---

    function handleViewListing(e) {
        const id = e.currentTarget.dataset.id;
        const listing = allListings.find(l => l.id === id);
        if (!listing) return showToast('Listing not found.', 3000);

        elements.modalApproveBtn.dataset.id = id;
        elements.modalRejectBtn.dataset.id = id;

        const sellerName = listing.sellerName || listing.seatNumbers || 'N/A';
        const sellerEmail = listing.ticketemail || 'N/A';
        const sellerPhone = listing.ticketRow || 'N/A';

        elements.listingDetailsBody.innerHTML = `
            <div class="detail-item"><strong>Event Name:</strong> ${escapeHTML(listing.eventName)}</div>
            <div class="detail-item"><strong>Category:</strong> ${escapeHTML(listing.eventCategory)}</div>
            <div class="detail-item"><strong>Event Date:</strong> ${formatDate(listing.eventDate)}</div>
            <div class="detail-item"><strong>Venue:</strong> ${escapeHTML(listing.venue)}</div>
            <div class="detail-item"><strong>Quantity:</strong> ${escapeHTML(listing.quantity)}</div>
            <div class="detail-item"><strong>Price/Ticket:</strong> ${formatINR(listing.sellingPrice)}</div>
            <div class="detail-item"><strong>Seller Name:</strong> ${escapeHTML(sellerName)}</div>
            <div class="detail-item"><strong>Seller Email:</strong> <a href="mailto:${escapeHTML(sellerEmail)}">${escapeHTML(sellerEmail)}</a></div>
            <div class="detail-item"><strong>Seller Phone:</strong> ${escapeHTML(sellerPhone)}</div>
            <div class="detail-item"><strong>Submitted At:</strong> ${formatDate(listing.submittedAt)}</div>
            <div class="detail-item"><strong>Ticket Type:</strong> ${escapeHTML(listing.ticketType || 'N/A')}</div>
            <div class="detail-item"><strong>Terms Agreed:</strong> ${listing.agreeTerms ? 'Yes' : 'No'}</div>
            
            <div class="file-preview-area">
                ${createFilePreviewCard(listing.ticketFileUrl, 'Ticket File')}
                ${createFilePreviewCard(listing.paymentProofUrl, 'Payment Proof')}
            </div>
        `;

        openModal(elements.detailsModal);
    }

    function createFilePreviewCard(url, title) {
        if (!url || !url.startsWith('http')) {
            return `<div class="preview-card"><strong>${title}</strong><div class="preview-file">Link N/A / Stored Offline</div></div>`;
        }

        const isImage = /\.(jpeg|jpg|png|gif)$/i.test(url.split('?')[0]);
        const isPdf = /\.pdf$/i.test(url.split('?')[0]);
        let previewContent;

        if (isImage) {
            previewContent = `<img src="${url}" alt="${title} Preview">`;
        } else if (isPdf) {
            previewContent = `<i class="fas fa-file-pdf pdf-icon"></i>`;
        } else {
            previewContent = `File Type: ${url.substring(url.lastIndexOf('.') + 1).toUpperCase() || 'Unknown'}`;
        }

        const downloadUrl = (url.includes('drive.google.com') && !url.includes('download')) ?
            url.replace('/view', '/uc') + '&export=download' : url;

        return `
            <div class="preview-card">
                <strong>${title}</strong>
                <div class="preview-file">${previewContent}</div>
                <a href="${downloadUrl}" target="_blank" class="btn btn-secondary" title="View/Download File"><i class="fas fa-download"></i> Download</a>
            </div>
        `;
    }

    // --- ACTION LOGIC: APPROVE / REJECT ---

    async function performAction(ids, action, reason = null) {
        if (!isAdmin || !currentUser) return showToast('Error: Not authorized or logged out.', 3000);
        if (!ids || ids.length === 0) return showToast('No listings selected.', 3000);
    
        const batch = db.batch();
        
        // 🛑 FIX: serverTimestamp() can only be used at the top level of set() or update().
        const serverTimestamp = firebase.firestore.FieldValue.serverTimestamp();
        
        // Use a standard ISO timestamp string (simple data type) for the array element.
        const localTimestamp = new Date().toISOString(); 
    
        // 1. Array element for the 'actions' array in the listing document
        //    (Must use simple data types, like the localTimestamp string)
        const adminAction = {
            adminUid: currentUser.uid,
            adminEmail: currentAdminEmail,
            action: action,
            // ✅ FIXED: Using local string date instead of FieldValue.serverTimestamp()
            ts: localTimestamp, 
            reason: reason || (action === 'approved' ? 'Approved' : 'No reason provided')
        };
    
        // 2. Data for the main 'adminActivity' log document 
        //    (Uses serverTimestamp() because it's a top-level set() operation)
        const actionLogData = {
            adminUid: currentUser.uid,
            adminEmail: currentAdminEmail,
            action: action,
            count: ids.length,
            reason: reason || 'N/A',
            timestamp: serverTimestamp
        };
    
        const originalButtonText = elements.confirmRejectBtn?.innerHTML || 'Confirm';
    
        try {
            // Disable button during operation
            elements.modalApproveBtn.disabled = elements.modalRejectBtn.disabled = true;
            if (elements.confirmRejectBtn) {
                elements.confirmRejectBtn.disabled = true;
                elements.confirmRejectBtn.innerHTML = '<span class="loading-spinner"></span> Processing...';
            }
    
            // Batch update for each listing's status and action log array
            ids.forEach(id => {
                const docRef = listingsRef.doc(id);
                batch.update(docRef, {
                    status: action,
                    actions: firebase.firestore.FieldValue.arrayUnion(adminAction)
                });
            });
    
            // Batch set for the main activity log
            const activityRef = db.collection(ACTIVITY_COLLECTION).doc();
            batch.set(activityRef, actionLogData);
    
            await batch.commit();
    
            showToast(`${ids.length} listing(s) ${action}d successfully!`);
            selectedListingIds.clear();
            closeAllModals();
    
        } catch (error) {
            console.error(`Error performing ${action} action:`, error);
            showToast(`Failed to ${action} listing(s): ${error.message}`, 5000);
        } finally {
            elements.modalApproveBtn.disabled = elements.modalRejectBtn.disabled = false;
            if (elements.confirmRejectBtn) {
                elements.confirmRejectBtn.disabled = false;
                elements.confirmRejectBtn.innerHTML = originalButtonText;
            }
        }
    }

    function confirmAction(id, action) {
        if (action === 'approve') {
            const idsToApprove = id ? [id] : Array.from(selectedListingIds);
            if (idsToApprove.length === 0) return showToast('Select at least one listing.', 3000);
            performAction(idsToApprove, 'approved');
        }
    }

    function openRejectionModal(id, type) {
        elements.rejectionReason.value = '';
        elements.confirmRejectBtn.dataset.type = type;
        elements.confirmRejectBtn.dataset.id = id || '';
        closeAllModals();
        openModal(elements.rejectionModal);
    }

    function handleConfirmReject() {
        const reason = elements.rejectionReason.value.trim();
        if (!reason) {
            elements.rejectionReason.style.borderColor = 'var(--color-danger)';
            return showToast('Please provide a reason for rejection.', 3000);
        }
        elements.rejectionReason.style.borderColor = 'var(--color-border)';

        const type = elements.confirmRejectBtn.dataset.type;
        let idsToReject = [];

        if (type === 'single') {
            const id = elements.confirmRejectBtn.dataset.id;
            if (id) idsToReject = [id];
        } else if (type === 'bulk') {
            idsToReject = Array.from(selectedListingIds);
        }

        if (idsToReject.length === 0) return showToast('No listings to reject.', 3000);

        performAction(idsToReject, 'rejected', reason);
    }

    // --- ACTIVITY LOG ---

    function startActivityLogUpdates() {
        if (!db || !elements.activityLogList) return;
        
        elements.activityLogList.innerHTML = `<li><i class="fas fa-spinner fa-spin"></i> Fetching activity log...</li>`;
    
        db.collection(ACTIVITY_COLLECTION).orderBy('timestamp', 'desc').limit(10)
            .onSnapshot(snapshot => {
                
                elements.activityLogList.innerHTML = '';
                
                if (snapshot.empty) {
                    elements.activityLogList.innerHTML = `<li><i class="fas fa-info-circle"></i> No recent activity.</li>`;
                    return;
                }
    
                snapshot.forEach(doc => {
                    const log = doc.data();
                    const li = document.createElement('li');
                    
                    const iconClass = log.action === 'approved' ? 'fas fa-check-circle log-approve' : 'fas fa-times-circle log-reject';
    
                    let actionText = log.action.charAt(0).toUpperCase() + log.action.slice(1);
                    actionText = log.count > 1 ? `Bulk ${actionText} (${log.count})` : actionText;
                    
                    li.innerHTML = `
                        <i class="${iconClass}"></i>
                        <strong>${actionText}</strong> by ${log.adminEmail.split('@')[0]} at ${formatDate(log.timestamp)}.
                    `;
                    elements.activityLogList.appendChild(li);
                });
            }, 
            error => { 
                console.error("Error fetching activity log:", error); 
                elements.activityLogList.innerHTML = `<li><i class="fas fa-exclamation-triangle"></i> Error loading log: ${error.message || 'Permission denied'}</li>`;
            });
    }

    // --- CSV EXPORT ---
    function handleExportCsv() {
        if (filteredListings.length === 0) return showToast('No listings to export.', 3000);

        const headers = ["ID", "Event Name", "Category", "Event Date", "Venue", "Price", "Quantity", "Seller Name", "Seller Email", "Status", "Submitted At", "Ticket File URL", "Payment Proof URL"];
        const rows = [headers.join(',')];

        filteredListings.forEach(l => {
            const row = [
                l.id,
                l.eventName,
                l.eventCategory,
                formatDate(l.eventDate),
                l.venue,
                l.sellingPrice,
                l.quantity,
                l.sellerName || l.seatNumbers || 'N/A',
                l.ticketemail,
                l.status,
                formatDate(l.submittedAt),
                l.ticketFileUrl || 'N/A',
                l.paymentProofUrl || 'N/A'
            ];

            const csvRow = row.map(cell => {
                let s = String(cell || '').replace(/"/g, '""');
                if (s.includes(',') || s.includes('\n')) {
                    s = `"${s}"`;
                }
                return s;
            }).join(',');
            rows.push(csvRow);
        });

        const csvString = rows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');

        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `ticketadda_pending_listings_${new Date().toISOString().slice(0, 10)}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showToast('CSV exported successfully!', 3000);
        } else {
            alert('Your browser does not support CSV download. Please update.');
        }
    }

    // --- MAIN INITIALIZATION ---
    function init() {
        // 1. Map all DOM elements
        cacheDomElements();

        if (!elements.loginForm) {
            console.error("FATAL: Required 'loginForm' element not found. Check admin.html structure.");
            return;
        }

        // 2. Initialize Firebase SDKs
        initFirebase();

        // 3. Global Auth Listener
        auth.onAuthStateChanged(updateAuthUI);

        // 4. Bind Events
        elements.loginForm.addEventListener('submit', handleLogin);
        elements.logoutBtn?.addEventListener('click', () => auth.signOut());

        elements.searchInput?.addEventListener('input', debounce(applyFiltersAndSort, 200));
        elements.sortSelect?.addEventListener('change', applyFiltersAndSort);
        elements.selectAllCheckbox?.addEventListener('change', handleSelectAll);

        elements.bulkApproveBtn?.addEventListener('click', () => confirmAction(null, 'approve'));
        elements.bulkRejectBtn?.addEventListener('click', () => openRejectionModal(null, 'bulk'));
        elements.confirmRejectBtn?.addEventListener('click', handleConfirmReject);

        elements.modalCloseBtns.forEach(btn => btn.addEventListener('click', closeAllModals));
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeAllModals();
        });
        elements.modalApproveBtn?.addEventListener('click', (e) => confirmAction(e.currentTarget.dataset.id, 'approve'));
        elements.modalRejectBtn?.addEventListener('click', (e) => openRejectionModal(e.currentTarget.dataset.id, 'single'));

        elements.exportCsvBtn?.addEventListener('click', handleExportCsv);
    }

    // 🛑 The critical part: Ensure init() runs only after the DOM is fully loaded.
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();