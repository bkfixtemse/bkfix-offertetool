import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDXNfDzTeNrQM-OI0kvdkpZjzG8s4gQPbs',
  authDomain: 'offertetool-134c5.firebaseapp.com',
  projectId: 'offertetool-134c5',
  storageBucket: 'offertetool-134c5.firebasestorage.app',
  messagingSenderId: '573784325240',
  appId: '1:573784325240:web:8ebde66adec4d07b27418d',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
