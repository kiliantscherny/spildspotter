"use client";

import { useState, useMemo, useCallback } from "react";
import { Store } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Check,
  ChevronsUpDown,
  Store as StoreIcon,
  MapPin,
  Loader2,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const BRAND_LOGOS: Record<string, string> = {
  bilka: "/bilka-logo.png",
  føtex: "/fotex-logo.png",
  fotex: "/fotex-logo.png",
  foetex: "/fotex-logo.png",
  netto: "/netto-logo.png",
};

function normalizeBrand(brand: string): string {
  return brand.toLowerCase().replace("ø", "o");
}

function getBrandLogo(brand: string): string | null {
  const normalized = normalizeBrand(brand);
  return BRAND_LOGOS[normalized] || BRAND_LOGOS[brand.toLowerCase()] || null;
}

// Haversine formula to calculate distance between two points
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
}

interface StoreWithDistance extends Store {
  distance?: number;
}

interface SearchableStoreSelectorProps {
  stores: Store[];
  selectedStoreId: string;
  onStoreChange: (storeId: string) => void;
  storesLoading: boolean;
  centered?: boolean;
}

export function SearchableStoreSelector({
  stores,
  selectedStoreId,
  onStoreChange,
  storesLoading,
  centered = false,
}: SearchableStoreSelectorProps) {
  const [storeSearchOpen, setStoreSearchOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const selectedStore = useMemo(
    () => stores.find((s) => s.id === selectedStoreId),
    [stores, selectedStoreId]
  );

  // Calculate distances and sort stores
  const storesWithDistance = useMemo<StoreWithDistance[]>(() => {
    if (!userLocation) return stores;

    return stores
      .map((store) => {
        if (store.latitude && store.longitude) {
          const distance = calculateDistance(
            userLocation.lat,
            userLocation.lng,
            store.latitude,
            store.longitude
          );
          return { ...store, distance };
        }
        return store;
      })
      .sort((a, b) => {
        if (a.distance !== undefined && b.distance !== undefined) {
          return a.distance - b.distance;
        }
        if (a.distance !== undefined) return -1;
        if (b.distance !== undefined) return 1;
        return 0;
      });
  }, [stores, userLocation]);

  // Get nearest stores for suggestions
  const nearestStores = useMemo(() => {
    if (!userLocation) return [];
    return storesWithDistance.filter((s) => s.distance !== undefined).slice(0, 4);
  }, [storesWithDistance, userLocation]);

  const handleUseLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      return;
    }

    setLocationLoading(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setLocationLoading(false);

        // Auto-select the nearest store
        const storesWithDist = stores
          .filter((s) => s.latitude && s.longitude)
          .map((store) => ({
            ...store,
            distance: calculateDistance(
              latitude,
              longitude,
              store.latitude!,
              store.longitude!
            ),
          }))
          .sort((a, b) => a.distance - b.distance);

        if (storesWithDist.length > 0) {
          onStoreChange(storesWithDist[0].id);
        }
      },
      (error) => {
        setLocationLoading(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError("Location permission denied");
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError("Location unavailable");
            break;
          case error.TIMEOUT:
            setLocationError("Location request timed out");
            break;
          default:
            setLocationError("Failed to get location");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  }, [stores, onStoreChange]);

  return (
    <div className="space-y-3">
      {/* Search and location button inline */}
      <div className={cn("flex gap-2", centered ? "justify-center flex-wrap" : "")}>
        <Popover open={storeSearchOpen} onOpenChange={setStoreSearchOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={storeSearchOpen}
              className={cn(
                "justify-between font-normal",
                centered ? "w-full sm:w-auto sm:min-w-[280px]" : "flex-1"
              )}
              disabled={storesLoading}
            >
              {selectedStore ? (
                <span className="flex items-center gap-2 truncate">
                  {getBrandLogo(selectedStore.brand) ? (
                    <Image
                      src={getBrandLogo(selectedStore.brand)!}
                      alt={selectedStore.brand}
                      width={20}
                      height={20}
                      className="h-5 w-5 object-contain"
                    />
                  ) : (
                    <StoreIcon className="h-4 w-4 text-muted-foreground" />
                  )}
                  {selectedStore.label}
                </span>
              ) : (
                <span className="text-muted-foreground">Search stores...</span>
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search by name, city, or address..." />
              <CommandList>
                <CommandEmpty>No stores found.</CommandEmpty>
                <CommandGroup>
                  {storesWithDistance.map((store) => (
                    <CommandItem
                      key={store.id}
                      value={`${store.label} ${store.city} ${store.brand}`}
                      onSelect={() => {
                        onStoreChange(store.id);
                        setStoreSearchOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4 flex-shrink-0",
                          selectedStoreId === store.id
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                      {getBrandLogo(store.brand) ? (
                        <Image
                          src={getBrandLogo(store.brand)!}
                          alt={store.brand}
                          width={24}
                          height={24}
                          className="mr-2 h-6 w-6 object-contain flex-shrink-0"
                        />
                      ) : (
                        <StoreIcon className="mr-2 h-5 w-5 text-muted-foreground flex-shrink-0" />
                      )}
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="truncate">{store.label}</span>
                        <span className="text-xs opacity-70">{store.city}</span>
                      </div>
                      {store.distance !== undefined && (
                        <span className="text-xs opacity-70 ml-2 flex-shrink-0">
                          {formatDistance(store.distance)}
                        </span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Location button */}
        <Button
          type="button"
          variant="outline"
          onClick={handleUseLocation}
          disabled={locationLoading || storesLoading}
          className="shrink-0"
        >
          {locationLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <MapPin className="mr-2 h-4 w-4" />
          )}
          {locationLoading ? "Locating..." : "Find stores near me"}
        </Button>
      </div>

      {locationError && (
        <p className="text-sm text-destructive">{locationError}</p>
      )}

      {/* Nearest stores - quick switch buttons */}
      {nearestStores.length > 0 && (
        <TooltipProvider delayDuration={200}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {nearestStores.map((store) => {
              // Remove brand prefix and any leading hyphen/dash with spaces
              const storeName = store.label
                .replace(/^(Bilka|Føtex|Netto)\s*/i, "")
                .replace(/^[-–—]\s*/, "")
                .trim();
              return (
                <div key={store.id} className="flex items-center w-full">
                  <button
                    type="button"
                    onClick={() => onStoreChange(store.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-2 py-1.5 rounded-l-md border border-r-0 text-xs transition-colors hover:bg-muted/50 flex-1 min-w-0",
                      selectedStoreId === store.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border"
                    )}
                  >
                    {getBrandLogo(store.brand) ? (
                      <Image
                        src={getBrandLogo(store.brand)!}
                        alt={store.brand}
                        width={16}
                        height={16}
                        className="h-4 w-4 object-contain flex-shrink-0"
                      />
                    ) : (
                      <StoreIcon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    )}
                    <span className="font-medium truncate flex-1">
                      {storeName}
                    </span>
                    {store.distance !== undefined && (
                      <span className="text-[10px] text-muted-foreground flex-shrink-0">
                        {formatDistance(store.distance)}
                      </span>
                    )}
                  </button>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "flex items-center justify-center h-full px-1.5 py-1.5 rounded-r-md border text-xs cursor-help",
                          selectedStoreId === store.id
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:bg-muted/50"
                        )}
                      >
                        <Info className="h-3 w-3" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-medium">{store.label}</p>
                      {store.city && (
                        <p className="text-xs text-muted-foreground">{store.city}</p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </div>
              );
            })}
          </div>
        </TooltipProvider>
      )}
    </div>
  );
}
