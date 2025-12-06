// src/config/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyCmMdTFe0rjXTMTLZ5Icw73Z1gXOYfHkgk",
    authDomain: "iaogame.firebaseapp.com",
    databaseURL: "https://iaogame-default-rtdb.firebaseio.com",
    projectId: "iaogame",
    storageBucket: "iaogame.firebasestorage.app",
    messagingSenderId: "74081285188",
    appId: "1:74081285188:web:cd954d633fdc648110b811",
    measurementId: "G-8JZX8ZHNCW"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
