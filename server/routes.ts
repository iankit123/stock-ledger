// server/routes.ts

import type { Express } from "express";
import axios from "axios";
import rateLimit from "express-rate-limit";

// Types
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
        fiftyTwoWeekHigh: number;
        fiftyTwoWeekLow: number;
        exchangeName: string;
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

// Configure rate limiters
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: "Too many requests",
    details: "Please try again later",
    code: "RATE_LIMIT_EXCEEDED"
  },
  standardHeaders: true,
  legacyHeaders: false
});

const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 search requests per minute
  message: {
    error: "Search rate limit exceeded",
    details: "Too many search requests. Please wait a minute",
    code: "SEARCH_RATE_LIMIT"
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Helper functions
function isValidStockSymbol(symbol: string): boolean {
  // Handle empty or invalid input
  if (!symbol || typeof symbol !== 'string') return false;

  const isNSEStock = symbol.endsWith('.NS');
  const baseSymbol = isNSEStock ? symbol.slice(0, -3) : symbol;

  if (isNSEStock) {
    // NSE stocks can be alphabetic or 6-digit numeric
    return /^[A-Z]+$/.test(baseSymbol) || /^[0-9]{6}$/.test(baseSymbol);
  }

  // US stocks are 1-5 uppercase letters
  return /^[A-Z]{1,5}$/.test(symbol);
}

function validateYahooResponse(data: YahooFinanceResponse) {
  if (!data?.chart?.result?.[0]) {
    throw new Error("Invalid response structure");
  }

  const result = data.chart.result[0];

  // Check for required fields
  if (!result.meta?.regularMarketPrice || !result.timestamp || !result.indicators?.quote?.[0]) {
    throw new Error("Missing required data fields");
  }

  return result;
}

// Export the main router configuration
export function registerRoutes(app: Express) {
  // Apply rate limiting to all API routes
  app.use('/api/', apiLimiter);

  // Additional rate limit for search endpoint
  app.use('/api/search', searchLimiter);

  // Stock data endpoint
  app.get("/api/stock/:symbol", async (req, res) => {
    try {
      const { symbol } = req.params;

      // Validate input
      if (!symbol) {
        return res.status(400).json({ 
          error: "Missing symbol",
          details: "Stock symbol is required",
          code: "MISSING_SYMBOL"
        });
      }

      // Validate symbol format
      if (!isValidStockSymbol(symbol)) {
        return res.status(400).json({ 
          error: "Invalid symbol format",
          details: symbol.includes('.NS') 
            ? "Indian stock symbols should be in the format 'SYMBOL.NS' (e.g., RELIANCE.NS)"
            : "US stock symbols should be 1-5 uppercase letters (e.g., AAPL)",
          code: "INVALID_SYMBOL_FORMAT"
        });
      }

      // Log request for debugging
      console.log(`Fetching data for symbol: ${symbol}`);

      // Make request to Yahoo Finance
      const response = await axios.get<YahooFinanceResponse>(
        `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`,
        {
          params: {
            interval: '1m',
            range: '1d',
            includePrePost: false
          },
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          timeout: 10000 // 10 second timeout
        }
      );

      // Check for Yahoo API errors
      if (response.data?.chart?.error) {
        console.log('Yahoo API Error:', response.data.chart.error);
        return res.status(404).json({
          error: "Stock not found",
          details: response.data.chart.error.description,
          code: "STOCK_NOT_FOUND",
          symbol
        });
      }

      // Validate response data
      try {
        validateYahooResponse(response.data);
      } catch (validationError: any) {
        console.error('Validation Error:', validationError);
        return res.status(500).json({
          error: "Invalid response",
          details: validationError.message,
          code: "VALIDATION_ERROR"
        });
      }

      // Send successful response
      res.json(response.data);

    } catch (error: any) {
      console.error('Stock API Error:', error);

      // Handle Axios errors
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          return res.status(504).json({
            error: "Request timeout",
            details: "The request to Yahoo Finance timed out",
            code: "TIMEOUT"
          });
        }

        if (error.response?.status === 429) {
          return res.status(429).json({
            error: "Rate limit exceeded",
            details: "Too many requests to Yahoo Finance API",
            code: "YAHOO_RATE_LIMIT"
          });
        }

        if (error.response?.status === 404) {
          return res.status(404).json({ 
            error: "Stock not found",
            details: `No data available for symbol: ${req.params.symbol}`,
            code: "NOT_FOUND"
          });
        }

        // Handle other Axios errors
        return res.status(error.response?.status || 500).json({
          error: "API error",
          details: error.response?.data?.error || error.message,
          code: "API_ERROR"
        });
      }

      // Handle all other errors
      res.status(500).json({ 
        error: "Server error",
        details: error instanceof Error ? error.message : "An unknown error occurred",
        code: "INTERNAL_ERROR"
      });
    }
  });

  // Search endpoint
  // server/routes.ts - Update the search endpoint

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

      // Clean the query
      const cleanQuery = query.trim().toUpperCase();

      // Create NSE specific query
      const searchQuery = cleanQuery.endsWith('.NS') ? cleanQuery : `${cleanQuery}.NS`;

      const response = await axios.get(
        `https://query1.finance.yahoo.com/v1/finance/search`,
        {
          params: {
            q: searchQuery,
            quotesCount: 10,
            newsCount: 0,
            enableFuzzyQuery: false,
            quotesQueryId: 'tss_match_phrase_query'
          },
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          timeout: 5000
        }
      );

      // Filter for NSE stocks only
      const quotes = response.data.quotes || [];
      const formattedResults = quotes
        .filter((quote: any) => (
          quote?.symbol &&
          quote.symbol.endsWith('.NS') &&
          (quote?.longname || quote?.shortname) &&
          quote?.quoteType === 'EQUITY'
        ))
        .map((quote: any) => ({
          symbol: quote.symbol,
          name: quote.longname || quote.shortname,
          exchange: 'NSE',
          market: 'NSE'
        }))
        .slice(0, 10);

      // If no NSE results found, try without .NS suffix
      if (formattedResults.length === 0) {
        const altResponse = await axios.get(
          `https://query1.finance.yahoo.com/v1/finance/search`,
          {
            params: {
              q: cleanQuery,
              quotesCount: 10,
              newsCount: 0
            },
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 5000
          }
        );

        const altResults = (altResponse.data.quotes || [])
          .filter((quote: any) => (
            quote?.symbol &&
            quote.symbol.endsWith('.NS') &&
            quote?.quoteType === 'EQUITY'
          ))
          .map((quote: any) => ({
            symbol: quote.symbol,
            name: quote.longname || quote.shortname,
            exchange: 'NSE',
            market: 'NSE'
          }))
          .slice(0, 10);

        if (altResults.length > 0) {
          return res.json(altResults);
        }
      }

      if (formattedResults.length === 0) {
        return res.status(404).json({
          error: "No results",
          details: "No matching NSE stocks found",
          code: "NO_RESULTS"
        });
      }

      res.json(formattedResults);

    } catch (error: any) {
      console.error('Search API Error:', error);

      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          return res.status(504).json({
            error: "Search timeout",
            details: "The search request timed out",
            code: "TIMEOUT"
          });
        }

        if (error.response?.status === 429) {
          return res.status(429).json({
            error: "Rate limit exceeded",
            details: "Too many requests to Yahoo Finance API",
            code: "YAHOO_RATE_LIMIT"
          });
        }
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