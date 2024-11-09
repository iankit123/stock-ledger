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

// Helper function to clean undefined values
function removeUndefinedValues<T extends Record<string, any>>(obj: T): T {
  const cleaned = { ...obj };
  Object.keys(cleaned).forEach(key => {
    if (cleaned[key] === undefined) {
      delete cleaned[key];
    }
  });
  return cleaned;
}

// Helper function to convert Firestore data to StockEntry
function convertFirestoreToStockEntry(id: string, data: DocumentData): StockEntry {
  return {
    id,
    stockName: data.stockName,
    symbol: data.symbol,
    dateBuy: data.dateBuy.toDate().toISOString(),
    priceBuy: Number(data.priceBuy),
    targetPercent: Number(data.targetPercent),
    stopLossPercent: Number(data.stopLossPercent),
    reason: data.reason,
    chartLink: data.chartLink,
    confidence: data.confidence,
    riskReward: data.riskReward,
    profitLoss: data.profitLoss ? Number(data.profitLoss) : undefined,
    hitTarget: data.hitTarget,
    hitStopLoss: data.hitStopLoss,
    dateSell: data.dateSell ? data.dateSell.toDate().toISOString() : undefined,
    priceSell: data.priceSell ? Number(data.priceSell) : undefined,
    status: data.status,
    createdAt: data.createdAt.toDate().toISOString(),
    updatedAt: data.updatedAt.toDate().toISOString()
  };
}

export const stockLedgerService = {
  // Create a new stock entry
  async addEntry(entry: NewStockEntry): Promise<StockEntry> {
    try {
      // Validate and convert numeric fields
      const validatedEntry = {
        ...entry,
        priceBuy: Number(entry.priceBuy),
        targetPercent: Number(entry.targetPercent),
        stopLossPercent: Number(entry.stopLossPercent),
        dateBuy: Timestamp.fromDate(new Date(entry.dateBuy)),
        // Optional fields
        riskReward: entry.targetPercent && entry.stopLossPercent 
          ? Number((entry.targetPercent / entry.stopLossPercent).toFixed(2))
          : undefined,
        // Add timestamps and status
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        status: 'Active' as const
      };

      // Remove any undefined values
      const cleanedEntry = removeUndefinedValues(validatedEntry);

      // Validate required fields
      if (!cleanedEntry.stockName || !cleanedEntry.symbol || 
          isNaN(cleanedEntry.priceBuy) || isNaN(cleanedEntry.targetPercent) || 
          isNaN(cleanedEntry.stopLossPercent)) {
        throw new Error('Missing or invalid required fields');
      }

      const docRef = await addDoc(collection(db, COLLECTION_NAME), cleanedEntry);

      // Convert the entry back to the expected StockEntry type
      return {
        id: docRef.id,
        ...entry,
        riskReward: validatedEntry.riskReward,
        status: 'Active',
        createdAt: validatedEntry.createdAt.toDate().toISOString(),
        updatedAt: validatedEntry.updatedAt.toDate().toISOString()
      };
    } catch (error) {
      console.error('Error adding stock entry:', error);
      throw error;
    }
  },

  // Get all stock entries
  async getEntries(): Promise<StockEntry[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => 
        convertFirestoreToStockEntry(doc.id, doc.data())
      );
    } catch (error) {
      console.error('Error getting stock entries:', error);
      throw error;
    }
  },

  // Update a stock entry
  async updateEntry(id: string, updates: Partial<StockEntry>): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const updateData = { ...updates };

      // Convert dates to Timestamps if present
      if (updateData.dateBuy) {
        updateData.dateBuy = Timestamp.fromDate(new Date(updateData.dateBuy));
      }
      if (updateData.dateSell) {
        updateData.dateSell = Timestamp.fromDate(new Date(updateData.dateSell));
      }

      // Convert numeric fields
      if (updateData.priceBuy) updateData.priceBuy = Number(updateData.priceBuy);
      if (updateData.priceSell) updateData.priceSell = Number(updateData.priceSell);
      if (updateData.targetPercent) updateData.targetPercent = Number(updateData.targetPercent);
      if (updateData.stopLossPercent) updateData.stopLossPercent = Number(updateData.stopLossPercent);
      if (updateData.profitLoss) updateData.profitLoss = Number(updateData.profitLoss);

      // Add updated timestamp
      updateData.updatedAt = Timestamp.now();

      // Remove any undefined values
      const cleanedUpdates = removeUndefinedValues(updateData);

      await updateDoc(docRef, cleanedUpdates);
    } catch (error) {
      console.error('Error updating stock entry:', error);
      throw error;
    }
  },

  // Delete a stock entry
  async deleteEntry(id: string): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting stock entry:', error);
      throw error;
    }
  }
};
