import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyAYaWfzN68_XQLCgXuD7HmWh4ecp',
  authDomain: 'salon-beauty-de32a.firebaseapp.com',
  projectId: 'salon-beauty-de32a',
  storageBucket: 'salon-beauty-de32a.firebasestorage.app',
  appId: '1:864720825148:web:c923c76903e68192198c39',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
