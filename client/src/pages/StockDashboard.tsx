import { useState } from "react";
import { Card } from "@/components/ui/card";
import StockSearch from "@/components/StockSearch";
import StockChart from "@/components/StockChart";
import StockStats from "@/components/StockStats";
import LivePrice from "@/components/LivePrice";
import { useToast } from "@/hooks/use-toast";

export default function StockDashboard() {
  const [selectedSymbol, setSelectedSymbol] = useState<string>("");
  const { toast } = useToast();

  const handleSymbolSelect = (symbol: string) => {
    setSelectedSymbol(symbol);
    toast({
      title: "Stock Selected",
      description: `Now tracking ${symbol}`,
    });
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <h1 className="text-4xl font-bold tracking-tight">Stock Tracker</h1>
        
        <div className="grid gap-6 md:grid-cols-4">
          <Card className="md:col-span-4 p-4">
            <StockSearch onSelect={handleSymbolSelect} />
          </Card>

          {selectedSymbol && (
            <>
              <Card className="md:col-span-1 p-4">
                <LivePrice symbol={selectedSymbol} />
              </Card>
              
              <Card className="md:col-span-3 p-4">
                <StockStats symbol={selectedSymbol} />
              </Card>
              
              <Card className="md:col-span-4 p-4">
                <StockChart symbol={selectedSymbol} />
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
