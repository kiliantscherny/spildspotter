"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { ClearanceItem } from "@/types";
import { ShoppingBasket } from "lucide-react";
import Image from "next/image";

interface MobileClearancePanelProps {
  items: ClearanceItem[];
  isLoading?: boolean;
  hasStore: boolean;
}

function ClearanceItemCard({ item }: { item: ClearanceItem }) {
  return (
    <div className="flex gap-3 p-3 bg-muted/50 rounded-lg">
      <div className="relative h-10 w-10 flex-shrink-0 rounded-md overflow-hidden bg-muted">
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
        <p className="text-xs font-medium leading-tight line-clamp-2">
          {item.product}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs font-bold text-green-600 dark:text-green-400">
            {item.newPrice}
          </span>
          <Badge
            variant="secondary"
            className="bg-green-500/20 text-green-700 dark:text-green-300 text-[10px] px-1"
          >
            {item.discount}
          </Badge>
        </div>
      </div>
    </div>
  );
}

export function MobileClearancePanel({
  items,
  isLoading,
  hasStore,
}: MobileClearancePanelProps) {
  return (
    <Accordion type="single" collapsible className="border-t">
      <AccordionItem value="clearance" className="border-b-0">
        <AccordionTrigger className="px-4 py-3 hover:no-underline">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-blue-600 dark:text-blue-400">
              Clearance Items
            </span>
            {items.length > 0 && (
              <Badge
                variant="secondary"
                className="bg-green-500/20 text-green-700 dark:text-green-300"
              >
                {items.length}
              </Badge>
            )}
          </div>
        </AccordionTrigger>
        <AccordionContent>
          {isLoading ? (
            <div className="space-y-2 p-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3 p-3 bg-muted/50 rounded-lg">
                  <Skeleton className="h-10 w-10 rounded-md" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : items.length > 0 ? (
            <ScrollArea className="max-h-[35vh]">
              <div className="space-y-2 p-3">
                {items.map((item, index) => (
                  <ClearanceItemCard key={index} item={item} />
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex items-center justify-center p-6">
              <div className="text-center space-y-2">
                <ShoppingBasket className="h-6 w-6 mx-auto text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  {hasStore
                    ? "No clearance items"
                    : "Select a store"}
                </p>
              </div>
            </div>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
