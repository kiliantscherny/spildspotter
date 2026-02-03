"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ClearanceItem } from "@/types";
import { ShoppingBasket, ChevronRight, Search, X } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";

interface ClearancePanelProps {
  items: ClearanceItem[];
  isLoading?: boolean;
  hasStore: boolean;
}

// Parse category path into parts
function parseCategoryPath(category: string): string[] {
  if (!category) return ["Other"];
  return category.split(">").map((part) => part.trim()).filter(Boolean);
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

    // If there are subcategories, group by the second level
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

  // Sort groups alphabetically and convert to array
  return Array.from(rootGroups.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

function ClearanceItemCard({ item }: { item: ClearanceItem }) {
  return (
    <div className="flex gap-3 p-2 bg-muted/30 rounded-lg">
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
        <p className="text-sm font-medium leading-tight line-clamp-2">
          {item.product}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className="text-sm font-bold text-green-600 dark:text-green-400">
            {item.newPrice}
          </span>
          <span className="text-xs text-red-500 line-through">
            {item.originalPrice}
          </span>
          <Badge
            variant="secondary"
            className="bg-green-500/20 text-green-700 dark:text-green-300 text-[10px] px-1.5 py-0"
          >
            {item.discount}
          </Badge>
        </div>
      </div>
    </div>
  );
}

function SubcategorySection({ group, defaultOpen = true }: { group: CategoryGroup; defaultOpen?: boolean }) {
  const sortedItems = [...group.items].sort((a, b) =>
    a.product.localeCompare(b.product)
  );

  return (
    <Accordion
      type="single"
      collapsible
      defaultValue={defaultOpen ? group.name : undefined}
      className="ml-2 border-l-2 border-muted"
    >
      <AccordionItem value={group.name} className="border-b-0">
        <AccordionTrigger className="py-1.5 px-3 hover:no-underline hover:bg-muted/30 rounded-r-lg">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              {group.name}
            </span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
              {group.items.length}
            </Badge>
          </div>
        </AccordionTrigger>
        <AccordionContent className="pb-1 pt-0.5 pl-3">
          <div className="space-y-1.5">
            {sortedItems.map((item, index) => (
              <ClearanceItemCard key={index} item={item} />
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

function CategorySection({ group }: { group: CategoryGroup }) {
  const totalItems =
    group.items.length +
    Array.from(group.subcategories.values()).reduce(
      (sum, sub) => sum + sub.items.length,
      0
    );

  const sortedSubcategories = Array.from(group.subcategories.values()).sort(
    (a, b) => a.name.localeCompare(b.name)
  );

  const sortedDirectItems = [...group.items].sort((a, b) =>
    a.product.localeCompare(b.product)
  );

  return (
    <AccordionItem value={group.name} className="border-b-0">
      <AccordionTrigger className="py-2 px-3 hover:no-underline hover:bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2 text-left">
          <span className="font-medium text-sm">{group.name}</span>
          <Badge
            variant="secondary"
            className="bg-primary/10 text-primary text-[10px] px-1.5 py-0"
          >
            {totalItems}
          </Badge>
        </div>
      </AccordionTrigger>
      <AccordionContent className="pb-2 pt-1">
        <div className="space-y-3">
          {/* Direct items (no subcategory) */}
          {sortedDirectItems.length > 0 && (
            <div className="space-y-1.5 px-1">
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

  // Get all category names for default expanded state
  const allCategoryNames = useMemo(
    () => groupedItems.map((g) => g.name),
    [groupedItems]
  );

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Fixed header */}
      <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
        <h2 className="font-semibold text-blue-600 dark:text-blue-400">
          Clearance Items
        </h2>
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

      {/* Search bar */}
      {items.length > 0 && (
        <div className="p-2 border-b flex-shrink-0">
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
      )}

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {isLoading ? (
          <LoadingSkeleton />
        ) : filteredItems.length > 0 ? (
          <Accordion
            type="multiple"
            defaultValue={allCategoryNames}
            className="p-2"
          >
            {groupedItems.map((group) => (
              <CategorySection key={group.name} group={group} />
            ))}
          </Accordion>
        ) : items.length > 0 ? (
          <div className="h-full flex items-center justify-center p-8">
            <div className="text-center space-y-2">
              <Search className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No items match &quot;{searchQuery}&quot;
              </p>
              <Button
                variant="link"
                size="sm"
                onClick={() => setSearchQuery("")}
              >
                Clear search
              </Button>
            </div>
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
