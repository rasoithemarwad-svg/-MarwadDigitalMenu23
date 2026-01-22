import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// REPLACE THESE WITH YOUR ACTUAL FIREBASE KEYS
const firebaseConfig = {
  apiKey: "AIzaSyA6O513_ATkWch2AKHwqZnSrYQOep4bjK4",
  authDomain: "marwad-dining.firebaseapp.com",
  projectId: "marwad-dining",
  storageBucket: "marwad-dining.firebasestorage.app",
  messagingSenderId: "1002811966076",
  appId: "1:1002811966076:web:f7f98d3514a8e2ac593ff9",
  measurementId: "G-YJ4NEVKLSD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);

export { db };
