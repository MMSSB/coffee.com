// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-analytics.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCNl92KFPmBFvtrs54D8AaIhRPKAH2GDW0",
    authDomain: "coffee-344dd.firebaseapp.com",
    projectId: "coffee-344dd",
    storageBucket: "coffee-344dd.firebasestorage.app",
    messagingSenderId: "798585147854",
    appId: "1:798585147854:web:a6f4dc81a7abf1d0675b9f",
    measurementId: "G-MS5JVLE1H8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, analytics, auth, db };