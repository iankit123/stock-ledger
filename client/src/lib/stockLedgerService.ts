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
  FirestoreError,
} from 'firebase/firestore';
import { db } from './firebase';
import type { NewStockEntry, StockEntry } from '@/types/ledger';

const COLLECTION_NAME = 'stockEntries';
const MAX_RETRIES = process.env.NODE_ENV === 'production' ? 5 : 3;
const RETRY_DELAY = process.env.NODE_ENV === 'production' ? 2000 : 1000; // 2 seconds for production, 1 second for development

// Helper function for delay between retries
const delay = (ms: number, attempt: number) => new Promise(resolve => 
  setTimeout(resolve, ms * Math.pow(2, attempt - 1))
);

// Serialize error objects for safe logging
function serializeError(error: unknown): string {
  if (error instanceof FirestoreError) {
    return JSON.stringify({
      code: error.code,
      message: error.message,
      name: error.name,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
  if (error instanceof Error) {
    return JSON.stringify({
      message: error.message,
      name: error.name,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
  return JSON.stringify({ message: String(error) });
}

// Safe console logging wrapper
function safeConsoleLog(message: string, error?: unknown) {
  if (error) {
    console.error(message, serializeError(error));
  } else {
    console.log(message);
  }
}

// Retry wrapper for Firestore operations
async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  maxRetries: number = MAX_RETRIES
): Promise<T> {
  let lastError: unknown;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (error instanceof FirestoreError) {
        // Only retry on connection-related errors
        if (error.code !== 'unavailable' && 
            error.code !== 'failed-precondition') {
          throw error;
        }
      }
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      await delay(RETRY_DELAY, attempt);
      safeConsoleLog(`Retrying ${operationName} (attempt ${attempt + 1}/${maxRetries})`);
    }
  }
  
  throw lastError;
}

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

// Helper function to validate and format dates
function validateAndFormatDate(date: unknown): string {
  if (!date) throw new Error('Date is required');
  
  if (date instanceof Timestamp) {
    return date.toDate().toISOString();
  }
  
  try {
    const parsedDate = new Date(date as any);
    if (isNaN(parsedDate.getTime())) {
      throw new Error('Invalid date format');
    }
    return parsedDate.toISOString();
  } catch (error) {
    throw new Error(`Invalid date: ${String(date)}`);
  }
}

// Helper function to validate and format numbers
function validateAndFormatNumber(value: unknown, fieldName: string): number {
  if (value === null || value === undefined) {
    throw new Error(`${fieldName} is required`);
  }
  
  const num = Number(value);
  if (isNaN(num)) {
    throw new Error(`${fieldName} must be a valid number`);
  }
  return num;
}

// Helper function to validate string fields
function validateString(value: unknown, fieldName: string): string {
  if (!value || typeof value !== 'string' || !value.trim()) {
    throw new Error(`${fieldName} is required and must be a non-empty string`);
  }
  return value.trim();
}

// Helper function to validate numeric fields
function validateNumericField(value: any, fieldName: string): number {
  const num = validateAndFormatNumber(value, fieldName);
  if (num <= 0) {
    throw new Error(`${fieldName} must be greater than 0`);
  }
  return num;
}

// Helper function to convert Firestore data to StockEntry
function convertFirestoreToStockEntry(id: string, data: DocumentData): StockEntry {
  try {
    if (!data) {
      throw new Error('Invalid document data: Document is empty');
    }

    // Validate required fields
    const stockName = validateString(data.stockName, 'Stock name');
    const symbol = validateString(data.symbol, 'Symbol');
    const reason = validateString(data.reason, 'Reason');
    const confidence = validateString(data.confidence, 'Confidence');
    
    if (!['Low', 'Medium', 'High'].includes(confidence)) {
      throw new Error('Invalid confidence level');
    }

    // Validate and format dates
    const dateBuy = validateAndFormatDate(data.dateBuy);
    const createdAt = validateAndFormatDate(data.createdAt);
    const updatedAt = validateAndFormatDate(data.updatedAt);
    
    // Validate and format numbers
    const priceBuy = validateAndFormatNumber(data.priceBuy, 'Buy price');
    const targetPercent = validateAndFormatNumber(data.targetPercent, 'Target percentage');
    const stopLossPercent = validateAndFormatNumber(data.stopLossPercent, 'Stop loss percentage');

    // Optional fields with validation
    const chartLink = data.chartLink ? validateString(data.chartLink, 'Chart link') : undefined;
    const dateSell = data.dateSell ? validateAndFormatDate(data.dateSell) : undefined;
    const priceSell = data.priceSell ? validateAndFormatNumber(data.priceSell, 'Sell price') : undefined;
    const profitLoss = data.profitLoss ? validateAndFormatNumber(data.profitLoss, 'Profit/Loss') : undefined;
    
    const status = validateString(data.status, 'Status');
    if (!['Active', 'Closed'].includes(status)) {
      throw new Error('Invalid status');
    }

    return {
      id,
      stockName,
      symbol,
      dateBuy,
      priceBuy,
      targetPercent,
      stopLossPercent,
      reason,
      chartLink,
      confidence,
      riskReward: data.riskReward ? Number(data.riskReward) : undefined,
      profitLoss,
      hitTarget: Boolean(data.hitTarget),
      hitStopLoss: Boolean(data.hitStopLoss),
      dateSell,
      priceSell,
      status,
      createdAt,
      updatedAt
    };
  } catch (error) {
    safeConsoleLog(`Error converting document ${id}:`, error);
    throw new Error(`Failed to convert document ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper function to handle Firestore errors
function handleFirestoreError(error: unknown, operation: string): never {
  safeConsoleLog(`Firestore ${operation} error:`, error);
  
  if (error instanceof FirestoreError) {
    switch (error.code) {
      case 'permission-denied':
        throw new Error('Please verify that you have the necessary permissions to perform this operation. If the issue persists, try refreshing the page.');
      case 'not-found':
        throw new Error('The requested stock entry could not be found. It may have been deleted.');
      case 'already-exists':
        throw new Error('This stock entry already exists. Please try updating it instead.');
      case 'failed-precondition':
        throw new Error('Unable to complete the operation. Please ensure all required data is provided.');
      case 'unavailable':
        throw new Error('The service is temporarily unavailable. Please try again in a few moments.');
      case 'resource-exhausted':
        throw new Error('You have exceeded the maximum number of operations. Please wait a moment and try again.');
      default:
        throw new Error(`Operation failed: ${error.message}. Please try again or contact support if the issue persists.`);
    }
  }

  throw new Error(`Failed to ${operation}: ${error instanceof Error ? error.message : 'An unexpected error occurred'}`);
}

export const stockLedgerService = {
  async addEntry(entry: NewStockEntry): Promise<StockEntry> {
    return withRetry(async () => {
      try {
        // Validate required fields
        const stockName = validateString(entry.stockName, 'Stock name');
        const symbol = validateString(entry.symbol, 'Symbol');
        const reason = validateString(entry.reason, 'Reason');
        const confidence = validateString(entry.confidence, 'Confidence');

        if (!['Low', 'Medium', 'High'].includes(confidence)) {
          throw new Error('Invalid confidence level');
        }

        // Validate numeric fields
        const priceBuy = validateNumericField(entry.priceBuy, 'Buy price');
        const targetPercent = validateNumericField(entry.targetPercent, 'Target percentage');
        const stopLossPercent = validateNumericField(entry.stopLossPercent, 'Stop loss percentage');

        const validatedEntry = {
          stockName,
          symbol,
          dateBuy: Timestamp.fromDate(new Date(entry.dateBuy)),
          priceBuy,
          targetPercent,
          stopLossPercent,
          reason,
          chartLink: entry.chartLink?.trim(),
          confidence,
          riskReward: Number((targetPercent / stopLossPercent).toFixed(2)),
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          status: 'Active' as const
        };

        const cleanedEntry = removeUndefinedValues(validatedEntry);
        const docRef = await addDoc(collection(db, COLLECTION_NAME), cleanedEntry);

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
    }, 'add stock entry');
  },

  async getEntries(): Promise<StockEntry[]> {
    return withRetry(async () => {
      try {
        const q = query(
          collection(db, COLLECTION_NAME),
          orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const entries = querySnapshot.docs.map(doc => 
          convertFirestoreToStockEntry(doc.id, doc.data())
        );

        // Validate all entries
        entries.forEach(entry => {
          if (!entry.id || !entry.stockName || !entry.symbol) {
            throw new Error('Invalid entry data received from Firestore');
          }
        });

        return entries;
      } catch (error) {
        return handleFirestoreError(error, 'fetch stock entries');
      }
    }, 'fetch stock entries');
  },

  async updateEntry(id: string, updates: Partial<StockEntry>): Promise<void> {
    return withRetry(async () => {
      try {
        if (!id) {
          throw new Error('Entry ID is required for update');
        }

        const docRef = doc(db, COLLECTION_NAME, id);
        const updateData: Record<string, any> = {};

        // Validate fields if they exist in updates
        if ('stockName' in updates) {
          updateData.stockName = validateString(updates.stockName, 'Stock name');
        }
        if ('symbol' in updates) {
          updateData.symbol = validateString(updates.symbol, 'Symbol');
        }
        if ('priceBuy' in updates) {
          updateData.priceBuy = validateNumericField(updates.priceBuy, 'Buy price');
        }
        if ('priceSell' in updates) {
          updateData.priceSell = validateNumericField(updates.priceSell, 'Sell price');
        }
        if ('targetPercent' in updates) {
          updateData.targetPercent = validateNumericField(updates.targetPercent, 'Target percentage');
        }
        if ('stopLossPercent' in updates) {
          updateData.stopLossPercent = validateNumericField(updates.stopLossPercent, 'Stop loss percentage');
        }
        if ('reason' in updates) {
          updateData.reason = validateString(updates.reason, 'Reason');
        }
        if ('confidence' in updates) {
          const confidence = validateString(updates.confidence, 'Confidence');
          if (!['Low', 'Medium', 'High'].includes(confidence)) {
            throw new Error('Invalid confidence level');
          }
          updateData.confidence = confidence;
        }

        // Handle dates
        if ('dateBuy' in updates) {
          updateData.dateBuy = Timestamp.fromDate(new Date(updates.dateBuy));
        }
        if ('dateSell' in updates) {
          updateData.dateSell = updates.dateSell ? Timestamp.fromDate(new Date(updates.dateSell)) : null;
        }

        updateData.updatedAt = Timestamp.now();

        const cleanedUpdates = removeUndefinedValues(updateData);
        await updateDoc(docRef, cleanedUpdates);
      } catch (error) {
        handleFirestoreError(error, 'update stock entry');
      }
    }, 'update stock entry');
  },

  async deleteEntry(id: string): Promise<void> {
    return withRetry(async () => {
      try {
        if (!id) {
          throw new Error('Entry ID is required for deletion');
        }

        const docRef = doc(db, COLLECTION_NAME, id);
        await deleteDoc(docRef);
      } catch (error) {
        handleFirestoreError(error, 'delete stock entry');
      }
    }, 'delete stock entry');
  }
};