import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import debounce from "lodash/debounce";
import useSWR from "swr";

interface StockSearchProps {
  onSelect: (symbol: string, name: string) => void;
  onError?: (error: string) => void;
  showForm?: boolean;
  className?: string;
}

export default function StockSearch({ 
  onSelect, 
  onError, 
  showForm = true, 
  className 
}: StockSearchProps) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const { toast } = useToast();

  // Increased debounce time to 1000ms
  const debouncedSetSearch = useCallback(
    debounce((value: string) => {
      setDebouncedSearch(value);
      setRetryCount(0); // Reset retry count on new search
    }, 1000),
    []
  );

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    debouncedSearch.length >= 1 ? `/api/search?query=${encodeURIComponent(debouncedSearch)}` : null,
    {
      revalidateOnFocus: false,
      shouldRetryOnError: (err) => {
        // Don't retry on validation errors
        if (err.status === 400) return false;
        // Don't retry on rate limits unless we haven't hit max retries
        if (err.status === 429) return retryCount < 3;
        // Retry other errors up to 3 times
        return retryCount < 3;
      },
      onErrorRetry: (error, key, config, revalidate, { retryCount: count }) => {
        // Don't retry on validation errors
        if (error.status === 400) return;

        setRetryCount(count);

        // For rate limits, use exponential backoff
        if (error.status === 429) {
          const delay = Math.min(1000 * Math.pow(2, count), 10000);
          setTimeout(() => revalidate({ retryCount: count }), delay);
          return;
        }

        // For other errors, retry quickly
        setTimeout(() => revalidate({ retryCount: count }), 1000);
      },
      onError: (err) => {
        const errorMessage = getErrorMessage(err);
        onError?.(errorMessage);

        // Don't show toast for rate limit errors during retries
        if (!(err.status === 429 && retryCount > 0)) {
          toast({
            title: "Search Error",
            description: errorMessage,
            variant: "destructive",
          });
        }
      }
    }
  );

  const getErrorMessage = (error: any): string => {
    if (!error.response?.data) {
      return "Failed to connect to search service";
    }

    switch (error.response.data.code) {
      case "RATE_LIMIT_EXCEEDED":
        return `Too many searches. Please wait ${retryCount > 0 ? 'while we retry' : 'a moment and try again'}`;
      case "INVALID_QUERY":
      case "INVALID_QUERY_LENGTH":
      case "INVALID_CHARACTERS":
        return "Please enter a valid stock symbol or name";
      case "NO_RESULTS":
        return "No matching stocks found. Try a different search term";
      case "SEARCH_ERROR":
        return "Unable to search stocks. Please try again in a few moments";
      default:
        return error.response.data.details || "Failed to search stocks";
    }
  };

  const handleSearch = () => {
    if (!search) return;

    const symbol = search.toUpperCase();
    const isIndianStock = /^[A-Z\d]+$/i.test(symbol);
    const formattedSymbol = isIndianStock && !symbol.endsWith('.NS') 
      ? `${symbol}.NS`
      : symbol;

    onError?.("");
    onSelect(formattedSymbol, formattedSymbol);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^A-Za-z0-9. ]/g, '').toUpperCase();
    setSearch(value);
    debouncedSetSearch(value);
    
    if (onError) onError("");
  };

  const isSearching = isLoading || isValidating;
  const showRetrying = retryCount > 0 && error?.status === 429;

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
              disabled={isSearching}
            />
          </div>
          <Button 
            onClick={handleSearch} 
            disabled={isSearching || !search}
          >
            {isSearching ? (
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
          disabled={isSearching}
        />
      )}

      {error && !isSearching && debouncedSearch && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {getErrorMessage(error)}
            {showRetrying && (
              <span className="block text-sm mt-1">
                Retrying... Attempt {retryCount}/3
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {data?.length > 0 && !error && !isSearching && (
        <div className="mt-2 p-2 border rounded-lg bg-background/50 backdrop-blur-sm max-h-64 overflow-y-auto">
          <ul className="space-y-1">
            {data.map((stock: any) => (
              <li
                key={stock.symbol}
                className="p-2 hover:bg-muted rounded-md cursor-pointer transition-colors"
                onClick={() => {
                  setSearch(stock.symbol);
                  onSelect(stock.symbol, stock.name);
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
