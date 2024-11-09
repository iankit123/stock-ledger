import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2, ExternalLink } from "lucide-react";
import type { StockEntry } from "@/types/ledger";
import { cn } from "@/lib/utils";
import useSWR from "swr";

interface StockLedgerTableProps {
  entries: StockEntry[];
  onEdit: (entry: StockEntry) => void;
  onDelete: (id: string) => void;
}

export default function StockLedgerTable({ entries, onEdit, onDelete }: StockLedgerTableProps) {
  // Create a map of symbol to price data to avoid multiple SWR hooks
  const symbolsMap = new Map(entries.map(entry => [entry.symbol, null]));
  const symbols = Array.from(symbolsMap.keys());

  // Fetch live prices for all symbols
  const livePrices = Object.fromEntries(
    symbols.map(symbol => [
      symbol,
      useSWR(`/api/stock/${symbol}`, {
        refreshInterval: 10000 // Refresh every 10 seconds
      })
    ])
  );

  const formatCurrency = (value: number, symbol: string) => {
    const currency = symbol.endsWith('.NS') ? '₹' : '$';
    return `${currency}${value.toFixed(2)}`;
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  return (
    <div className="w-full overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Stock Name</TableHead>
            <TableHead>Symbol</TableHead>
            <TableHead>Buy Date</TableHead>
            <TableHead className="text-right">Buy Price</TableHead>
            <TableHead className="text-right">Current Price</TableHead>
            <TableHead className="text-right">Change %</TableHead>
            <TableHead className="text-right">Target</TableHead>
            <TableHead className="text-right">Stop Loss</TableHead>
            <TableHead className="text-right">R/R</TableHead>
            <TableHead>Confidence</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => {
            const liveData = livePrices[entry.symbol]?.data;
            const currentPrice = liveData?.chart?.result?.[0]?.meta?.regularMarketPrice;
            const priceChange = currentPrice 
              ? ((currentPrice - entry.priceBuy) / entry.priceBuy) * 100 
              : null;

            // Calculate target and stop loss status
            const targetPrice = entry.priceBuy * (1 + entry.targetPercent / 100);
            const stopLossPrice = entry.priceBuy * (1 - entry.stopLossPercent / 100);
            const hitTarget = currentPrice ? currentPrice >= targetPrice : false;
            const hitStopLoss = currentPrice ? currentPrice <= stopLossPrice : false;

            return (
              <TableRow key={entry.id}>
                <TableCell className="font-medium">{entry.stockName}</TableCell>
                <TableCell>{entry.symbol}</TableCell>
                <TableCell>{new Date(entry.dateBuy).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(entry.priceBuy, entry.symbol)}
                </TableCell>
                <TableCell className="text-right">
                  {currentPrice ? formatCurrency(currentPrice, entry.symbol) : "Loading..."}
                </TableCell>
                <TableCell className={cn(
                  "text-right",
                  priceChange && priceChange >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {priceChange ? formatPercentage(priceChange) : "Loading..."}
                </TableCell>
                <TableCell className={cn(
                  "text-right",
                  hitTarget ? "text-green-600 font-medium" : ""
                )}>
                  {formatPercentage(entry.targetPercent)}
                  <br />
                  <span className="text-xs text-muted-foreground">
                    ({formatCurrency(targetPrice, entry.symbol)})
                  </span>
                </TableCell>
                <TableCell className={cn(
                  "text-right",
                  hitStopLoss ? "text-red-600 font-medium" : ""
                )}>
                  {formatPercentage(entry.stopLossPercent)}
                  <br />
                  <span className="text-xs text-muted-foreground">
                    ({formatCurrency(stopLossPrice, entry.symbol)})
                  </span>
                </TableCell>
                <TableCell className="text-right">{entry.riskReward}</TableCell>
                <TableCell>{entry.confidence}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {entry.chartLink && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => window.open(entry.chartLink, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(entry)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(entry.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
