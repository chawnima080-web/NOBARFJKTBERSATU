import { initializeApp } from "firebase/app";
import { getDatabase, ref } from "firebase/database";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDl1cP9EWpvBnbfvszbVwVWcHaxyDpnnBs",
    authDomain: "fjktbersatu-4ab4b.firebaseapp.com",
    databaseURL: "https://fjktbersatu-4ab4b-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "fjktbersatu-4ab4b",
    storageBucket: "fjktbersatu-4ab4b.firebasestorage.app",
    messagingSenderId: "297534333404",
    appId: "1:297534333404:web:9550605a484425b9d9ef19",
    measurementId: "G-9H2EKZB4S1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const settingsRef = ref(db, 'settings');
export const lineupRef = ref(db, 'lineup');
export const ticketsRef = ref(db, 'tickets');
