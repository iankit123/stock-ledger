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
import { CalendarIcon, Loader2, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import type { NewStockEntry } from "@/types/ledger";

interface StockEntryDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (entry: NewStockEntry) => Promise<void>;
  isLoading?: boolean;
}

export default function StockEntryDialog({ open, onClose, onSubmit, isLoading = false }: StockEntryDialogProps) {
  const [date, setDate] = useState<Date>(new Date());
  const [selectedStock, setSelectedStock] = useState<{ symbol: string; name: string } | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const { toast } = useToast();
  const { user, signIn } = useAuth();

  const resetForm = (form: HTMLFormElement) => {
    form.reset();
    setSelectedStock(null);
    setDate(new Date());
  };

  const handleSignIn = async () => {
    try {
      setIsSigningIn(true);
      await signIn();
      toast({
        title: "Success",
        description: "Successfully signed in with Google",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to sign in with Google"
      });
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;

    try {
      if (!user) {
        throw new Error('You must be signed in to add entries');
      }

      if (!selectedStock) {
        throw new Error('Please select a stock first');
      }

      const formData = new FormData(form);
      
      // Validate numeric fields
      const priceBuy = parseFloat(formData.get('priceBuy') as string);
      const targetPercent = parseFloat(formData.get('targetPercent') as string);
      const stopLossPercent = parseFloat(formData.get('stopLossPercent') as string);

      if (isNaN(priceBuy) || priceBuy <= 0) {
        throw new Error('Please enter a valid buy price');
      }
      if (isNaN(targetPercent) || targetPercent <= 0) {
        throw new Error('Please enter a valid target percentage');
      }
      if (isNaN(stopLossPercent) || stopLossPercent <= 0) {
        throw new Error('Please enter a valid stop loss percentage');
      }

      const reason = (formData.get('reason') as string)?.trim();
      if (!reason) {
        throw new Error('Please enter a reason for buying');
      }

      const chartLink = (formData.get('chartLink') as string)?.trim();
      if (chartLink && !chartLink.startsWith('http')) {
        throw new Error('Please enter a valid chart link starting with http:// or https://');
      }

      const source = (formData.get('source') as string)?.trim();
      if (!source) {
        throw new Error('Please enter the source');
      }

      const confidence = formData.get('confidence') as 'Low' | 'Medium' | 'High';
      if (!confidence) {
        throw new Error('Please select a confidence level');
      }

      const entry: NewStockEntry = {
        stockName: selectedStock.name,
        symbol: selectedStock.symbol,
        dateBuy: date.toISOString(),
        priceBuy,
        targetPercent,
        stopLossPercent,
        reason,
        chartLink: chartLink || undefined,
        source,
        confidence,
        addedBy: {
          uid: user.uid,
          email: user.email!,
          displayName: user.displayName
        }
      };

      await onSubmit(entry);
      // Reset form after successful submission
      resetForm(form);
      onClose();
    } catch (error) {
      console.error('Form submission error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to add stock entry'
      });
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  if (!user) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Authentication Required</DialogTitle>
            <DialogDescription>
              You must be signed in to add entries to the stock ledger.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Please sign in with your Google account to continue.
            </p>
            <Button 
              onClick={handleSignIn} 
              disabled={isSigningIn}
              className="w-full"
            >
              {isSigningIn ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="mr-2 h-4 w-4" />
              )}
              Sign in with Google
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
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
              onSelect={(symbol, name) => setSelectedStock({ symbol, name })}
              className="w-full"
              showForm={false}
            />
            {selectedStock && (
              <p className="text-sm text-muted-foreground">
                Selected: {selectedStock.name} ({selectedStock.symbol})
              </p>
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
                min="0.01"
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confidence">Confidence</Label>
              <Select name="confidence" defaultValue="Medium" required disabled={isLoading}>
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
                min="0.1"
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stopLossPercent">Stop Loss %</Label>
              <Input
                id="stopLossPercent"
                name="stopLossPercent"
                type="number"
                step="0.1"
                min="0.1"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Why Bought? (Reason)</Label>
            <Textarea
              id="reason"
              name="reason"
              required
              disabled={isLoading}
              placeholder="Enter your reasons for buying this stock"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="chartLink">Chart Link</Label>
            <Input
              id="chartLink"
              name="chartLink"
              type="url"
              disabled={isLoading}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="source">Source</Label>
            <Input
              id="source"
              name="source"
              type="text"
              disabled={isLoading}
              placeholder="Enter source (e.g., Telegram channel, News, Analysis)"
              required
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" type="button" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={!selectedStock || isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Entry'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
