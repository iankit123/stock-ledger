// types/ledger.ts

export interface StockEntry {
  id: string;
  stockName: string;
  symbol: string;
  dateBuy: string;
  priceBuy: number;
  targetPercent: number;
  stopLossPercent: number;
  riskReward: number;
  reason: string;
  chartLink?: string;
  confidence: 'Low' | 'Medium' | 'High';
  profitLoss?: number;
  hitTarget?: boolean;
  hitStopLoss?: boolean;
  dateSell?: string;
  priceSell?: number;
  status: 'Active' | 'Closed';
  createdAt: string;
  updatedAt: string;
}

export type NewStockEntry = Omit<StockEntry, 'id' | 'createdAt' | 'updatedAt' | 'status'>;

export interface StockPosition {
  entry: StockEntry;
  currentPrice?: number;
  currentProfitLoss?: number;
  currentProfitLossPercent?: number;
  daysHeld: number;
}

export interface StockLedgerFilters {
  status?: 'Active' | 'Closed';
  confidence?: 'Low' | 'Medium' | 'High';
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface StockLedgerSummary {
  totalPositions: number;
  activePositions: number;
  closedPositions: number;
  totalInvestment: number;
  currentValue: number;
  overallProfitLoss: number;
  overallProfitLossPercent: number;
  winRate: number;
}