// backup.js — eksport Firestore do pliku JSON
// Użycie: node backup.js
//
// Wymagania:
//   npm install firebase-admin

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// ── Konfiguracja ─────────────────────────────────────────────────
const SERVICE_ACCOUNT_PATH = './serviceAccountKey.json'; // pobierz z Firebase Console
const PROJECT_ID = 'salon-beauty-de32a';

const COLLECTIONS = [
  'appointments',
  'clients',
  'employees',
  'services',
  'settings',
  'waiting_list',
];
// ─────────────────────────────────────────────────────────────────

admin.initializeApp({
  credential: admin.credential.cert(require(SERVICE_ACCOUNT_PATH)),
  projectId: PROJECT_ID,
});

const db = admin.firestore();

async function exportCollection(collectionName) {
  const snapshot = await db.collection(collectionName).get();
  const docs = {};
  snapshot.forEach(doc => {
    docs[doc.id] = doc.data();
  });
  return docs;
}

async function runBackup() {
  const date = new Date().toISOString().split('T')[0];
  const outputFile = `backup-${date}.json`;
  const outputPath = path.join(__dirname, outputFile);

  console.log(`Eksport bazy danych: ${PROJECT_ID}`);
  console.log(`Data: ${date}`);
  console.log('');

  const backup = {
    exportedAt: new Date().toISOString(),
    projectId: PROJECT_ID,
    collections: {},
  };

  for (const col of COLLECTIONS) {
    process.stdout.write(`  Kolekcja: ${col} ... `);
    try {
      backup.collections[col] = await exportCollection(col);
      const count = Object.keys(backup.collections[col]).length;
      console.log(`${count} dokumentów`);
    } catch (err) {
      console.log(`BŁĄD: ${err.message}`);
      backup.collections[col] = null;
    }
  }

  fs.writeFileSync(outputPath, JSON.stringify(backup, null, 2), 'utf8');

  const sizeKb = Math.round(fs.statSync(outputPath).size / 1024);
  console.log('');
  console.log(`Zapisano: ${outputFile} (${sizeKb} KB)`);
}

runBackup().catch(err => {
  console.error('Błąd backupu:', err.message);
  process.exit(1);
});
