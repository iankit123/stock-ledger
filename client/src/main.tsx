import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Switch, Route } from "wouter";
import "./index.css";
import { SWRConfig } from "swr";
import { fetcher } from "./lib/fetcher";
import StockDashboard from "./pages/StockDashboard";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "./contexts/AuthContext";

// SWR configuration with consistent loading states
const swrConfig = {
  fetcher,
  // Reduce retries and add loading delay for consistency
  loadingTimeout: 3000,
  errorRetryCount: 2,
  // Use fixed retry interval to prevent inconsistency
  errorRetryInterval: 3000,
  // Don't retry for client errors or rate limits
  shouldRetryOnError: (err: any) => {
    if (!err.response) return true; // Retry network errors
    const status = err.response.status;
    // Don't retry 4xx errors or rate limits
    return status >= 500 && status !== 429;
  },
  // Increased deduplication interval for better caching
  dedupingInterval: 5000,
  // Keep previous data while revalidating for smoother transitions
  keepPreviousData: true,
  // Reduced revalidation interval
  refreshInterval: 30000, // 30 seconds
  // Focus revalidation with delay
  revalidateOnFocus: false,
  // Network revalidation with delay
  revalidateOnReconnect: true,
  // Consistent error handling
  onError: (error: any, key: string) => {
    // Log errors but prevent console spam
    if (!error.response?.data?.code?.includes('RATE_LIMIT')) {
      console.error("SWR Error:", { key, info: error.response?.data || error });
    }
  },
  // Add loading delay for consistent UI
  onLoadingSlow: (key: string) => {
    console.warn("Slow loading detected:", key);
  }
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <SWRConfig value={swrConfig}>
        <Switch>
          <Route path="/" component={StockDashboard} />
          <Route>404 Page Not Found</Route>
        </Switch>
        <Toaster />
      </SWRConfig>
    </AuthProvider>
  </StrictMode>
);
