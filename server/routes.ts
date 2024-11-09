import type { Express } from "express";
import axios from "axios";

export function registerRoutes(app: Express) {
  app.get("/api/stock/:symbol", async (req, res) => {
    try {
      const { symbol } = req.params;
      const response = await axios.get(
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`,
        {
          params: {
            interval: "1d",
            range: "1mo"
          }
        }
      );
      res.json(response.data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stock data" });
    }
  });

  app.get("/api/search", async (req, res) => {
    try {
      const { query } = req.query;
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
      res.json(response.data.quotes || []);
    } catch (error) {
      res.status(500).json({ error: "Failed to search stocks" });
    }
  });

  return app;
}
