import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import useSWR from "swr";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";

interface StockChartProps {
  symbol: string;
}

export default function StockChart({ symbol }: StockChartProps) {
  const { data, error, isLoading } = useSWR(`/api/stock/${symbol}`);

  if (isLoading) {
    return (
      <div>
        <h2 className="text-xl font-semibold mb-4">{symbol} Price History</h2>
        <Skeleton className="w-full h-[400px]" />
      </div>
    );
  }

  if (error || !data?.chart?.result?.[0]) {
    return (
      <div className="p-4 border border-destructive/50 rounded-lg bg-destructive/10">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>Error loading chart data</span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {error?.response?.data?.details || error?.message || "Unable to load price history"}
        </p>
      </div>
    );
  }

  const chartData = data.chart.result[0];
  const { timestamp, indicators } = chartData;
  
  if (!Array.isArray(timestamp) || !indicators?.quote?.[0]?.close) {
    return (
      <div className="p-4 border border-destructive/50 rounded-lg bg-destructive/10">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>Invalid chart data</span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Price history data is not available
        </p>
      </div>
    );
  }

  const prices = indicators.quote[0].close;
  const formattedData = timestamp
    .map((time: number, index: number) => {
      const price = prices[index];
      if (typeof price !== 'number' || isNaN(price)) return null;
      
      return {
        date: new Date(time * 1000).toLocaleDateString(),
        price: price.toFixed(2)
      };
    })
    .filter((item): item is { date: string; price: string } => item !== null);

  if (formattedData.length === 0) {
    return (
      <div className="p-4 border border-destructive/50 rounded-lg bg-destructive/10">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>No valid price data</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[400px] w-full">
      <h2 className="text-xl font-semibold mb-4">{symbol} Price History</h2>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={formattedData}>
          <XAxis 
            dataKey="date"
            tick={{ fontSize: 12 }}
            interval="preserveStartEnd"
          />
          <YAxis 
            domain={['auto', 'auto']}
            tick={{ fontSize: 12 }}
            width={60}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))'
            }}
            labelStyle={{ color: 'hsl(var(--foreground))' }}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
