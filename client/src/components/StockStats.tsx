import useSWR from "swr";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";

interface StockStatsProps {
  symbol: string;
}

export default function StockStats({ symbol }: StockStatsProps) {
  const { data, error, isLoading } = useSWR(`/api/stock/${symbol}`);

  if (isLoading) {
    return (
      <div>
        <h2 className="text-xl font-semibold mb-4">Key Statistics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-4 w-16 mb-2" />
              <Skeleton className="h-8 w-24" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data?.chart?.result?.[0]?.meta) {
    return (
      <div className="p-4 border border-destructive/50 rounded-lg bg-destructive/10">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>Error loading statistics</span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {error?.response?.data?.details || error?.message || "Unable to fetch stock statistics"}
        </p>
      </div>
    );
  }

  const meta = data.chart.result[0].meta;
  
  const formatValue = (value: number | undefined, isVolume = false): string => {
    if (value === undefined || value === null || isNaN(value)) {
      return "N/A";
    }
    if (isVolume) {
      return value.toLocaleString();
    }
    return value.toFixed(2);
  };

  const formattedCurrency = symbol.endsWith('.NS') ? '₹' : '$';

  const stats = [
    { title: "Open", value: formatValue(meta.regularMarketOpen), prefix: formattedCurrency },
    { title: "High", value: formatValue(meta.regularMarketDayHigh), prefix: formattedCurrency },
    { title: "Low", value: formatValue(meta.regularMarketDayLow), prefix: formattedCurrency },
    { title: "Volume", value: formatValue(meta.regularMarketVolume, true), prefix: "" }
  ];

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Key Statistics</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <StatCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            prefix={stat.prefix}
          />
        ))}
      </div>
    </div>
  );
}

function StatCard({ title, value, prefix }: { title: string; value: string; prefix: string }) {
  return (
    <Card className="p-4">
      <div className="text-sm text-muted-foreground">{title}</div>
      <div className="text-2xl font-bold mt-1">
        {value === "N/A" ? value : `${prefix}${value}`}
      </div>
    </Card>
  );
}
