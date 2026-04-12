import * as admin from "firebase-admin";

// Credentials are read from environment variables so that serviceAccountKey.json
// never needs to be committed to the repository.
// Copy .env.example to .env (or configure your host's env) and fill in the values
// from Firebase Console → Project Settings → Service Accounts → Generate new private key.

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
// The private key is stored as a single-line string with literal "\n" — replace them
// with real newlines so the PEM header/footer are parsed correctly.
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  throw new Error(
    "Missing Firebase Admin credentials. " +
      "Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY " +
      "in your environment (see .env.example)."
  );
}

admin.initializeApp({
  credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  // databaseURL: "https://<your-project-id>.firebaseio.com", // if using Realtime DB
});

export const db = admin.firestore();
export const auth = admin.auth();
export default admin;
