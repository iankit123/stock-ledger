// types/stocks.ts

export interface StockData {
  symbol: string;
  name?: string;
  price: number;
  change: number;
  percentChange: number;
  currency: string;
  exchange: string;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
  previousClose?: number;
}

export interface StockSearchResult {
  symbol: string;
  name: string;
  exchange: string;
  market: string;
}

export type ChartTimeframe = '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '5y' | 'max';
export type ChartInterval = '1m' | '5m' | '15m' | '30m' | '60m' | '1d' | '1wk' | '1mo';