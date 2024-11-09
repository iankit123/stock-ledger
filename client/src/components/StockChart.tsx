import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import useSWR from "swr";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface StockChartProps {
  symbol: string;
}

export default function StockChart({ symbol }: StockChartProps) {
  const { data, error, isLoading } = useSWR(`/api/stock/${symbol}`);

  if (isLoading) {
    return <Skeleton className="w-full h-[400px]" />;
  }

  if (error) {
    return <div>Error loading chart data</div>;
  }

  const chartData = data?.chart?.result?.[0];
  if (!chartData) return null;

  const { timestamp, indicators } = chartData;
  const prices = indicators.quote[0].close;

  const formattedData = timestamp.map((time: number, index: number) => ({
    date: new Date(time * 1000).toLocaleDateString(),
    price: prices[index]?.toFixed(2)
  })).filter((item: any) => item.price);

  return (
    <div className="h-[400px] w-full">
      <h2 className="text-xl font-semibold mb-4">{symbol} Price History</h2>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={formattedData}>
          <XAxis dataKey="date" />
          <YAxis domain={['auto', 'auto']} />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="price"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
