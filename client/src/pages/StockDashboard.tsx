// pages/StockDashboard.tsx

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StockSearch from "@/components/StockSearch";
import StockChart from "@/components/StockChart";
import StockStats from "@/components/StockStats";
import LivePrice from "@/components/LivePrice";
import StockEntryDialog from "@/components/StockEntryDialog";
import StockLedgerEntry from "@/components/StockLedgerEntry";
import { useToast } from "@/hooks/use-toast";
import type { StockEntry, NewStockEntry } from "@/types/ledger";

export default function StockDashboard() {
  const [selectedSymbol, setSelectedSymbol] = useState<string>("");
  const [stockEntries, setStockEntries] = useState<StockEntry[]>([]);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [activeTab, setActiveTab] = useState("live");
  const { toast } = useToast();

  const handleSymbolSelect = (symbol: string) => {
    setSelectedSymbol(symbol);
    toast({
      title: "Stock Selected",
      description: `Now tracking ${symbol}`,
    });
  };

  const handleAddEntry = (newEntry: NewStockEntry) => {
    const entry: StockEntry = {
      ...newEntry,
      id: crypto.randomUUID(),
      status: 'Active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setStockEntries(prev => [...prev, entry]);
    setShowAddEntry(false);
    toast({
      title: "Entry Added",
      description: `Added ${entry.stockName} to your ledger`,
    });
  };

  const handleDeleteEntry = (id: string) => {
    setStockEntries(entries => entries.filter(e => e.id !== id));
    toast({
      title: "Entry Deleted",
      description: "Stock entry has been removed from your ledger",
    });
  };

  const handleEditEntry = (entry: StockEntry) => {
    // TODO: Implement edit functionality
    toast({
      title: "Coming Soon",
      description: "Edit functionality will be available soon",
    });
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
            <Card className="p-4">
              <StockSearch onSelect={handleSymbolSelect} />
            </Card>

            {selectedSymbol && (
              <>
                <div className="grid gap-6 md:grid-cols-4">
                  <Card className="md:col-span-1 p-4">
                    <LivePrice symbol={selectedSymbol} />
                  </Card>

                  <Card className="md:col-span-3 p-4">
                    <StockStats symbol={selectedSymbol} />
                  </Card>
                </div>

                <Card className="p-4">
                  <StockChart symbol={selectedSymbol} />
                </Card>
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

            <div className="space-y-4">
              {stockEntries.length === 0 ? (
                <Card className="p-8">
                  <div className="text-center">
                    <p className="text-muted-foreground mb-4">
                      No entries yet. Add your first stock entry.
                    </p>
                    <Button onClick={() => setShowAddEntry(true)} variant="secondary">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Your First Entry
                    </Button>
                  </div>
                </Card>
              ) : (
                stockEntries.map((entry) => (
                  <StockLedgerEntry
                    key={entry.id}
                    entry={entry}
                    onEdit={handleEditEntry}
                    onDelete={handleDeleteEntry}
                  />
                ))
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