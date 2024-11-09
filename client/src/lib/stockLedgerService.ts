import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs,
  query,
  orderBy,
  Timestamp,
  DocumentData
} from 'firebase/firestore';
import { db } from './firebase';
import type { NewStockEntry, StockEntry } from '@/types/ledger';

const COLLECTION_NAME = 'stockEntries';

export const stockLedgerService = {
  // Create a new stock entry
  async addEntry(entry: NewStockEntry): Promise<StockEntry> {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...entry,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      status: 'Active'
    });

    return {
      ...entry,
      id: docRef.id,
      status: 'Active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  },

  // Get all stock entries
  async getEntries(): Promise<StockEntry[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate().toISOString(),
      updatedAt: doc.data().updatedAt.toDate().toISOString()
    })) as StockEntry[];
  },

  // Update a stock entry
  async updateEntry(id: string, updates: Partial<StockEntry>): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.now()
    });
  },

  // Delete a stock entry
  async deleteEntry(id: string): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  }
};
