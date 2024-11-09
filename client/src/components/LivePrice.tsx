import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { ArrowUp, ArrowDown } from "lucide-react";

interface LivePriceProps {
  symbol: string;
}

export default function LivePrice({ symbol }: LivePriceProps) {
  const [price, setPrice] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState<number>(0);

  useEffect(() => {
    const ws = new WebSocket(`ws://${window.location.host}`);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.symbol === symbol) {
        setPriceChange(data.price - (price || data.price));
        setPrice(data.price);
      }
    };

    return () => {
      ws.close();
    };
  }, [symbol, price]);

  if (!price) {
    return <div>Loading price...</div>;
  }

  return (
    <div>
      <div className="text-sm text-muted-foreground">Current Price</div>
      <div className="text-3xl font-bold">${price.toFixed(2)}</div>
      <div className={`flex items-center ${priceChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
        {priceChange >= 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
        <span>${Math.abs(priceChange).toFixed(2)}</span>
      </div>
    </div>
  );
}
