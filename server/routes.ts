import type { Express } from "express";
import axios from "axios";

interface YahooFinanceResponse {
  chart?: {
    result?: Array<{
      meta?: {
        symbol: string;
        regularMarketPrice: number;
        previousClose: number;
        currency: string;
        regularMarketOpen: number;
        regularMarketDayHigh: number;
        regularMarketDayLow: number;
        regularMarketVolume: number;
      };
      timestamp: number[];
      indicators: {
        quote: Array<{
          close: number[];
        }>;
      };
    }>;
    error?: {
      code: string;
      description: string;
    };
  };
}

function isValidStockSymbol(symbol: string): boolean {
  // Basic validation for stock symbols
  const isNSEStock = symbol.endsWith('.NS');
  const baseSymbol = isNSEStock ? symbol.slice(0, -3) : symbol;
  
  // NSE stocks: alphabetic or 6-digit code
  if (isNSEStock) {
    return /^[A-Z]+$/.test(baseSymbol) || /^[0-9]{6}$/.test(baseSymbol);
  }
  
  // US stocks: 1-5 alphabetic characters
  return /^[A-Z]{1,5}$/.test(symbol);
}

export function registerRoutes(app: Express) {
  app.get("/api/stock/:symbol", async (req, res) => {
    try {
      const { symbol } = req.params;
      
      if (!symbol) {
        return res.status(400).json({ 
          error: "Stock symbol is required",
          details: "Please provide a valid stock symbol" 
        });
      }

      if (!isValidStockSymbol(symbol)) {
        return res.status(400).json({ 
          error: "Invalid stock symbol format",
          details: symbol.includes('.NS') 
            ? "Indian stock symbols should be in the format 'SYMBOL.NS' (e.g., RELIANCE.NS)"
            : "US stock symbols should be 1-5 uppercase letters (e.g., AAPL)" 
        });
      }

      const response = await axios.get<YahooFinanceResponse>(
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`,
        {
          params: {
            interval: "1d",
            range: "1mo"
          }
        }
      );

      if (response.data.chart?.error) {
        return res.status(404).json({ 
          error: "Stock not found",
          details: response.data.chart.error.description,
          symbol
        });
      }

      const result = response.data.chart?.result?.[0];
      if (!result?.meta) {
        return res.status(500).json({ 
          error: "Invalid data format",
          details: "Unable to fetch stock data. Please try again later." 
        });
      }

      res.json(response.data);
    } catch (error: any) {
      if (error.response?.status === 404) {
        res.status(404).json({ 
          error: "Stock not found",
          details: `No data available for symbol: ${req.params.symbol}`
        });
      } else if (error.response?.status === 400) {
        res.status(400).json({ 
          error: "Invalid request",
          details: "Please check the stock symbol and try again"
        });
      } else {
        res.status(500).json({ 
          error: "Server error",
          details: "Unable to fetch stock data. Please try again later."
        });
      }
    }
  });

  app.get("/api/search", async (req, res) => {
    try {
      const { query } = req.query;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ 
          error: "Invalid search query",
          details: "Please provide a valid search term"
        });
      }

      if (query.length < 1) {
        return res.status(400).json({
          error: "Invalid search query",
          details: "Search term must be at least 1 character long"
        });
      }

      const response = await axios.get(
        `https://query1.finance.yahoo.com/v1/finance/search`,
        {
          params: {
            q: query,
            quotesCount: 10,
            lang: "en-US"
          }
        }
      );

      const quotes = response.data.quotes || [];
      
      const formattedQuotes = quotes
        .filter((quote: any) => quote.symbol && (quote.longname || quote.shortname))
        .map((quote: any) => ({
          symbol: quote.symbol,
          name: quote.longname || quote.shortname,
          exchange: quote.exchange,
          type: quote.quoteType
        }));

      if (formattedQuotes.length === 0) {
        return res.status(404).json({
          error: "No results found",
          details: "Try a different search term"
        });
      }

      res.json(formattedQuotes);
    } catch (error: any) {
      res.status(500).json({ 
        error: "Search failed",
        details: "Unable to search stocks. Please try again later."
      });
    }
  });

  return app;
}
