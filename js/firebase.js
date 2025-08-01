// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCZpE-EQ-cS-06gdkOljOelMExOq1t5aos",
  authDomain: "stage-planner-ca.firebaseapp.com",
  projectId: "stage-planner-ca",
  storageBucket: "stage-planner-ca.firebasestorage.app",
  messagingSenderId: "347115346113",
  appId: "1:347115346113:web:8e835602f38c374e711c40",
  measurementId: "G-5ZMNGF1YFK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export {
  db,
  collection,
  doc,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc
};
