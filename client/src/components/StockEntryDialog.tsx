import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NewStockEntry } from "@/types/ledger";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Form validation schema
const stockEntrySchema = z.object({
  dateBuy: z.date(),
  priceBuy: z.number().positive("Buy price must be positive"),
  targetPercent: z.number().min(0, "Target must be positive"),
  stopLossPercent: z.number().min(0, "Stop loss must be positive"),
  riskReward: z.number().positive("Risk/Reward must be positive"),
  reason: z.string().min(1, "Reason is required"),
  chartLink: z.string().url().optional(),
  confidence: z.enum(["Low", "Medium", "High"]),
});

type StockEntryForm = z.infer<typeof stockEntrySchema>;

interface StockEntryDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (entry: NewStockEntry) => void;
}

export default function StockEntryDialog({ open, onClose, onSubmit }: StockEntryDialogProps) {
  const [selectedStock, setSelectedStock] = useState<{ symbol: string; name: string } | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
    reset
  } = useForm<StockEntryForm>({
    resolver: zodResolver(stockEntrySchema),
    defaultValues: {
      dateBuy: new Date(),
      confidence: "Medium",
    }
  });

  const handleStockSelect = (symbol: string, name: string) => {
    setSelectedStock({ symbol, name });
    setSearchError(null);
  };

  const handleSearchError = (error: string) => {
    setSearchError(error);
  };

  const onFormSubmit = async (data: StockEntryForm) => {
    if (!selectedStock) {
      setSearchError("Please select a stock first");
      return;
    }

    const entry: NewStockEntry = {
      ...data,
      stockName: selectedStock.name,
      symbol: selectedStock.symbol,
      dateBuy: data.dateBuy.toISOString(),
    };

    onSubmit(entry);
    reset();
    setSelectedStock(null);
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

        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Select Stock</Label>
            <StockSearch 
              onSelect={handleStockSelect}
              onError={handleSearchError}
              className="w-full"
              showForm={false}
            />
            {searchError && (
              <Alert variant="destructive">
                <AlertDescription>{searchError}</AlertDescription>
              </Alert>
            )}
          </div>

          <div className="space-y-2">
            <Label>Buy Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedStock && "text-muted-foreground"
                  )}
                  onClick={(e) => e.preventDefault()}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(new Date(), "PPP")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={new Date()}
                  onSelect={(date) => date && setValue('dateBuy', date)}
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
                type="number"
                step="0.01"
                {...register('priceBuy', { valueAsNumber: true })}
                error={errors.priceBuy?.message}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confidence">Confidence</Label>
              <Select 
                onValueChange={(value) => setValue('confidence', value as "Low" | "Medium" | "High")}
                defaultValue="Medium"
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select confidence" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                </SelectContent>
              </Select>
              {errors.confidence && (
                <span className="text-sm text-destructive">{errors.confidence.message}</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="targetPercent">Target %</Label>
              <Input
                id="targetPercent"
                type="number"
                step="0.1"
                {...register('targetPercent', { valueAsNumber: true })}
                error={errors.targetPercent?.message}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stopLossPercent">Stop Loss %</Label>
              <Input
                id="stopLossPercent"
                type="number"
                step="0.1"
                {...register('stopLossPercent', { valueAsNumber: true })}
                error={errors.stopLossPercent?.message}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="riskReward">Risk/Reward</Label>
              <Input
                id="riskReward"
                type="number"
                step="0.1"
                {...register('riskReward', { valueAsNumber: true })}
                error={errors.riskReward?.message}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Why Bought? (Reason)</Label>
            <Textarea
              id="reason"
              {...register('reason')}
              error={errors.reason?.message}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="chartLink">Chart Link (Optional)</Label>
            <Input
              id="chartLink"
              type="url"
              {...register('chartLink')}
              error={errors.chartLink?.message}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !selectedStock}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Entry"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
