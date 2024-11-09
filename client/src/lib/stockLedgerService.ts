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
  DocumentData,
  FirestoreError
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
  try {
    if (!data) {
      throw new Error('Invalid document data');
    }

    // Validate required fields
    const requiredFields = ['stockName', 'symbol', 'dateBuy', 'priceBuy', 'targetPercent', 'stopLossPercent', 'reason', 'confidence', 'status'];
    for (const field of requiredFields) {
      if (data[field] === undefined) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

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
  } catch (error) {
    console.error('Error converting Firestore data:', error);
    throw new Error(`Failed to convert document ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper function to validate numeric fields
function validateNumericField(value: any, fieldName: string): number {
  const num = Number(value);
  if (isNaN(num)) {
    throw new Error(`Invalid ${fieldName}: must be a number`);
  }
  if (num <= 0) {
    throw new Error(`Invalid ${fieldName}: must be greater than 0`);
  }
  return num;
}

// Helper function to handle Firestore errors
function handleFirestoreError(error: unknown, operation: string): never {
  console.error(`Firestore ${operation} error:`, error);
  
  if (error instanceof FirestoreError) {
    switch (error.code) {
      case 'permission-denied':
        throw new Error('You do not have permission to perform this operation');
      case 'not-found':
        throw new Error('The requested document was not found');
      case 'already-exists':
        throw new Error('A document with the same ID already exists');
      case 'failed-precondition':
        throw new Error('Operation failed due to server state');
      case 'unavailable':
        throw new Error('Service temporarily unavailable, please try again');
      default:
        throw new Error(`Firebase operation failed: ${error.message}`);
    }
  }

  throw new Error(`Failed to ${operation}: ${error instanceof Error ? error.message : 'Unknown error'}`);
}

export const stockLedgerService = {
  // Create a new stock entry
  async addEntry(entry: NewStockEntry): Promise<StockEntry> {
    try {
      // Validate required fields first
      if (!entry.stockName?.trim() || !entry.symbol?.trim()) {
        throw new Error('Stock name and symbol are required');
      }

      if (!entry.dateBuy) {
        throw new Error('Buy date is required');
      }

      // Validate and convert numeric fields
      const priceBuy = validateNumericField(entry.priceBuy, 'buy price');
      const targetPercent = validateNumericField(entry.targetPercent, 'target percentage');
      const stopLossPercent = validateNumericField(entry.stopLossPercent, 'stop loss percentage');

      if (!entry.confidence) {
        throw new Error('Confidence level is required');
      }

      if (!entry.reason?.trim()) {
        throw new Error('Reason for buying is required');
      }

      const validatedEntry = {
        stockName: entry.stockName.trim(),
        symbol: entry.symbol.trim(),
        dateBuy: Timestamp.fromDate(new Date(entry.dateBuy)),
        priceBuy,
        targetPercent,
        stopLossPercent,
        reason: entry.reason.trim(),
        chartLink: entry.chartLink?.trim(),
        confidence: entry.confidence,
        riskReward: Number((targetPercent / stopLossPercent).toFixed(2)),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        status: 'Active' as const
      };

      // Remove any undefined values
      const cleanedEntry = removeUndefinedValues(validatedEntry);
      
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
      return handleFirestoreError(error, 'add stock entry');
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
      const entries = querySnapshot.docs.map(doc => 
        convertFirestoreToStockEntry(doc.id, doc.data())
      );

      // Validate the converted entries
      entries.forEach(entry => {
        if (!entry.id || !entry.stockName || !entry.symbol) {
          throw new Error('Invalid entry data received from Firestore');
        }
      });

      return entries;
    } catch (error) {
      return handleFirestoreError(error, 'fetch stock entries');
    }
  },

  // Update a stock entry
  async updateEntry(id: string, updates: Partial<StockEntry>): Promise<void> {
    try {
      if (!id) {
        throw new Error('Entry ID is required for update');
      }

      const docRef = doc(db, COLLECTION_NAME, id);
      const updateData: Record<string, any> = { ...updates };

      // Validate numeric fields if they exist in the updates
      if ('priceBuy' in updates) {
        updateData.priceBuy = validateNumericField(updates.priceBuy, 'buy price');
      }
      if ('priceSell' in updates) {
        updateData.priceSell = validateNumericField(updates.priceSell, 'sell price');
      }
      if ('targetPercent' in updates) {
        updateData.targetPercent = validateNumericField(updates.targetPercent, 'target percentage');
      }
      if ('stopLossPercent' in updates) {
        updateData.stopLossPercent = validateNumericField(updates.stopLossPercent, 'stop loss percentage');
      }

      // Validate text fields
      if (updates.reason !== undefined) {
        const reason = updates.reason.trim();
        if (!reason) {
          throw new Error('Reason cannot be empty');
        }
        updateData.reason = reason;
      }

      // Convert dates to Timestamps
      if (updates.dateBuy) {
        updateData.dateBuy = Timestamp.fromDate(new Date(updates.dateBuy));
      }
      if (updates.dateSell) {
        updateData.dateSell = Timestamp.fromDate(new Date(updates.dateSell));
      }

      // Add updated timestamp
      updateData.updatedAt = Timestamp.now();

      // Remove any undefined values
      const cleanedUpdates = removeUndefinedValues(updateData);

      await updateDoc(docRef, cleanedUpdates);
    } catch (error) {
      handleFirestoreError(error, 'update stock entry');
    }
  },

  // Delete a stock entry
  async deleteEntry(id: string): Promise<void> {
    try {
      if (!id) {
        throw new Error('Entry ID is required for deletion');
      }

      const docRef = doc(db, COLLECTION_NAME, id);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, 'delete stock entry');
    }
  }
};
