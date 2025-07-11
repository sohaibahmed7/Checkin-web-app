// Firebase App (the core Firebase SDK) is always required and must be listed first
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';

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

export { db }; 