import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

/** Sem API key, o Firebase não sobe — colaboração em tempo real fica desabilitada. */
export const isFirebaseConfigured = Boolean(import.meta.env.VITE_FIREBASE_API_KEY);
export const isRealtimeCollabEnabled = isFirebaseConfigured;

export const appId =
  typeof __app_id !== 'undefined' && __app_id ? __app_id : 'default-app';

export const LOCAL_USER = {
  uid: 'local-user',
  email: null,
  isAnonymous: true,
  isLocal: true,
} as const;

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;

if (isFirebaseConfigured) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
}

export { app, auth, db };
