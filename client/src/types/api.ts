// types/api.ts

export interface APIError {
  error: string;
  details: string;
  code: string;
}

export interface YahooFinanceResponse {
  chart?: {
    result?: Array<{
      meta?: {
        symbol: string;
        regularMarketPrice: number;
        previousClose: number;
        currency: string;
        exchangeName: string;
        regularMarketOpen: number;
        regularMarketDayHigh: number;
        regularMarketDayLow: number;
        regularMarketVolume: number;
      };
      timestamp: number[];
      indicators: {
        quote: Array<{
          close: number[];
          volume?: number[];
          open?: number[];
          high?: number[];
          low?: number[];
        }>;
      };
    }>;
    error?: {
      code: string;
      description: string;
    };
  };
}