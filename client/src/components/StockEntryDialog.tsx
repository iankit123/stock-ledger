// components/StockEntryDialog.tsx
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import StockSearch from "./StockSearch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NewStockEntry } from "@/types/ledger";

interface StockEntryDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (entry: NewStockEntry) => void;
}

export default function StockEntryDialog({ open, onClose, onSubmit }: StockEntryDialogProps) {
  const [date, setDate] = useState<Date>(new Date());
  const [selectedStock, setSelectedStock] = useState<{ symbol: string; name: string } | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedStock) return;

    const formData = new FormData(e.currentTarget);

    const entry: NewStockEntry = {
      stockName: selectedStock.name,
      symbol: selectedStock.symbol,
      dateBuy: date.toISOString(),
      priceBuy: parseFloat(formData.get('priceBuy') as string),
      targetPercent: parseFloat(formData.get('targetPercent') as string),
      stopLossPercent: parseFloat(formData.get('stopLossPercent') as string),
      reason: formData.get('reason') as string,
      chartLink: formData.get('chartLink') as string || undefined,
      confidence: formData.get('confidence') as 'Low' | 'Medium' | 'High',
    };

    onSubmit(entry);
  };

  const handleStockSelect = (symbol: string, name: string) => {
    setSelectedStock({ symbol, name });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Stock Entry</DialogTitle>
          <DialogDescription>
            Add a new stock to your ledger. Fill in the details below.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Select Stock</Label>
            <StockSearch 
              onSelect={handleStockSelect}
              className="w-full"
              showForm={false}
            />
          </div>

          <div className="space-y-2">
            <Label>Buy Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(date) => date && setDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priceBuy">Buy Price</Label>
              <Input
                id="priceBuy"
                name="priceBuy"
                type="number"
                step="0.01"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confidence">Confidence</Label>
              <Select name="confidence" defaultValue="Medium">
                <SelectTrigger>
                  <SelectValue placeholder="Select confidence" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="targetPercent">Target %</Label>
              <Input
                id="targetPercent"
                name="targetPercent"
                type="number"
                step="0.1"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stopLossPercent">Stop Loss %</Label>
              <Input
                id="stopLossPercent"
                name="stopLossPercent"
                type="number"
                step="0.1"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Why Bought? (Reason)</Label>
            <Textarea
              id="reason"
              name="reason"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="chartLink">Chart Link</Label>
            <Input
              id="chartLink"
              name="chartLink"
              type="url"
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!selectedStock}>
              Add Entry
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
