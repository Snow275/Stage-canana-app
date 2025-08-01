// firebase.js

// 1. Core SDK
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

// 2. Firestore SDK
import {
  getFirestore,
  collection,
  doc,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc
} from "firebase/firestore";

// 3. Ta configuration Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCZpE-EQ-cS-06gdkOljOelMExOq1t5aos",
  authDomain: "stage-planner-ca.firebaseapp.com",
  projectId: "stage-planner-ca",
  storageBucket: "stage-planner-ca.appspot.com",
  messagingSenderId: "347115346113",
  appId: "1:347115346113:web:8e835602f38c374e711c40",
  measurementId: "G-5ZMNGF1YFK"
};

// 4. Initialisation de l’app Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// 5. Instance Firestore
const db = getFirestore(app);

// 6. Export des utilitaires Firestore pour ton code métier
export {
  db,
  collection,
  doc,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc
};
