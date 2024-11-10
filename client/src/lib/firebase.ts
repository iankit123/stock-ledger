import { initializeApp, FirebaseApp } from 'firebase/app';
import { getFirestore, initializeFirestore, Firestore } from 'firebase/firestore';

// Firebase configuration using environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const firestoreSettings = {
  cache: {
    experimentalForceOwningTab: true
  }
};

let firebaseApp: FirebaseApp | null = null;
let firestoreDb: Firestore | null = null;
let isInitialized = false;
let initializationError: Error | null = null;

// Initialize Firebase with retry logic
const initializeFirebase = async (retries = 3): Promise<Firestore> => {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      if (!firebaseApp) {
        firebaseApp = initializeApp(firebaseConfig);
      }
      
      if (!firestoreDb) {
        // Initialize Firestore with cache settings
        firestoreDb = initializeFirestore(firebaseApp, firestoreSettings);
      }
      
      isInitialized = true;
      initializationError = null;
      return firestoreDb;
    } catch (error) {
      console.error(`Firebase initialization attempt ${attempt + 1} failed:`, error);
      initializationError = error as Error;
      
      if (attempt === retries - 1) {
        throw error;
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
    }
  }
  
  throw initializationError || new Error('Failed to initialize Firebase');
};

// Export initialization status checking functions
export const isFirebaseInitialized = () => isInitialized;
export const getInitializationError = () => initializationError;
export const getFirebaseApp = () => firebaseApp;

// Initialize and export db
let db: Firestore;

// Initialize Firebase immediately but handle errors gracefully
initializeFirebase()
  .then((firestore) => {
    db = firestore;
  })
  .catch((error) => {
    console.error('Failed to initialize Firebase:', error);
  });

export { db };

// Export reinitialize function for manual retry
export const reinitializeFirebase = () => initializeFirebase();
