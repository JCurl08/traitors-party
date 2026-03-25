import * as admin from "firebase-admin";
import * as path from "path";

const serviceAccountPath = path.resolve(__dirname, "../serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccountPath),
  // databaseURL: "https://<your-project-id>.firebaseio.com", // if using Realtime DB
});

export const db = admin.firestore();
export const auth = admin.auth();
export default admin;
