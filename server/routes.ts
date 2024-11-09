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

// Configure rate limiters with more restrictive limits and longer windows
const apiLimiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutes
  max: 150, // limit each IP to 150 requests per windowMs
  message: {
    error: "API rate limit exceeded",
    details: "Too many requests. Please try again in 30 minutes.",
    code: "RATE_LIMIT_EXCEEDED"
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: true // Don't count failed requests
});

const searchLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // limit each IP to 20 search requests per 5 minutes
  message: {
    error: "Search rate limit exceeded",
    details: "Too many search requests. Please wait 5 minutes before trying again.",
    code: "SEARCH_RATE_LIMIT"
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: true
});

// Exponential backoff configuration
const backoffConfig = {
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  factor: 2,
  retries: 3
};

// Helper function for exponential backoff
async function withBackoff(fn: () => Promise<any>, attempt = 1): Promise<any> {
  try {
    return await fn();
  } catch (error: any) {
    if (attempt > backoffConfig.retries || 
        error?.response?.status === 404 || 
        error?.response?.status === 400) {
      throw error;
    }

    const delay = Math.min(
      backoffConfig.initialDelay * Math.pow(backoffConfig.factor, attempt - 1),
      backoffConfig.maxDelay
    );

    await new Promise(resolve => setTimeout(resolve, delay));
    return withBackoff(fn, attempt + 1);
  }
}

// Helper functions
function isValidStockSymbol(symbol: string): boolean {
  if (!symbol || typeof symbol !== 'string') return false;

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

// Common headers for Yahoo Finance API requests
const yahooApiHeaders = {
  'Accept': 'application/json',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
  'Origin': 'https://finance.yahoo.com',
  'Referer': 'https://finance.yahoo.com/'
};

// Export the main router configuration
export function registerRoutes(app: Express) {
  app.use('/api/', apiLimiter);
  app.use('/api/search', searchLimiter);

  // Stock data endpoint
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

      const stockData = await withBackoff(async () => {
        const response = await axios.get<YahooFinanceResponse>(
          `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`,
          {
            params: {
              interval: '1m',
              range: '1d',
              includePrePost: false
            },
            headers: yahooApiHeaders,
            timeout: 15000
          }
        );

        if (response.data?.chart?.error) {
          throw {
            response: {
              status: 404,
              data: {
                error: "Stock not found",
                details: response.data.chart.error.description,
                code: "STOCK_NOT_FOUND",
                symbol
              }
            }
          };
        }

        validateYahooResponse(response.data);
        return response.data;
      });

      res.json(stockData);

    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          return res.status(504).json({
            error: "Request timeout",
            details: "The request to Yahoo Finance timed out. Please try again.",
            code: "TIMEOUT"
          });
        }

        if (error.response?.status === 429) {
          return res.status(429).json({
            error: "Rate limit exceeded",
            details: "Too many requests to Yahoo Finance API. Please wait a moment.",
            code: "YAHOO_RATE_LIMIT"
          });
        }

        if (error.response?.status === 404) {
          return res.status(404).json(error.response.data || { 
            error: "Stock not found",
            details: `No data available for symbol: ${req.params.symbol}`,
            code: "NOT_FOUND"
          });
        }

        return res.status(error.response?.status || 500).json({
          error: "API error",
          details: error.response?.data?.error || error.message,
          code: "API_ERROR"
        });
      }

      res.status(500).json({ 
        error: "Server error",
        details: error instanceof Error ? error.message : "An unknown error occurred",
        code: "INTERNAL_ERROR"
      });
    }
  });

  // Search endpoint with improved error handling and fallback
  app.get("/api/search", async (req, res) => {
    try {
      const { query } = req.query;

      if (!query || typeof query !== 'string') {
        return res.status(400).json({ 
          error: "Invalid query",
          details: "Search query must be a non-empty string",
          code: "INVALID_QUERY"
        });
      }

      if (query.length < 1 || query.length > 20) {
        return res.status(400).json({
          error: "Invalid query length",
          details: "Search query must be between 1 and 20 characters",
          code: "INVALID_QUERY_LENGTH"
        });
      }

      const cleanQuery = query.trim().toUpperCase().replace(/[^A-Z0-9.]/g, '');
      if (!cleanQuery) {
        return res.status(400).json({
          error: "Invalid characters",
          details: "Search query contains invalid characters",
          code: "INVALID_CHARACTERS"
        });
      }

      // Primary search with NSE suffix
      const searchQuery = cleanQuery.endsWith('.NS') ? cleanQuery : `${cleanQuery}.NS`;
      
      const searchStocks = async (q: string, fallback = false) => {
        return withBackoff(async () => {
          const response = await axios.get(
            `https://query1.finance.yahoo.com/v1/finance/search`,
            {
              params: {
                q,
                quotesCount: 10,
                newsCount: 0,
                enableFuzzyQuery: fallback,
                quotesQueryId: fallback ? 'tss_match_fuzzy_query' : 'tss_match_phrase_query'
              },
              headers: yahooApiHeaders,
              timeout: 10000
            }
          );

          return (response.data.quotes || [])
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
        });
      };

      // Try primary search first
      let results = await searchStocks(searchQuery);

      // If no results, try fallback search
      if (results.length === 0) {
        results = await searchStocks(cleanQuery, true);
      }

      if (results.length === 0) {
        return res.status(404).json({
          error: "No results",
          details: "No matching NSE stocks found. Try a different search term.",
          code: "NO_RESULTS"
        });
      }

      res.json(results);

    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          return res.status(504).json({
            error: "Search timeout",
            details: "The search request timed out. Please try again.",
            code: "TIMEOUT"
          });
        }

        if (error.response?.status === 429) {
          return res.status(429).json({
            error: "Rate limit exceeded",
            details: "Too many requests to Yahoo Finance API. Please wait a moment.",
            code: "YAHOO_RATE_LIMIT"
          });
        }

        return res.status(error.response?.status || 500).json({
          error: "API error",
          details: error.response?.data?.error || "Failed to search stocks",
          code: "API_ERROR"
        });
      }

      res.status(500).json({ 
        error: "Search failed",
        details: "Unable to search stocks. Please try again in a few moments.",
        code: "SEARCH_ERROR"
      });
    }
  });

  return app;
}
