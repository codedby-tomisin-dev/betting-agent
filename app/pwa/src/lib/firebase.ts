import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyC3NHBsQFbWjMXypuWU2pIEH0nDIvN4geA",
    authDomain: "skilful-sphere-392008.firebaseapp.com",
    projectId: "skilful-sphere-392008",
    storageBucket: "skilful-sphere-392008.firebasestorage.app",
    messagingSenderId: "74034783983",
    appId: "1:74034783983:web:a4ea2d188c1d6fa37c5d1a",
    measurementId: "G-P0BN3HGBNS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const functions = getFunctions(app, "europe-west2");

// Initialize Analytics conditionally (client-side only and if supported)
let analytics;
if (typeof window !== "undefined") {
    isSupported().then((supported) => {
        if (supported) {
            analytics = getAnalytics(app);
        }
    });
}

const db = getFirestore(app);

// if (process.env.NODE_ENV === 'development') {
//     connectFirestoreEmulator(db, 'localhost', 8080);
//     connectFunctionsEmulator(functions, "localhost", 5001);
// }

export { app, analytics, db, functions };
