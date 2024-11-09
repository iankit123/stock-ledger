import useSWR from "swr";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface StockStatsProps {
  symbol: string;
}

export default function StockStats({ symbol }: StockStatsProps) {
  const { data, error, isLoading } = useSWR(`/api/stock/${symbol}`);

  if (isLoading) {
    return <Skeleton className="w-full h-32" />;
  }

  if (error) {
    return <div>Error loading statistics</div>;
  }

  const quote = data?.chart?.result?.[0]?.indicators?.quote?.[0];
  const meta = data?.chart?.result?.[0]?.meta;

  if (!quote || !meta) return null;

  const stats = {
    open: meta.regularMarketOpen?.toFixed(2),
    high: meta.regularMarketDayHigh?.toFixed(2),
    low: meta.regularMarketDayLow?.toFixed(2),
    volume: meta.regularMarketVolume?.toLocaleString()
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Key Statistics</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Open" value={stats.open} />
        <StatCard title="High" value={stats.high} />
        <StatCard title="Low" value={stats.low} />
        <StatCard title="Volume" value={stats.volume} />
      </div>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string | number }) {
  return (
    <Card className="p-4">
      <div className="text-sm text-muted-foreground">{title}</div>
      <div className="text-2xl font-bold">{value}</div>
    </Card>
  );
}
