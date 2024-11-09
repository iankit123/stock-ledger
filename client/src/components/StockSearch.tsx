import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import debounce from "lodash/debounce";
import useSWR from "swr";

interface StockSearchProps {
  onSelect: (symbol: string, name?: string) => void;
  showForm?: boolean;
  className?: string;
}

export default function StockSearch({ onSelect, showForm = true, className }: StockSearchProps) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const { toast } = useToast();

  const debouncedSetSearch = useCallback(
    debounce((value: string) => {
      setDebouncedSearch(value);
    }, 500),
    []
  );

  const { data, error, isLoading } = useSWR(
    debouncedSearch.length >= 1 ? `/api/search?query=${encodeURIComponent(debouncedSearch)}` : null,
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
      onError: (err) => {
        // Don't show toast for rate limit errors
        if (err.status !== 429) {
          toast({
            title: "Search Error",
            description: err.info?.details || "Failed to search stocks",
            variant: "destructive",
          });
        }
      }
    }
  );

  const handleSearch = () => {
    if (!search) return;

    const symbol = search.toUpperCase();
    const isIndianStock = /^[A-Z\d]+$/i.test(symbol);
    const formattedSymbol = isIndianStock && !symbol.endsWith('.NS') 
      ? `${symbol}.NS`
      : symbol;

    setDebouncedSearch(''); // Clear suggestions before selection
    onSelect(formattedSymbol);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^A-Za-z0-9.]/g, '').toUpperCase();
    setSearch(value);
    debouncedSetSearch(value);
  };

  const clearSearch = () => {
    setSearch('');
    setDebouncedSearch('');
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {showForm ? (
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              type="text"
              value={search}
              onChange={handleInputChange}
              placeholder="Enter stock symbol (e.g., RELIANCE for NSE, AAPL for US)"
              className="w-full"
              aria-label="Stock symbol input"
            />
          </div>
          <Button onClick={handleSearch} disabled={isLoading || !search}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Search className="h-4 w-4 mr-2" />
            )}
            Track
          </Button>
        </div>
      ) : (
        <Input
          type="text"
          value={search}
          onChange={handleInputChange}
          placeholder="Search for a stock..."
          className="w-full"
          aria-label="Stock symbol input"
        />
      )}

      {error && !isLoading && debouncedSearch && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error.info?.details || "Failed to search stocks"}
          </AlertDescription>
        </Alert>
      )}

      {data?.length > 0 && !error && !isLoading && (
        <div className="mt-2 p-2 border rounded-lg bg-background/50 backdrop-blur-sm">
          <ul className="space-y-1">
            {data.map((stock: any) => (
              <li
                key={stock.symbol}
                className="p-2 hover:bg-muted rounded-md cursor-pointer"
                onClick={() => {
                  setDebouncedSearch(''); // Clear suggestions before selection
                  setSearch(stock.symbol);
                  onSelect(stock.symbol, stock.name);
                  clearSearch(); // Clear both states after selection
                }}
              >
                <div className="font-medium">{stock.symbol}</div>
                <div className="text-sm text-muted-foreground">
                  {stock.name} • {stock.exchange}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showForm && (
        <div className="text-sm text-muted-foreground">
          <p>• For Indian (NSE) stocks: Enter symbol (e.g., RELIANCE, TCS)</p>
          <p>• For US stocks: Enter 1-5 letter symbol (e.g., AAPL, MSFT)</p>
        </div>
      )}
    </div>
  );
}
