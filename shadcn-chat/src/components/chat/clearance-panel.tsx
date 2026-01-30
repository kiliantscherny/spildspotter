"use client";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ClearanceItem } from "@/types";
import { ShoppingBasket } from "lucide-react";
import Image from "next/image";

interface ClearancePanelProps {
  items: ClearanceItem[];
  isLoading?: boolean;
  hasStore: boolean;
}

function ClearanceItemCard({ item }: { item: ClearanceItem }) {
  return (
    <div className="flex gap-3 p-3 bg-muted/50 rounded-lg">
      <div className="relative h-12 w-12 flex-shrink-0 rounded-md overflow-hidden bg-muted">
        <Image
          src={item.image}
          alt={item.product}
          fill
          className="object-cover"
          unoptimized
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = "https://placehold.co/80x80?text=No+Image";
          }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-tight line-clamp-2">
          {item.product}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm font-bold text-green-600 dark:text-green-400">
            {item.newPrice}
          </span>
          <Badge
            variant="secondary"
            className="bg-green-500/20 text-green-700 dark:text-green-300 text-xs"
          >
            {item.discount}
          </Badge>
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3 p-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex gap-3 p-3 bg-muted/50 rounded-lg">
          <Skeleton className="h-12 w-12 rounded-md flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ClearancePanel({
  items,
  isLoading,
  hasStore,
}: ClearancePanelProps) {
  return (
    <div className="flex flex-col h-full bg-background">
      {/* Fixed header */}
      <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
        <h2 className="font-semibold text-blue-600 dark:text-blue-400">
          Clearance Items
        </h2>
        {items.length > 0 && (
          <Badge variant="secondary" className="bg-green-500/20 text-green-700 dark:text-green-300">
            {items.length}
          </Badge>
        )}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {isLoading ? (
          <LoadingSkeleton />
        ) : items.length > 0 ? (
          <div className="space-y-2 p-3">
            {items.map((item, index) => (
              <ClearanceItemCard key={index} item={item} />
            ))}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center p-8">
            <div className="text-center space-y-2">
              <ShoppingBasket className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {hasStore
                  ? "No clearance items at this store"
                  : "Select a store to see items"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
