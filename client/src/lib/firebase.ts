import { initializeApp, FirebaseApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence, Firestore } from 'firebase/firestore';

// Firebase configuration using environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
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
        firestoreDb = getFirestore(firebaseApp);
        
        // Enable offline persistence
        await enableIndexedDbPersistence(firestoreDb).catch((err) => {
          if (err.code === 'failed-precondition') {
            console.warn('Persistence failed: multiple tabs open');
          } else if (err.code === 'unimplemented') {
            console.warn('Persistence not available in this browser');
          }
        });
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
export const db = await initializeFirebase();

// Export reinitialize function for manual retry
export const reinitializeFirebase = () => initializeFirebase();
