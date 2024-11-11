import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import type { StockEntry } from "@/types/ledger";

interface SellDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (sellDetails: Pick<StockEntry, 'dateSell' | 'priceSell'>) => Promise<void>;
  isLoading?: boolean;
  entry: StockEntry;
}

export default function SellDetailsDialog({
  open,
  onClose,
  onSubmit,
  isLoading = false,
  entry
}: SellDetailsDialogProps) {
  const [date, setDate] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    try {
      const form = e.currentTarget;
      const formData = new FormData(form);
      const priceSell = parseFloat(formData.get('priceSell') as string);

      if (isNaN(priceSell) || priceSell <= 0) {
        throw new Error('Please enter a valid sell price');
      }

      await onSubmit({
        dateSell: date.toISOString(),
        priceSell
      });

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add sell details');
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Sell Details</DialogTitle>
          <DialogDescription>
            Add selling details for {entry.stockName} ({entry.symbol})
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Sell Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                  disabled={isLoading}
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
                  disabled={(date) => {
                    // Disable dates before buy date
                    const buyDate = new Date(entry.dateBuy);
                    return date < buyDate;
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="priceSell">Sell Price</Label>
            <Input
              id="priceSell"
              name="priceSell"
              type="number"
              step="0.01"
              min="0.01"
              required
              disabled={isLoading}
            />
          </div>

          {error && (
            <div className="text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button variant="outline" type="button" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
