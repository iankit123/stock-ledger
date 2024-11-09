import useSWR from "swr";
import { Card } from "@/components/ui/card";
import { ArrowUp, ArrowDown } from "lucide-react";
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
    return <Skeleton className="w-full h-24" />;
  }

  if (error) {
    return <div>Error loading price data</div>;
  }

  const currentPrice = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
  const previousClose = data?.chart?.result?.[0]?.meta?.previousClose;
  const priceChange = currentPrice - previousClose;
  const priceChangePercent = (priceChange / previousClose) * 100;

  return (
    <div>
      <div className="text-sm text-muted-foreground">Current Price</div>
      <div className="text-3xl font-bold">${currentPrice?.toFixed(2)}</div>
      <div className={`flex items-center ${priceChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
        {priceChange >= 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
        <span className="ml-1">
          ${Math.abs(priceChange).toFixed(2)} ({Math.abs(priceChangePercent).toFixed(2)}%)
        </span>
      </div>
    </div>
  );
}
