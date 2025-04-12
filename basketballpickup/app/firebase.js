// firebase.js (or firebase.ts if you're using TypeScript)

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyApDCZFY775NRrGCHYXzP3vQFoyM_CESHQ",
  authDomain: "basketballpickup-6b42d.firebaseapp.com",
  projectId: "basketballpickup-6b42d",
  storageBucket: "basketballpickup-6b42d.appspot.com", // corrected: .app → .appspot.com
  messagingSenderId: "479216102197",
  appId: "1:479216102197:web:82f6a97f1c49c77bc53a7c",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
