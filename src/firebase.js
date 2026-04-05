import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
apiKey: "AIzaSyD57OyyWoViUailmz0ba38Ldg7YnQ_OdVA",
  authDomain: "allomaison-790d3.firebaseapp.com",
  projectId: "allomaison-790d3",
  storageBucket: "allomaison-790d3.firebasestorage.app",
  messagingSenderId: "95819368296",
  appId: "1:95819368296:web:2944493dc6094c7fe378dd"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);