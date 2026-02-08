"use client";

import { useState, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Store } from "@/types";
import { Search, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface StoreSelectorProps {
  brands: string[];
  stores: Store[];
  selectedBrand: string;
  selectedStoreId: string;
  onBrandChange: (brand: string) => void;
  onStoreChange: (storeId: string) => void;
  brandsLoading?: boolean;
  storesLoading?: boolean;
}

export function StoreSelector({
  brands,
  stores,
  selectedBrand,
  selectedStoreId,
  onBrandChange,
  onStoreChange,
  brandsLoading,
  storesLoading,
}: StoreSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredStores = useMemo(() => {
    if (!searchQuery) return stores;
    const query = searchQuery.toLowerCase();
    return stores.filter(
      (store) =>
        store.label.toLowerCase().includes(query) ||
        store.city.toLowerCase().includes(query)
    );
  }, [stores, searchQuery]);

  const selectedStore = stores.find((s) => s.id === selectedStoreId);

  return (
    <div className="flex flex-col sm:flex-row gap-2 p-4 border-b bg-muted/30">
      <Select
        value={selectedBrand}
        onValueChange={onBrandChange}
        disabled={brandsLoading}
      >
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="All Brands" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Brands</SelectItem>
          {brands.map((brand) => (
            <SelectItem key={brand} value={brand}>
              {brand}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search stores..."
          className="pl-9 pr-9"
          disabled={storesLoading}
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={() => setSearchQuery("")}
          >
            <X className="h-4 w-4" />
          </Button>
        )}

        {searchQuery && filteredStores.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-popover border rounded-md shadow-lg">
            <ScrollArea className="max-h-[300px]">
              {filteredStores.slice(0, 20).map((store) => (
                <button
                  key={store.id}
                  onClick={() => {
                    onStoreChange(store.id);
                    setSearchQuery("");
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                >
                  <span className="font-medium">{store.brand}</span>
                  <span className="text-muted-foreground"> - {store.city}</span>
                  <br />
                  <span className="text-xs text-muted-foreground truncate">
                    {store.label.split(" - ").slice(2).join(" - ")}
                  </span>
                </button>
              ))}
              {filteredStores.length > 20 && (
                <div className="px-3 py-2 text-xs text-muted-foreground text-center">
                  {filteredStores.length - 20} more results...
                </div>
              )}
            </ScrollArea>
          </div>
        )}

        {searchQuery && filteredStores.length === 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-popover border rounded-md shadow-lg p-3 text-sm text-muted-foreground text-center">
            No stores found
          </div>
        )}
      </div>

      {!searchQuery && (
        <Select
          value={selectedStoreId}
          onValueChange={onStoreChange}
          disabled={storesLoading || stores.length === 0}
        >
          <SelectTrigger className="w-full sm:w-[300px]">
            <SelectValue placeholder="Select a store...">
              {selectedStore && (
                <span className="truncate">
                  {selectedStore.brand} - {selectedStore.city}
                </span>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <ScrollArea className="max-h-[300px]">
              {stores.map((store) => (
                <SelectItem key={store.id} value={store.id}>
                  <div className="truncate">
                    <span className="font-medium">{store.brand}</span>
                    <span className="text-muted-foreground"> - {store.city}</span>
                  </div>
                </SelectItem>
              ))}
            </ScrollArea>
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
