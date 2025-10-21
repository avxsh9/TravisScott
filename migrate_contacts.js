// migrate_contacts.js
const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require(path.join(__dirname, 'serviceAccountKey.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const contacts = {
  "contact_karan_1": { phone: "9582332654", email: "kt29122001@gmail.com", note: "Physical tickets available. Only accepting UPI payments. Please WhatsApp first." },
  "contact_karan_2": { phone: "9990695253", email: "No Email", note: "Only accepting UPI payments. Please WhatsApp first." },
  "contact_dhanraj_1": { phone: "9952071331", email: "sonic.boom866@gmail.com", note: "Physical tickets available. Only accepting UPI payments. Please WhatsApp first." },
  "contact_himanshu_1": { phone: "8770074410", email: "Hgoswami07239@gmail.com", note: "Physical tickets available. Only accepting UPI payments. Please WhatsApp first." },
  "contact_rajveer_1": { phone: "9987098572", email: "rajveer@example.com", note: "Only accepting UPI payments. Please WhatsApp first." },
  "contact_daksh_1": { phone: "8890818050", email: "dakshuttamchandani4444@gmail.com", note: "Physical tickets available. Only accepting UPI payments. Please WhatsApp first." }
};

async function migrate() {
  try {
    const batch = db.batch();
    const now = admin.firestore.FieldValue.serverTimestamp();

    for (const [docId, data] of Object.entries(contacts)) {
      const ref = db.collection('contacts').doc(docId);
      batch.set(ref, {
        ownerId: "",          // optional: put seller uid if you have it
        phone: String(data.phone || ""),
        email: String(data.email || ""),
        note: String(data.note || ""),
        createdAt: now
      }, { merge: true });
      console.log(`Queued ${docId}`);
    }

    await batch.commit();
    console.log('All contacts written successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
