"use client";

import { useMemo, useCallback } from "react";
import { Recipe } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ChefHat,
  Clock,
  Users,
  Wallet,
  RotateCcw,
  CheckCircle2,
  Circle,
  Tag,
  Lightbulb,
  ShoppingCart,
  MessageSquare,
} from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandLink } from "@/components/common/brand";

// Parse and display category as breadcrumb pills
function CategoryBreadcrumb({ category }: { category: string }) {
  const parts = category.split(">").map((p) => p.trim()).filter(Boolean);

  if (parts.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1 mt-1.5">
      {parts.map((part, index) => (
        <div key={index} className="flex items-center">
          {index > 0 && (
            <span className="text-muted-foreground/40 mx-0.5 text-xs">/</span>
          )}
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
              index === 0
                ? "bg-primary/15 text-primary"
                : index === parts.length - 1
                ? "bg-muted text-foreground"
                : "bg-muted/50 text-muted-foreground"
            )}
          >
            {part}
          </span>
        </div>
      ))}
    </div>
  );
}

interface RecipeResultsProps {
  recipe: Recipe;
  onToggleItem: (index: number) => void;
  onRestart: () => void;
}

export function RecipeResults({
  recipe,
  onToggleItem,
  onRestart,
}: RecipeResultsProps) {
  const clearanceItems = recipe.shoppingList.filter(
    (item) => item.isClearanceItem
  );
  const pantryItems = recipe.shoppingList.filter((item) => item.isPantryStaple);
  const otherItems = recipe.shoppingList.filter(
    (item) => !item.isClearanceItem && !item.isPantryStaple
  );

  const productNames = useMemo(() => {
    return new Set(recipe.shoppingList.map(item => item.item.toLowerCase()));
  }, [recipe.shoppingList]);

  const highlightProductNames = useCallback((instruction: string) => {
    let highlightedText: (string | JSX.Element)[] = [instruction];

    productNames.forEach(name => {
      const regex = new RegExp(`\\b(${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b`, 'gi'); // Case-insensitive whole word
      const newHighlightedText: (string | JSX.Element)[] = [];

      highlightedText.forEach(part => {
        if (typeof part === 'string') {
          const segments = part.split(regex);
          segments.forEach((segment, index) => {
            if (index % 2 === 1) {
              newHighlightedText.push(<b key={`${name}-${index}`}>{segment}</b>);
            } else {
              newHighlightedText.push(segment);
            }
          });
        } else {
          newHighlightedText.push(part);
        }
      });
      highlightedText = newHighlightedText;
    });

    return highlightedText;
  }, [productNames]);

  const allChecked = recipe.shoppingList.every((item) => item.checked);
  const checkedCount = recipe.shoppingList.filter((item) => item.checked).length;

  return (
    <div className="min-h-dvh">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background">
        <div className="container flex h-14 items-center justify-between px-4">
          <BrandLink />
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/chat">
                <MessageSquare className="mr-2 h-4 w-4" />
                Chat
              </Link>
            </Button>
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={onRestart}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Start Over
            </Button>
          </div>
        </div>
      </header>

      <main className="container px-4 py-8 max-w-3xl mx-auto">
        <div className="space-y-8">
          {/* Recipe Header */}
          <div className="space-y-4">
            <h1 className="text-3xl font-bold">{recipe.recipeName}</h1>
            <p className="text-lg text-muted-foreground">{recipe.description}</p>

            {/* Stats */}
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{recipe.totalTime}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>{recipe.servings} servings</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Wallet className="h-4 w-4 text-muted-foreground" />
                <span>~{formatPrice(recipe.estimatedCost)}</span>
              </div>
            </div>

            {/* Time breakdown */}
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span>Prep: {recipe.prepTime}</span>
              <span>Cook: {recipe.cookTime}</span>
            </div>
          </div>

          <Separator />

          {/* Shopping List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Shopping List
                </span>
                <Badge variant={allChecked ? "default" : "secondary"}>
                  {checkedCount}/{recipe.shoppingList.length} items
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Clearance Items */}
              {clearanceItems.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-medium flex items-center gap-2 text-green-600 dark:text-green-400">
                    <Tag className="h-4 w-4" />
                    Clearance Items
                  </h3>
                  <div className="space-y-2">
                    {clearanceItems.map((item, idx) => {
                      const globalIndex = recipe.shoppingList.indexOf(item);
                      return (
                        <ShoppingItem
                          key={idx}
                          item={item}
                          onToggle={() => onToggleItem(globalIndex)}
                          highlight
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Other Items */}
              {otherItems.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-medium">Additional Items</h3>
                  <div className="space-y-2">
                    {otherItems.map((item, idx) => {
                      const globalIndex = recipe.shoppingList.indexOf(item);
                      return (
                        <ShoppingItem
                          key={idx}
                          item={item}
                          onToggle={() => onToggleItem(globalIndex)}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Pantry Staples */}
              {pantryItems.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-medium text-muted-foreground">
                    Pantry Staples
                  </h3>
                  <div className="space-y-2">
                    {pantryItems.map((item, idx) => {
                      const globalIndex = recipe.shoppingList.indexOf(item);
                      return (
                        <ShoppingItem
                          key={idx}
                          item={item}
                          onToggle={() => onToggleItem(globalIndex)}
                          muted
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Separator />

          {/* Cooking Steps */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <ChefHat className="h-6 w-6" />
              Instructions
            </h2>
            <div className="space-y-6">
              {recipe.steps.map((step) => (
                <div key={step.stepNumber} className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
                    {step.stepNumber}
                  </div>
                  <p className="pt-1 leading-relaxed">{highlightProductNames(step.instruction)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Tips */}
          {recipe.tips && recipe.tips.length > 0 && (
            <>
              <Separator />
              <Card className="bg-amber-500/10 border-amber-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <Lightbulb className="h-5 w-5" />
                    Tips
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {recipe.tips.map((tip, idx) => (
                      <li key={idx} className="text-sm">
                        {tip}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </>
          )}

          {/* Restart Button */}
          <div className="pt-4">
            <Button
              size="lg"
              variant="outline"
              className="w-full"
              onClick={onRestart}
            >
              <RotateCcw className="mr-2 h-5 w-5" />
              Find Another Recipe
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}

interface ShoppingItemProps {
  item: Recipe["shoppingList"][0];
  onToggle: () => void;
  highlight?: boolean;
  muted?: boolean;
}

function ShoppingItem({ item, onToggle, highlight, muted }: ShoppingItemProps) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors",
        "hover:bg-muted/50",
        item.checked && "opacity-60",
        highlight && !item.checked && "bg-green-500/10",
        muted && "opacity-70"
      )}
    >
      {item.checked ? (
        <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
      ) : (
        <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
      )}

      {/* Product image - only show for non-pantry items */}
      {!item.isPantryStaple && (
        item.image ? (
          <div className="w-12 h-12 rounded-md overflow-hidden flex-shrink-0 bg-muted">
            <img
              src={item.image}
              alt={item.item}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-12 h-12 rounded-md flex-shrink-0 bg-muted flex items-center justify-center">
            <ShoppingCart className="h-5 w-5 text-muted-foreground" />
          </div>
        )
      )}

      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "font-medium",
            item.checked && "line-through text-muted-foreground"
          )}
        >
          {item.item}
        </p>
        <p className="text-sm text-muted-foreground">{item.quantity}</p>
        {item.category && item.category !== "N/A" && (
          <CategoryBreadcrumb category={item.category} />
        )}
      </div>
      {item.isClearanceItem && item.price ? (
        <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
          <span className="text-sm font-bold text-green-600 dark:text-green-400">
            {formatPrice(item.price)}
          </span>
          {item.originalPrice && (
            <span className="text-xs text-red-500 line-through">
              {formatPrice(item.originalPrice)}
            </span>
          )}
          {item.discount && (
            <Badge
              variant="secondary"
              className="bg-green-500/20 text-green-700 dark:text-green-300 text-[10px] px-1.5 py-0"
            >
              {item.discount}
            </Badge>
          )}
        </div>
      ) : item.price ? (
        <Badge
          variant="secondary"
          className="flex-shrink-0"
        >
          {formatPrice(item.price)}
        </Badge>
      ) : null}
      {item.isPantryStaple && (
        <Badge variant="outline" className="flex-shrink-0 text-xs">
          Pantry
        </Badge>
      )}
    </button>
  );
}
