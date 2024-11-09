import type { Express } from "express";
import axios from "axios";

interface YahooFinanceResponse {
  chart?: {
    result?: Array<{
      meta?: {
        symbol: string;
        regularMarketPrice: number;
        previousClose: number;
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

export function registerRoutes(app: Express) {
  app.get("/api/stock/:symbol", async (req, res) => {
    try {
      const { symbol } = req.params;
      
      if (!symbol) {
        return res.status(400).json({ error: "Stock symbol is required" });
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

      // Check for Yahoo Finance API error response
      if (response.data.chart?.error) {
        return res.status(404).json({ 
          error: "Stock not found",
          details: response.data.chart.error.description
        });
      }

      // Validate response format
      const result = response.data.chart?.result?.[0];
      if (!result?.meta?.regularMarketPrice || !result.timestamp || !result.indicators.quote[0]) {
        return res.status(500).json({ 
          error: "Invalid data format received from Yahoo Finance" 
        });
      }

      res.json(response.data);
    } catch (error: any) {
      if (error.response?.status === 404) {
        res.status(404).json({ error: "Stock symbol not found" });
      } else if (error.response?.status === 400) {
        res.status(400).json({ error: "Invalid stock symbol" });
      } else {
        res.status(500).json({ 
          error: "Failed to fetch stock data",
          details: error.message 
        });
      }
    }
  });

  app.get("/api/search", async (req, res) => {
    try {
      const { query } = req.query;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: "Search query is required" });
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
      
      // Filter and format search results
      const formattedQuotes = quotes.map((quote: any) => ({
        symbol: quote.symbol,
        name: quote.longname || quote.shortname,
        exchange: quote.exchange
      }));

      res.json(formattedQuotes);
    } catch (error: any) {
      res.status(500).json({ 
        error: "Failed to search stocks",
        details: error.message 
      });
    }
  });

  return app;
}
