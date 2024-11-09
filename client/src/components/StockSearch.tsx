import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2 } from "lucide-react";
import useSWR from "swr";
import { useToast } from "@/hooks/use-toast";

interface StockSearchProps {
  onSelect: (symbol: string) => void;
}

export default function StockSearch({ onSelect }: StockSearchProps) {
  const [search, setSearch] = useState("");
  const { toast } = useToast();
  const { data, error, isLoading } = useSWR(
    search.length >= 1 ? `/api/search?query=${search}` : null,
    {
      dedupingInterval: 2000 // Prevent multiple requests within 2 seconds
    }
  );

  const validateSymbol = (symbol: string): { isValid: boolean; error?: string } => {
    if (!symbol) {
      return { isValid: false, error: "Please enter a stock symbol" };
    }

    const isIndianStock = /^[0-9]{6}$/.test(symbol) || /^[A-Z]+$/.test(symbol);
    const isUSStock = /^[A-Z]{1,5}$/.test(symbol);

    if (!isIndianStock && !isUSStock) {
      return {
        isValid: false,
        error: "Invalid symbol format. Use SYMBOL for US stocks or append .NS for Indian stocks"
      };
    }

    return { isValid: true };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const symbol = search.toUpperCase();
    const validation = validateSymbol(symbol);

    if (!validation.isValid) {
      toast({
        title: "Invalid Symbol",
        description: validation.error,
        variant: "destructive",
      });
      return;
    }

    // Append .NS for Indian stocks if not already present
    const formattedSymbol = (/^[0-9]{6}$/.test(symbol) || /^[A-Z]+$/.test(symbol)) && !symbol.endsWith('.NS')
      ? `${symbol}.NS`
      : symbol;

    onSelect(formattedSymbol);
    toast({
      title: "Stock Selected",
      description: `Now tracking ${formattedSymbol}`,
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^A-Za-z0-9.]/g, '').toUpperCase();
    setSearch(value);
  };

  return (
    <div className="space-y-2">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="flex-1">
          <Input
            placeholder="Enter stock symbol (e.g., RELIANCE for NSE, AAPL for US)"
            value={search}
            onChange={handleInputChange}
            className="w-full"
          />
          {error?.response?.data?.error && (
            <p className="text-sm text-destructive mt-1">
              {error.response.data.details || "Failed to search stocks"}
            </p>
          )}
        </div>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Search className="h-4 w-4 mr-2" />
          )}
          Track
        </Button>
      </form>
      
      <div className="text-sm text-muted-foreground">
        <p>• For Indian (NSE) stocks: Enter symbol (e.g., RELIANCE, TCS)</p>
        <p>• For US stocks: Enter 1-5 letter symbol (e.g., AAPL, MSFT)</p>
      </div>
    </div>
  );
}
