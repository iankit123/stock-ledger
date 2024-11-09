// client/src/components/LivePrice.tsx

import useSWR from "swr";
import { Card } from "@/components/ui/card";
import { ArrowUp, ArrowDown, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";

interface LivePriceProps {
  symbol: string;
}

export default function LivePrice({ symbol }: LivePriceProps) {
  const [retryCount, setRetryCount] = useState(0);

  const { data, error, isLoading, mutate } = useSWR(
    symbol ? `/api/stock/${symbol}` : null,
    {
      refreshInterval: 10000,
      dedupingInterval: 5000,
      errorRetryCount: 3,
      errorRetryInterval: 5000,
      onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
        // Don't retry on 404s or rate limits
        if (error.status === 404 || error.status === 429) return;

        // Only retry up to 3 times
        if (retryCount >= 3) return;

        // Retry after 5 seconds
        setTimeout(() => revalidate({ retryCount }), 5000);
        setRetryCount(retryCount);
      }
    }
  );

  useEffect(() => {
    // Reset retry count when symbol changes
    setRetryCount(0);
  }, [symbol]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-36" />
        <Skeleton className="h-4 w-48" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border border-destructive/50 rounded-lg bg-destructive/10">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>{error.info?.details || "Error loading price data"}</span>
        </div>
        {retryCount > 0 && (
          <p className="text-sm text-muted-foreground mt-1">
            Retrying... Attempt {retryCount}/3
          </p>
        )}
        <button 
          onClick={() => mutate()} 
          className="text-sm text-primary hover:underline mt-2"
        >
          Try again
        </button>
      </div>
    );
  }

  const result = data?.chart?.result?.[0];
  if (!result?.meta) {
    return (
      <div className="p-4 border border-destructive/50 rounded-lg bg-destructive/10">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>Invalid price data received</span>
        </div>
      </div>
    );
  }

  const meta = result.meta;
  const currentPrice = Number(meta.regularMarketPrice);
  const previousClose = Number(meta.previousClose);
  const priceChange = currentPrice - previousClose;
  const priceChangePercent = (priceChange / previousClose) * 100;
  const formattedCurrency = symbol.endsWith('.NS') ? '₹' : '$';

  return (
    <div>
      <div className="text-sm text-muted-foreground mb-1">Current Price</div>
      <div className="text-3xl font-bold">
        {formattedCurrency}{currentPrice.toFixed(2)}
      </div>
      <div className={`flex items-center mt-2 ${priceChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
        {priceChange >= 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
        <span className="ml-1">
          {formattedCurrency}{Math.abs(priceChange).toFixed(2)} ({Math.abs(priceChangePercent).toFixed(2)}%)
        </span>
      </div>
    </div>
  );
}