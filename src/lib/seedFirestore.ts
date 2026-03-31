import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { mockServices, mockEmployees } from '@/data/services';

export async function seedFirestore() {
  // Check if services already exist
  const servicesSnap = await getDocs(collection(db, 'services'));
  if (servicesSnap.size > 0) {
    console.log('Firestore already has data, skipping seed.');
    return false;
  }

  const batch = writeBatch(db);

  // Seed services
  for (const service of mockServices) {
    const { id, ...data } = service;
    const ref = doc(collection(db, 'services'));
    batch.set(ref, data);
  }

  // Seed employees
  for (const employee of mockEmployees) {
    const { id, ...data } = employee;
    const ref = doc(collection(db, 'employees'));
    batch.set(ref, data);
  }

  await batch.commit();
  console.log('Firestore seeded successfully!');
  return true;
}
