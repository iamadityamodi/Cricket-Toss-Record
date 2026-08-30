import { initializeApp, cert } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { readFileSync } from "node:fs";

let messaging = null;

function loadServiceAccount() {
    try {
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            const account = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            account.private_key = account.private_key.replace(/\\n/g, "\n");
            return account;
        }
        return JSON.parse(
            readFileSync(new URL("./firebase-service-account.json", import.meta.url), "utf8")
        );
    } catch (err) {
        console.warn("Firebase service account not available:", err.message);
        return null;
    }
}

try {
    const serviceAccount = loadServiceAccount();
    if (serviceAccount) {
        const firebaseApp = initializeApp({
            credential: cert(serviceAccount)
        });
        messaging = getMessaging(firebaseApp);
    } else {
        console.warn("Firebase not initialized. Push notifications will be unavailable.");
    }
} catch (err) {
    console.warn("Firebase initialization failed:", err.message);
    messaging = null;
}

export { messaging };

 