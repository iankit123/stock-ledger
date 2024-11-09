import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import useSWR from "swr";
import { useToast } from "@/hooks/use-toast";

interface StockSearchProps {
  onSelect: (symbol: string) => void;
}

export default function StockSearch({ onSelect }: StockSearchProps) {
  const [search, setSearch] = useState("");
  const { toast } = useToast();
  const { data, error, isLoading } = useSWR(
    search ? `/api/search?query=${search}` : null
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!search) {
      toast({
        title: "Error",
        description: "Please enter a stock symbol",
        variant: "destructive",
      });
      return;
    }

    const symbol = search.toUpperCase();
    // Check if it's an Indian stock (BSE/NSE)
    const isIndianStock = /^[0-9]{6}$/.test(symbol) || // BSE stocks are 6 digits
                         /^[A-Z]+$/.test(symbol);       // NSE stocks are alphabets
    
    const formattedSymbol = isIndianStock ? `${symbol}.NS` : symbol;
    onSelect(formattedSymbol);
    toast({
      title: "Stock Selected",
      description: `Now tracking ${symbol}`,
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^A-Za-z0-9]/g, ''); // Only allow alphanumeric
    setSearch(value);
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="flex-1">
          <Input
            placeholder="Enter stock symbol (e.g., RELIANCE.NS for Indian stocks, AAPL for US)"
            value={search}
            onChange={handleInputChange}
            className="w-full"
          />
          {error && (
            <p className="text-sm text-destructive mt-1">Failed to search stocks</p>
          )}
        </div>
        <Button type="submit" disabled={isLoading}>
          <Search className="h-4 w-4 mr-2" />
          Track
        </Button>
      </form>
      <p className="text-sm text-muted-foreground mt-2">
        For Indian stocks: Use 6-digit BSE code or NSE symbol (will append .NS automatically)
      </p>
    </div>
  );
}
