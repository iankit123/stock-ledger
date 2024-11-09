import { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2, ExternalLink } from 'lucide-react';
import type { StockEntry } from '@/types/ledger';
import { cn } from "@/lib/utils";
import useSWR from 'swr';

interface StockLedgerEntryProps {
  entry: StockEntry;
  onEdit: (entry: StockEntry) => void;
  onDelete: (id: string) => void;
}

export default function StockLedgerEntry({ entry, onEdit, onDelete }: StockLedgerEntryProps) {
  const { data: liveData } = useSWR(
    `/api/stock/${entry.symbol}`,
    {
      refreshInterval: 10000 // Refresh every 10 seconds
    }
  );

  const currentPrice = liveData?.chart?.result?.[0]?.meta?.regularMarketPrice;
  const priceChange = currentPrice ? ((currentPrice - entry.priceBuy) / entry.priceBuy) * 100 : null;

  // Calculate if target or stop loss is hit
  const targetPrice = entry.priceBuy * (1 + entry.targetPercent / 100);
  const stopLossPrice = entry.priceBuy * (1 - entry.stopLossPercent / 100);
  const hitTarget = currentPrice ? currentPrice >= targetPrice : false;
  const hitStopLoss = currentPrice ? currentPrice <= stopLossPrice : false;

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-lg">{entry.stockName}</h3>
            <span className="text-sm text-muted-foreground">({entry.symbol})</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Bought on {new Date(entry.dateBuy).toLocaleDateString()} at ₹{entry.priceBuy.toFixed(2)}
          </p>
        </div>

        <div className="text-right">
          {currentPrice && (
            <div className="mb-2">
              <p className="font-medium">Current: ₹{currentPrice.toFixed(2)}</p>
              <p className={cn(
                "text-sm",
                priceChange && priceChange >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {priceChange ? `${priceChange.toFixed(2)}%` : 'Loading...'}
              </p>
            </div>
          )}
          <div className="flex flex-col gap-1">
            <div className={cn(
              "text-sm",
              hitTarget ? "text-green-600 font-medium" : "text-muted-foreground"
            )}>
              Target: {entry.targetPercent}% (₹{targetPrice.toFixed(2)})
            </div>
            <div className={cn(
              "text-sm",
              hitStopLoss ? "text-red-600 font-medium" : "text-muted-foreground"
            )}>
              Stop Loss: {entry.stopLossPercent}% (₹{stopLossPrice.toFixed(2)})
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          R/R: {entry.riskReward} • Confidence: {entry.confidence}
        </div>
        <div className="flex gap-2">
          {entry.chartLink && (
            <Button variant="outline" size="sm" onClick={() => window.open(entry.chartLink, '_blank')}>
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => onEdit(entry)}>
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => onDelete(entry.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
