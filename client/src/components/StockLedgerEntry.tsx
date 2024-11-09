import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Edit2, Trash2, ExternalLink } from 'lucide-react';
import type { StockEntry } from '@/types/ledger';
import { cn } from "@/lib/utils";
import useSWR from 'swr';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

  const formattedCurrency = entry.symbol.endsWith('.NS') ? '₹' : '$';

  return (
    <tr className="border-b hover:bg-muted/50 transition-colors">
      {/* Stock Info */}
      <td className="p-4">
        <div className="flex flex-col">
          <span className="font-medium">{entry.stockName}</span>
          <span className="text-sm text-muted-foreground">{entry.symbol}</span>
        </div>
      </td>

      {/* Buy Info */}
      <td className="p-4">
        <div className="flex flex-col">
          <span>{new Date(entry.dateBuy).toLocaleDateString()}</span>
          <span className="text-sm text-muted-foreground">
            {formattedCurrency}{entry.priceBuy.toFixed(2)}
          </span>
        </div>
      </td>

      {/* Current Price & Change */}
      <td className="p-4 text-right">
        {currentPrice ? (
          <div className="flex flex-col items-end">
            <span>{formattedCurrency}{currentPrice.toFixed(2)}</span>
            <span className={cn(
              "text-sm",
              priceChange && priceChange >= 0 ? "text-green-600" : "text-red-600"
            )}>
              {priceChange ? `${priceChange.toFixed(2)}%` : 'Loading...'}
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground">Loading...</span>
        )}
      </td>

      {/* Target/Stop Loss */}
      <td className="p-4">
        <div className="flex flex-col items-end gap-1">
          <div className={cn(
            "text-sm",
            hitTarget ? "text-green-600 font-medium" : "text-muted-foreground"
          )}>
            Target: {entry.targetPercent}% ({formattedCurrency}{targetPrice.toFixed(2)})
          </div>
          <div className={cn(
            "text-sm",
            hitStopLoss ? "text-red-600 font-medium" : "text-muted-foreground"
          )}>
            Stop Loss: {entry.stopLossPercent}% ({formattedCurrency}{stopLossPrice.toFixed(2)})
          </div>
        </div>
      </td>

      {/* R/R & Confidence */}
      <td className="p-4">
        <div className="flex flex-col">
          <span>R/R: {entry.riskReward}</span>
          <span className="text-sm text-muted-foreground">
            Confidence: {entry.confidence}
          </span>
        </div>
      </td>

      {/* Reason */}
      <td className="p-4 max-w-[200px]">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="cursor-help">
                <p className="text-sm truncate">
                  {entry.reason}
                </p>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-[300px] whitespace-pre-wrap">
              <p className="text-sm">{entry.reason}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </td>

      {/* Actions */}
      <td className="p-4">
        <div className="flex justify-end gap-2">
          {entry.chartLink && (
            <Button variant="ghost" size="sm" onClick={() => window.open(entry.chartLink, '_blank')}>
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => onEdit(entry)}>
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onDelete(entry.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
}
