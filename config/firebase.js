import { initializeApp, cert } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import serviceAccount from "./firebase-service-account.json" with { type: "json" };

const firebaseApp = initializeApp({
    credential: cert(serviceAccount)
});

export const messaging = getMessaging(firebaseApp);

console.log("Firebase initialized successfully");