export interface StockData {
  symbol: string;
  price: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  date: string;
}

export interface StockHistoryData {
  date: string;
  price: number;
}

export interface StockStats {
  open: number;
  high: number;
  low: number;
  volume: number;
}
