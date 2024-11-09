import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Switch, Route } from "wouter";
import "./index.css";
import { SWRConfig } from "swr";
import { fetcher } from "./lib/fetcher";
import StockDashboard from "./pages/StockDashboard";
import { Toaster } from "@/components/ui/toaster";

// SWR configuration with retry logic and exponential backoff
const swrConfig = {
  fetcher,
  // Retry failed requests up to 3 times
  errorRetryCount: 3,
  // Implement exponential backoff for retries
  errorRetryInterval: (retryCount: number) => Math.min(1000 * 2 ** retryCount, 30000),
  // Don't retry for 4xx errors, only retry for network/timeout issues
  shouldRetryOnError: (err: any) => {
    return !err.response || err.response.status >= 500;
  },
  // Revalidate data every 30 seconds
  refreshInterval: 30000,
  // Deduplicate requests within 2 seconds
  dedupingInterval: 2000,
  // Keep previous data visible while revalidating
  keepPreviousData: true,
  // Revalidate on window focus
  revalidateOnFocus: true,
  // Automatically revalidate after regaining network connection
  revalidateOnReconnect: true,
  onError: (error: any) => {
    console.error("SWR Error:", error);
  }
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SWRConfig value={swrConfig}>
      <Switch>
        <Route path="/" component={StockDashboard} />
        <Route>404 Page Not Found</Route>
      </Switch>
      <Toaster />
    </SWRConfig>
  </StrictMode>
);
