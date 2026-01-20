// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBQbzoFdhgkhaxLBFb8HBBaGIBsaJQYidk",
  authDomain: "sos-connext.firebaseapp.com",
  projectId: "sos-connext",
  storageBucket: "sos-connext.firebasestorage.app",
  messagingSenderId: "837884518681",
  appId: "1:837884518681:web:5934bea6a67f482e8f2588",
  measurementId: "G-KW2RN8MMXG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);