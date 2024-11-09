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

function isValidStockSymbol(symbol: string): boolean {
  const isNSEStock = symbol.endsWith('.NS');
  const baseSymbol = isNSEStock ? symbol.slice(0, -3) : symbol;
  
  if (isNSEStock) {
    return /^[A-Z]+$/.test(baseSymbol) || /^[0-9]{6}$/.test(baseSymbol);
  }
  
  return /^[A-Z]{1,5}$/.test(symbol);
}

function validateYahooResponse(data: YahooFinanceResponse) {
  if (!data?.chart?.result?.[0]) {
    throw new Error("Invalid response structure");
  }

  const result = data.chart.result[0];
  if (!result.meta?.regularMarketPrice || !result.timestamp || !result.indicators?.quote?.[0]) {
    throw new Error("Missing required data fields");
  }

  return result;
}

export function registerRoutes(app: Express) {
  app.get("/api/stock/:symbol", async (req, res) => {
    try {
      const { symbol } = req.params;
      
      if (!symbol) {
        return res.status(400).json({ 
          error: "Missing symbol",
          details: "Stock symbol is required",
          code: "MISSING_SYMBOL"
        });
      }

      if (!isValidStockSymbol(symbol)) {
        return res.status(400).json({ 
          error: "Invalid symbol format",
          details: symbol.includes('.NS') 
            ? "Indian stock symbols should be in the format 'SYMBOL.NS' (e.g., RELIANCE.NS)"
            : "US stock symbols should be 1-5 uppercase letters (e.g., AAPL)",
          code: "INVALID_SYMBOL_FORMAT"
        });
      }

      const response = await axios.get<YahooFinanceResponse>(
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`,
        {
          params: {
            interval: "1d",
            range: "1mo"
          },
          timeout: 5000
        }
      );

      if (response.data.chart?.error) {
        return res.status(404).json({ 
          error: "Stock not found",
          details: response.data.chart.error.description,
          code: "STOCK_NOT_FOUND",
          symbol
        });
      }

      try {
        const result = validateYahooResponse(response.data);
        res.json(response.data);
      } catch (validationError: any) {
        return res.status(500).json({
          error: "Data validation failed",
          details: validationError.message,
          code: "VALIDATION_ERROR"
        });
      }

    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          return res.status(504).json({
            error: "Request timeout",
            details: "The request to Yahoo Finance timed out",
            code: "TIMEOUT"
          });
        }
        if (error.response?.status === 404) {
          return res.status(404).json({ 
            error: "Stock not found",
            details: `No data available for symbol: ${req.params.symbol}`,
            code: "NOT_FOUND"
          });
        }
        if (error.response?.status === 400) {
          return res.status(400).json({ 
            error: "Invalid request",
            details: "Please check the stock symbol and try again",
            code: "BAD_REQUEST"
          });
        }
      }
      
      res.status(500).json({ 
        error: "Server error",
        details: "Unable to fetch stock data. Please try again later.",
        code: "INTERNAL_ERROR"
      });
    }
  });

  app.get("/api/search", async (req, res) => {
    try {
      const { query } = req.query;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ 
          error: "Invalid query",
          details: "Search query is required",
          code: "MISSING_QUERY"
        });
      }

      if (query.length < 1) {
        return res.status(400).json({
          error: "Invalid query",
          details: "Search term must be at least 1 character long",
          code: "INVALID_QUERY_LENGTH"
        });
      }

      const response = await axios.get(
        `https://query1.finance.yahoo.com/v1/finance/search`,
        {
          params: {
            q: query,
            quotesCount: 10,
            lang: "en-US"
          },
          timeout: 5000
        }
      );

      const quotes = response.data?.quotes || [];
      
      const formattedQuotes = quotes
        .filter((quote: any) => {
          return quote?.symbol && 
                 (quote?.longname || quote?.shortname) && 
                 (quote?.quoteType === 'EQUITY');
        })
        .map((quote: any) => ({
          symbol: quote.symbol,
          name: quote.longname || quote.shortname,
          exchange: quote.exchange,
          type: quote.quoteType
        }));

      if (formattedQuotes.length === 0) {
        return res.status(404).json({
          error: "No results",
          details: "No matching stocks found. Try a different search term",
          code: "NO_RESULTS"
        });
      }

      res.json(formattedQuotes);
    } catch (error: any) {
      if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
        return res.status(504).json({
          error: "Search timeout",
          details: "The search request timed out. Please try again",
          code: "TIMEOUT"
        });
      }

      res.status(500).json({ 
        error: "Search failed",
        details: "Unable to search stocks. Please try again later.",
        code: "SEARCH_ERROR"
      });
    }
  });

  return app;
}
