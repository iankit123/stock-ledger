import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Switch, Route } from "wouter";
import "./index.css";
import { SWRConfig } from "swr";
import { fetcher } from "./lib/fetcher";
import StockDashboard from "./pages/StockDashboard";
import { Toaster } from "@/components/ui/toaster";

// SWR configuration with optimized retry logic
const swrConfig = {
  fetcher,
  // Reduce retries to 2 times
  errorRetryCount: 2,
  // Longer retry intervals with exponential backoff
  errorRetryInterval: (retryCount: number) => Math.min(3000 * 2 ** retryCount, 30000),
  // Don't retry for client errors or rate limits
  shouldRetryOnError: (err: any) => {
    if (!err.response) return true; // Retry network errors
    const status = err.response.status;
    // Don't retry 4xx errors or rate limits
    return status >= 500 && status !== 429;
  },
  // Increased deduplication interval
  dedupingInterval: 3000,
  // Keep previous data while revalidating
  keepPreviousData: true,
  // Reduced revalidation interval
  refreshInterval: 60000, // 1 minute
  // Focus revalidation
  revalidateOnFocus: true,
  // Network revalidation
  revalidateOnReconnect: true,
  onError: (error: any, key: string) => {
    // Log errors but prevent console spam
    if (!error.response?.data?.code?.includes('RATE_LIMIT')) {
      console.error("SWR Error:", { key, info: error.response?.data || error });
    }
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
