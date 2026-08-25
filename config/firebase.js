import { initializeApp, cert } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { readFileSync } from "node:fs";

let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
} else {
    serviceAccount = JSON.parse(
        readFileSync(new URL("./firebase-service-account.json", import.meta.url), "utf8")
    );
}

const firebaseApp = initializeApp({
    credential: cert(serviceAccount)
});

export const messaging = getMessaging(firebaseApp);

console.log("Firebase initialized successfully");
