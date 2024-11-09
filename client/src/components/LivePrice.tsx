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
      refreshInterval: 10000 // Refresh every 10 seconds
    }
  );

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-40" />
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
          {error?.message || "Please check the stock symbol and try again"}
        </p>
      </div>
    );
  }

  const meta = data.chart.result[0].meta;
  const currentPrice = meta.regularMarketPrice;
  const previousClose = meta.previousClose;
  const priceChange = currentPrice - previousClose;
  const priceChangePercent = (priceChange / previousClose) * 100;

  const formattedCurrency = meta.currency === 'INR' ? '₹' : '$';

  return (
    <div>
      <div className="text-sm text-muted-foreground">Current Price</div>
      <div className="text-3xl font-bold">
        {formattedCurrency}{currentPrice?.toFixed(2)}
      </div>
      <div className={`flex items-center ${priceChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
        {priceChange >= 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
        <span className="ml-1">
          {formattedCurrency}{Math.abs(priceChange).toFixed(2)} ({Math.abs(priceChangePercent).toFixed(2)}%)
        </span>
      </div>
    </div>
  );
}
