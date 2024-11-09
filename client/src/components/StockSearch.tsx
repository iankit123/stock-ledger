import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import useSWR from "swr";

interface StockSearchProps {
  onSelect: (symbol: string) => void;
}

export default function StockSearch({ onSelect }: StockSearchProps) {
  const [search, setSearch] = useState("");
  const { data, error, isLoading } = useSWR(
    search ? `/api/search?query=${search}` : null
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (search) {
      onSelect(search.toUpperCase());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="flex-1">
        <Input
          placeholder="Enter stock symbol (e.g., AAPL)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full"
        />
      </div>
      <Button type="submit" disabled={isLoading}>
        <Search className="h-4 w-4 mr-2" />
        Track
      </Button>
    </form>
  );
}
