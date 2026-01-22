import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// REPLACE THESE WITH YOUR ACTUAL FIREBASE KEYS
const firebaseConfig = {
  apiKey: "AIzaSyD7MkB7qqVXZvkTsJTvh7tzs_8FjO10WEc",
  authDomain: "qrordering-bfeff.firebaseapp.com",
  projectId: "qrordering-bfeff",
  storageBucket: "qrordering-bfeff.firebasestorage.app",
  messagingSenderId: "1071028156145",
  appId: "1:1071028156145:web:2cd83625c142334c69db50"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);

export { db };
