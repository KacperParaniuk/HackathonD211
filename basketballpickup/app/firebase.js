// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyApDCZFY775NRrGCHYXzP3vQFoyM_CESHQ",
  authDomain: "basketballpickup-6b42d.firebaseapp.com",
  projectId: "basketballpickup-6b42d",
  storageBucket: "basketballpickup-6b42d.firebasestorage.app",
  messagingSenderId: "479216102197",
  appId: "1:479216102197:web:82f6a97f1c49c77bc53a7c",
  measurementId: "G-14YS9TZD1M"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);