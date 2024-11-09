import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import StockSearch from "@/components/StockSearch";
import StockChart from "@/components/StockChart";
import StockStats from "@/components/StockStats";
import LivePrice from "@/components/LivePrice";
import StockEntryDialog from "@/components/StockEntryDialog";
import StockLedgerEntry from "@/components/StockLedgerEntry";
import { useToast } from "@/hooks/use-toast";
import type { StockEntry, NewStockEntry } from "@/types/ledger";
import { stockLedgerService } from "@/lib/stockLedgerService";

export default function StockDashboard() {
  const [selectedSymbol, setSelectedSymbol] = useState<string>("");
  const [stockEntries, setStockEntries] = useState<StockEntry[]>([]);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [activeTab, setActiveTab] = useState("live");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Load stock entries from Firestore
  useEffect(() => {
    const loadEntries = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const entries = await stockLedgerService.getEntries();
        setStockEntries(entries);
      } catch (err) {
        console.error('Failed to load stock entries:', err);
        setError('Failed to load stock entries. Please try again later.');
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load stock entries",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadEntries();
  }, [toast]);

  const handleSymbolSelect = (symbol: string) => {
    setSelectedSymbol(symbol);
    toast({
      title: "Stock Selected",
      description: `Now tracking ${symbol}`,
    });
  };

  const handleAddEntry = async (newEntry: NewStockEntry) => {
    try {
      const entry = await stockLedgerService.addEntry(newEntry);
      setStockEntries(prev => [entry, ...prev]);
      setShowAddEntry(false);
      toast({
        title: "Entry Added",
        description: `Added ${entry.stockName} to your ledger`,
      });
    } catch (err) {
      console.error('Failed to add stock entry:', err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add stock entry",
      });
    }
  };

  const handleDeleteEntry = async (id: string) => {
    try {
      await stockLedgerService.deleteEntry(id);
      setStockEntries(entries => entries.filter(e => e.id !== id));
      toast({
        title: "Entry Deleted",
        description: "Stock entry has been removed from your ledger",
      });
    } catch (err) {
      console.error('Failed to delete stock entry:', err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete stock entry",
      });
    }
  };

  const handleEditEntry = async (entry: StockEntry) => {
    try {
      await stockLedgerService.updateEntry(entry.id, entry);
      setStockEntries(entries => 
        entries.map(e => e.id === entry.id ? entry : e)
      );
      toast({
        title: "Entry Updated",
        description: "Stock entry has been updated",
      });
    } catch (err) {
      console.error('Failed to update stock entry:', err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update stock entry",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <h1 className="text-4xl font-bold tracking-tight">Stock Tracker</h1>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="border-b">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="live" className="relative px-4 py-2">
                Live Tracker
              </TabsTrigger>
              <TabsTrigger value="ledger" className="relative px-4 py-2">
                Stock Ledger
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="live" className="space-y-6 mt-6">
            <div className="rounded-lg border p-4">
              <StockSearch onSelect={handleSymbolSelect} />
            </div>

            {selectedSymbol && (
              <>
                <div className="grid gap-6 md:grid-cols-4">
                  <div className="md:col-span-1 rounded-lg border p-4">
                    <LivePrice symbol={selectedSymbol} />
                  </div>

                  <div className="md:col-span-3 rounded-lg border p-4">
                    <StockStats symbol={selectedSymbol} />
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <StockChart symbol={selectedSymbol} />
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="ledger" className="space-y-6 mt-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Stock Ledger</h2>
              <Button onClick={() => setShowAddEntry(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Entry
              </Button>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : stockEntries.length === 0 ? (
                <div className="rounded-lg border bg-muted/50 p-8">
                  <div className="text-center">
                    <p className="text-muted-foreground mb-4">
                      No entries yet. Add your first stock entry.
                    </p>
                    <Button onClick={() => setShowAddEntry(true)} variant="secondary">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Your First Entry
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px]">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-center p-4 w-16 bg-muted/50 font-medium text-muted-foreground">SR No.</th>
                          <th className="text-left p-4 font-medium text-muted-foreground">Stock</th>
                          <th className="text-left p-4 font-medium text-muted-foreground">Buy Info</th>
                          <th className="text-right p-4 font-medium text-muted-foreground">Current</th>
                          <th className="text-right p-4 font-medium text-muted-foreground">Target/Stop Loss</th>
                          <th className="text-left p-4 font-medium text-muted-foreground">R/R & Confidence</th>
                          <th className="text-left p-4 font-medium text-muted-foreground">Reason</th>
                          <th className="text-right p-4 font-medium text-muted-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stockEntries.map((entry, index) => (
                          <StockLedgerEntry
                            key={entry.id}
                            entry={entry}
                            index={index}
                            onEdit={handleEditEntry}
                            onDelete={handleDeleteEntry}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {showAddEntry && (
        <StockEntryDialog 
          open={showAddEntry} 
          onClose={() => setShowAddEntry(false)}
          onSubmit={handleAddEntry}
        />
      )}
    </div>
  );
}
