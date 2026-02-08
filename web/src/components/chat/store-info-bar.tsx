"use client";

import { Badge } from "@/components/ui/badge";
import { StoreInfo } from "@/types";
import { MapPin } from "lucide-react";

interface StoreInfoBarProps {
  storeInfo: StoreInfo | null;
  itemCount: number;
}

export function StoreInfoBar({ storeInfo, itemCount }: StoreInfoBarProps) {
  if (!storeInfo) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border-b border-green-500/20">
      <MapPin className="h-4 w-4 text-green-600 dark:text-green-400" />
      <span className="text-sm font-medium text-green-700 dark:text-green-300">
        {storeInfo.brand.toUpperCase()} - {storeInfo.name}, {storeInfo.city}
      </span>
      {itemCount > 0 && (
        <Badge variant="secondary" className="bg-green-500/20 text-green-700 dark:text-green-300 hover:bg-green-500/30">
          {itemCount} items on sale
        </Badge>
      )}
    </div>
  );
}
