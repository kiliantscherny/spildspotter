"use client";

import { useMemo, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { ClearanceItem } from "@/types";
import { ShoppingBasket, Search, X } from "lucide-react";
import Image from "next/image";

interface MobileClearancePanelProps {
  items: ClearanceItem[];
  isLoading?: boolean;
  hasStore: boolean;
}

// Parse category path into parts
function parseCategoryPath(category: string): string[] {
  if (!category) return ["Other"];
  return category
    .split(">")
    .map((part) => part.trim())
    .filter(Boolean);
}

// Group items by category hierarchy
interface CategoryGroup {
  name: string;
  items: ClearanceItem[];
  subcategories: Map<string, CategoryGroup>;
}

function groupItemsByCategory(items: ClearanceItem[]): CategoryGroup[] {
  const rootGroups = new Map<string, CategoryGroup>();

  for (const item of items) {
    const parts = parseCategoryPath(item.category);
    const mainCategory = parts[0] || "Other";

    if (!rootGroups.has(mainCategory)) {
      rootGroups.set(mainCategory, {
        name: mainCategory,
        items: [],
        subcategories: new Map(),
      });
    }

    const group = rootGroups.get(mainCategory)!;

    if (parts.length > 1) {
      const subCategory = parts[1];
      if (!group.subcategories.has(subCategory)) {
        group.subcategories.set(subCategory, {
          name: subCategory,
          items: [],
          subcategories: new Map(),
        });
      }
      group.subcategories.get(subCategory)!.items.push(item);
    } else {
      group.items.push(item);
    }
  }

  return Array.from(rootGroups.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

function ClearanceItemCard({ item }: { item: ClearanceItem }) {
  return (
    <div className="flex gap-2 p-2 bg-muted/30 rounded-lg">
      <div className="relative h-8 w-8 flex-shrink-0 rounded overflow-hidden bg-muted">
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
        <p className="text-xs font-medium leading-tight line-clamp-1">
          {item.product}
        </p>
        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
          <span className="text-xs font-bold text-green-600 dark:text-green-400">
            {item.newPrice}
          </span>
          <span className="text-[10px] text-red-500 line-through">
            {item.originalPrice}
          </span>
          <Badge
            variant="secondary"
            className="bg-green-500/20 text-green-700 dark:text-green-300 text-[9px] px-1 py-0"
          >
            {item.discount}
          </Badge>
        </div>
      </div>
    </div>
  );
}

function SubcategorySection({ group }: { group: CategoryGroup }) {
  const sortedItems = [...group.items].sort((a, b) =>
    a.product.localeCompare(b.product)
  );

  return (
    <Accordion
      type="single"
      collapsible
      defaultValue={group.name}
      className="ml-2 border-l border-muted"
    >
      <AccordionItem value={group.name} className="border-b-0">
        <AccordionTrigger className="py-1 px-2 hover:no-underline hover:bg-muted/30 rounded-r-lg">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground font-medium">
              {group.name}
            </span>
            <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5">
              {group.items.length}
            </Badge>
          </div>
        </AccordionTrigger>
        <AccordionContent className="pb-1 pt-0.5 pl-2">
          <div className="space-y-1">
            {sortedItems.map((item, index) => (
              <ClearanceItemCard key={index} item={item} />
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

function GroupedItems({ groups }: { groups: CategoryGroup[] }) {
  // Get all main category names for default expanded state
  const allCategoryNames = groups.map((g) => g.name);

  return (
    <Accordion
      type="multiple"
      defaultValue={allCategoryNames}
      className="space-y-1"
    >
      {groups.map((group) => {
        const totalItems =
          group.items.length +
          Array.from(group.subcategories.values()).reduce(
            (sum, sub) => sum + sub.items.length,
            0
          );

        const sortedSubcategories = Array.from(
          group.subcategories.values()
        ).sort((a, b) => a.name.localeCompare(b.name));

        const sortedDirectItems = [...group.items].sort((a, b) =>
          a.product.localeCompare(b.product)
        );

        return (
          <AccordionItem key={group.name} value={group.name} className="border-b-0">
            <AccordionTrigger className="py-1.5 px-1 hover:no-underline hover:bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-foreground">
                  {group.name}
                </span>
                <Badge
                  variant="secondary"
                  className="bg-primary/10 text-primary text-[9px] px-1 py-0"
                >
                  {totalItems}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-1 pt-0.5">
              <div className="space-y-1.5">
                {/* Direct items */}
                {sortedDirectItems.length > 0 && (
                  <div className="space-y-1">
                    {sortedDirectItems.map((item, index) => (
                      <ClearanceItemCard key={index} item={item} />
                    ))}
                  </div>
                )}

                {/* Subcategories */}
                {sortedSubcategories.map((subgroup) => (
                  <SubcategorySection key={subgroup.name} group={subgroup} />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}

export function MobileClearancePanel({
  items,
  isLoading,
  hasStore,
}: MobileClearancePanelProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const query = searchQuery.toLowerCase();
    return items.filter(
      (item) =>
        item.product.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query)
    );
  }, [items, searchQuery]);

  const groupedItems = useMemo(
    () => groupItemsByCategory(filteredItems),
    [filteredItems]
  );

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
                {filteredItems.length !== items.length
                  ? `${filteredItems.length}/${items.length}`
                  : items.length}
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
            <div className="flex flex-col">
              {/* Search bar */}
              <div className="px-3 pb-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-8 h-8 text-sm"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                      onClick={() => setSearchQuery("")}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              {filteredItems.length > 0 ? (
                <ScrollArea className="max-h-[35vh]">
                  <div className="p-3 pt-0">
                    <GroupedItems groups={groupedItems} />
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex items-center justify-center p-6">
                  <div className="text-center space-y-2">
                    <Search className="h-6 w-6 mx-auto text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">
                      No items match &quot;{searchQuery}&quot;
                    </p>
                    <Button
                      variant="link"
                      size="sm"
                      className="text-xs"
                      onClick={() => setSearchQuery("")}
                    >
                      Clear search
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center p-6">
              <div className="text-center space-y-2">
                <ShoppingBasket className="h-6 w-6 mx-auto text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  {hasStore ? "No clearance items" : "Select a store"}
                </p>
              </div>
            </div>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
