# TravisScott

# TicketAdda Admin Dashboard (Vanilla JS + Firebase)

This project is a standalone, no-framework Admin Dashboard built with pure HTML, CSS, and JavaScript. It connects directly to a **Firebase Firestore** backend to manage pending ticket listings in real-time.

## 📦 Project Deliverables
- `admin.html`
- `admin.css`
- `admin.js`
- `README.md`

## ⚙️ Configuration Instructions

Before running, you must configure three things in `admin.js` and set up your Firestore rules.

### 1. Firebase Configuration (in `admin.js`)

In the `admin.js` file, locate the `firebaseConfig` object (around line 10) and replace the placeholders with your actual Firebase project settings:

```javascript
// admin.js
const firebaseConfig = {
    apiKey: "YOUR_API_KEY", // <--- PASTE YOUR API KEY HERE
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID",
};