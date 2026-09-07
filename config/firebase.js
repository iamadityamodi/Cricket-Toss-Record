import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { readFileSync } from "node:fs";

let messaging = null;

function loadServiceAccount() {
    try {

        // 1. Production / Cloud Run
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {

            console.log("🔥 FIREBASE_SERVICE_ACCOUNT found");

            const account = JSON.parse(
                process.env.FIREBASE_SERVICE_ACCOUNT
            );

            if (account.private_key) {
                account.private_key = account.private_key.replace(
                    /\\n/g,
                    "\n"
                );
            }

            console.log(
                "🔥 Firebase project:",
                account.project_id
            );

            console.log(
                "🔥 Firebase client:",
                account.client_email
            );

            return account;
        }

        // 2. Local development
        console.log(
            "⚠️ FIREBASE_SERVICE_ACCOUNT not found, trying local JSON file..."
        );

        const fileUrl = new URL(
            "./firebase-service-account.json",
            import.meta.url
        );

        const account = JSON.parse(
            readFileSync(fileUrl, "utf8")
        );

        console.log(
            "🔥 Local Firebase project:",
            account.project_id
        );

        return account;

    } catch (err) {

        console.error(
            "❌ Firebase service account loading failed:"
        );

        console.error(err.message);

        return null;
    }
}


try {

    // Prevent duplicate initialization
    const serviceAccount = loadServiceAccount();

    if (!serviceAccount) {

        console.error(
            "❌ Firebase service account NOT FOUND"
        );

        console.error(
            "❌ Push notifications will NOT work"
        );

    } else {

        let firebaseApp;

        if (getApps().length > 0) {

            firebaseApp = getApps()[0];

            console.log(
                "🔥 Existing Firebase app reused"
            );

        } else {

            firebaseApp = initializeApp({
                credential: cert(serviceAccount)
            });

            console.log(
                "✅ Firebase Admin initialized successfully"
            );
        }

        messaging = getMessaging(firebaseApp);

        console.log(
            "✅ Firebase Messaging initialized successfully"
        );
    }

} catch (err) {

    console.error(
        "❌ Firebase initialization failed"
    );

    console.error(
        "Code:",
        err.code
    );

    console.error(
        "Message:",
        err.message
    );

    messaging = null;
}


export { messaging };