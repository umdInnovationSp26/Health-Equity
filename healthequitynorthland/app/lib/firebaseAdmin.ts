import * as admin from "firebase-admin";

function getAdminApp(): admin.app.App {
  if (admin.apps.length) {
    return admin.apps[0]!;
  }

  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

/**
 * Returns the Admin Firestore instance, initializing the Admin SDK on first
 * use. Initialization is deferred to request time (rather than module import)
 * so that `next build` doesn't require service-account credentials to be
 * present when it evaluates route modules.
 */
export function getAdminDb(): admin.firestore.Firestore {
  return admin.firestore(getAdminApp());
}
