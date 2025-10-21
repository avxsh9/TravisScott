// migrate_contacts_bulk.js
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error('ERROR: serviceAccountKey.json not found in folder. Place it here and try again.');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(require(serviceAccountPath))
});

const db = admin.firestore();

// Load contacts.json
const contactsFile = path.join(__dirname, 'contacts.json');
if (!fs.existsSync(contactsFile)) {
  console.error('ERROR: contacts.json not found. Create it following instructions.');
  process.exit(1);
}

const raw = fs.readFileSync(contactsFile, 'utf8');
let contacts;
try {
  contacts = JSON.parse(raw);
} catch (err) {
  console.error('ERROR: contacts.json is not valid JSON:', err);
  process.exit(1);
}

// Convert to array of {id, data}
const entries = Object.entries(contacts).map(([id, data]) => ({ id, data }));

// Firestore batch limit
const BATCH_SIZE = 450; // keep under 500 as safe margin

async function writeBatches() {
  console.log(`About to write ${entries.length} documents into collection "contacts" in batches of ${BATCH_SIZE}.`);
  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = entries.slice(i, i + BATCH_SIZE);
    chunk.forEach(item => {
      const ref = db.collection('contacts').doc(item.id);
      // write ownerId as empty for now; you can update later
      const doc = {
        ownerId: item.data.ownerId || "",
        phone: String(item.data.phone || ""),
        email: String(item.data.email || ""),
        note: String(item.data.note || ""),
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      };
      batch.set(ref, doc, { merge: true });
      console.log(`Queued: ${item.id}`);
    });
    await batch.commit();
    console.log(`Batch ${Math.floor(i / BATCH_SIZE) + 1} committed (${chunk.length} docs).`);
  }
  console.log('All done.');
  process.exit(0);
}

writeBatches().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
