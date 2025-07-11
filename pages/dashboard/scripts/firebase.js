// Firebase App (the core Firebase SDK) is always required and must be listed first
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js';
import { getFirestore, enableIndexedDbPersistence } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js';

const firebaseConfig = {
  apiKey: "AIzaSyAy1WGgUz9LHKe2pWucajmcTppTDBZEfCk",
  authDomain: "checkin-webapp-b2d03.firebaseapp.com",
  projectId: "checkin-webapp-b2d03",
  storageBucket: "checkin-webapp-b2d03.firebasestorage.app",
  messagingSenderId: "1049450996918",
  appId: "1:1049450996918:web:9beeda34b59f2134e5b217",
  measurementId: "G-67S8QJX7G7"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

enableIndexedDbPersistence(db).catch((err) => {
  // Handle errors (multi-tab, private mode, etc.)
  if (err.code === 'failed-precondition') {
    console.warn('Persistence can only be enabled in one tab at a time.');
  } else if (err.code === 'unimplemented') {
    console.warn('Persistence is not available in this browser.');
  } else {
    console.error('Error enabling Firestore persistence:', err);
  }
});

export { db, storage }; 