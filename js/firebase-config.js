import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

// Copy these values from Firebase Console > Project settings > Your apps.
export const firebaseConfig = {
	apiKey: 'AIzaSyD2Ja9ySMUkTe12qOhqR-yBQ5mA24Y3oPg',
	authDomain: 'scholarbridge-hub1.firebaseapp.com',
	projectId: 'scholarbridge-hub1',
	storageBucket: 'scholarbridge-hub1.firebasestorage.app',
	messagingSenderId: '161356811146',
	appId: '1:161356811146:web:4702c3897ddf6d65601673',
	measurementId: 'G-JDJYXQPHE1'
};

export const isFirebaseConfigured = Object.values(firebaseConfig).every(Boolean);
const app = isFirebaseConfigured
	? (getApps()[0] ?? initializeApp(firebaseConfig))
	: null;

export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
