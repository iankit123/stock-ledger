import type { Express } from "express";
import { WebSocketServer } from "ws";
import http from "http";

export function registerRoutes(app: Express) {
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });

  // Mock WebSocket updates
  wss.on("connection", (ws) => {
    setInterval(() => {
      const mockPrice = 150 + Math.random() * 10;
      ws.send(JSON.stringify({
        symbol: "AAPL",
        price: mockPrice
      }));
    }, 1000);
  });

  app.get("/api/search", (req, res) => {
    const { query } = req.query;
    // Mock search results
    res.json([
      { symbol: "AAPL", name: "Apple Inc." },
      { symbol: "MSFT", name: "Microsoft Corporation" }
    ]);
  });

  app.get("/api/history/:symbol", (req, res) => {
    const { symbol } = req.params;
    // Mock historical data
    const data = Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      price: 150 + Math.random() * 20
    }));
    res.json(data);
  });

  app.get("/api/stats/:symbol", (req, res) => {
    const { symbol } = req.params;
    // Mock statistics
    res.json({
      open: 150.25,
      high: 152.50,
      low: 149.75,
      volume: 1234567
    });
  });

  return server;
}
