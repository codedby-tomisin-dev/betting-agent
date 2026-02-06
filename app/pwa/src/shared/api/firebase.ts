import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { getStorage, connectStorageEmulator } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyC3NHBsQFbWjMXypuWU2pIEH0nDIvN4geA",
    authDomain: "skilful-sphere-392008.firebaseapp.com",
    projectId: "skilful-sphere-392008",
    storageBucket: "skilful-sphere-392008.firebasestorage.app",
    messagingSenderId: "74034783983",
    appId: "1:74034783983:web:a4ea2d188c1d6fa37c5d1a",
    measurementId: "G-P0BN3HGBNS"
};

const app = initializeApp(firebaseConfig);
const functions = getFunctions(app, "europe-west2");
const db = getFirestore(app);
const storage = getStorage(app);

// if (typeof window !== "undefined" && window.location.hostname === "localhost") {
//     console.log("Running in development mode - connecting to emulators");
//     connectFirestoreEmulator(db, 'localhost', 8080);
//     connectFunctionsEmulator(functions, 'localhost', 5001);
//     connectStorageEmulator(storage, 'localhost', 9199);
// }

let analytics;
if (typeof window !== "undefined") {
    isSupported().then((supported) => {
        if (supported) {
            analytics = getAnalytics(app);
        }
    });
}

export { app, analytics, db, functions, storage };
