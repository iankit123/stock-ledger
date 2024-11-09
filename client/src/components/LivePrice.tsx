import useSWR from "swr";
import { Card } from "@/components/ui/card";
import { ArrowUp, ArrowDown, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface LivePriceProps {
  symbol: string;
}

export default function LivePrice({ symbol }: LivePriceProps) {
  const { data, error, isLoading } = useSWR(
    `/api/stock/${symbol}`,
    {
      refreshInterval: 10000, // Refresh every 10 seconds
      dedupingInterval: 5000 // Prevent multiple requests within 5 seconds
    }
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-36" />
        <Skeleton className="h-4 w-48" />
      </div>
    );
  }

  if (error || !data?.chart?.result?.[0]?.meta) {
    return (
      <div className="p-4 border border-destructive/50 rounded-lg bg-destructive/10">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>Error loading price data</span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {error?.response?.data?.details || error?.message || "Unable to fetch current price"}
        </p>
      </div>
    );
  }

  const meta = data.chart.result[0].meta;
  const currentPrice = Number(meta.regularMarketPrice);
  const previousClose = Number(meta.previousClose);
  
  // Handle invalid price data
  if (isNaN(currentPrice) || isNaN(previousClose)) {
    return (
      <div className="p-4 border border-destructive/50 rounded-lg bg-destructive/10">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>Invalid price data</span>
        </div>
      </div>
    );
  }

  const priceChange = currentPrice - previousClose;
  const priceChangePercent = (priceChange / previousClose) * 100;

  // Use ₹ for .NS stocks (Indian stocks), $ for others
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
