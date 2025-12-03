import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAM2k-66w9V9PuZO0QpJB-WkLs499gH0aA",
  authDomain: "chatapp-454e7.firebaseapp.com",
  databaseURL: "https://chatapp-454e7-default-rtdb.firebaseio.com",
  projectId: "chatapp-454e7",
  storageBucket: "chatapp-454e7.firebasestorage.app",
  messagingSenderId: "932118896681",
  appId: "1:932118896681:web:a335c9dfc6212db9f9fc38",
  measurementId: "G-5Y9DPF3JPQ"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);