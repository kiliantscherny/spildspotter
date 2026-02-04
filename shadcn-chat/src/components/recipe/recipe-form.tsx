"use client";

import { useState, useMemo } from "react";
import { Store, MealType, RecipeFormData } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertCircle,
  ChefHat,
  Leaf,
  Users,
  Wallet,
  ArrowRight,
  Loader2,
  Check,
  ChevronsUpDown,
  Store as StoreIcon,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { SearchableStoreSelector } from "../common/searchable-store-selector";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandLink } from "@/components/common/brand";

interface RecipeFormProps {
  stores: Store[];
  storesLoading: boolean;
  onSubmit: (data: RecipeFormData) => void;
  error: string | null;
}

const MEAL_OPTIONS: { value: MealType; label: string; icon: React.ReactNode; description: string }[] = [
  {
    value: "dinner",
    label: "Dinner",
    icon: <ChefHat className="h-6 w-6" />,
    description: "Any dinner recipe",
  },
  {
    value: "vegetarian",
    label: "Vegetarian",
    icon: <Leaf className="h-6 w-6" />,
    description: "No meat or fish",
  },
];

const SERVING_OPTIONS = [1, 2, 3, 4, 5, 6];

export function RecipeForm({
  stores,
  storesLoading,
  onSubmit,
  error,
}: RecipeFormProps) {
  const [selectedStoreId, setSelectedStoreId] = useState<string>("");
  const [mealType, setMealType] = useState<MealType>("dinner");
  const [servings, setServings] = useState<number>(2);
  const [maxBudget, setMaxBudget] = useState<string>("100");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get selected store for display
  const selectedStore = useMemo(
    () => stores.find((s) => s.id === selectedStoreId),
    [stores, selectedStoreId]
  );

  const handleSubmit = async () => {
    if (!selectedStoreId || !maxBudget) return;

    setIsSubmitting(true);
    await onSubmit({
      storeId: selectedStoreId,
      mealType,
      servings,
      maxBudget: parseInt(maxBudget, 10),
    });
    setIsSubmitting(false);
  };

  const isValid = selectedStoreId && maxBudget && parseInt(maxBudget, 10) > 0;

  return (
    <div className="flex flex-col min-h-dvh">
      {/* Header */}
      <header className="border-b bg-background">
        <div className="container flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <BrandLink />
            <span className="text-sm text-muted-foreground">/ AI Recipe Builder</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/chat">
                <MessageSquare className="mr-2 h-4 w-4" />
                Chat
              </Link>
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 container px-4 py-8 max-w-2xl mx-auto">
        <div className="space-y-8">
          {/* Title */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">AI Recipe Builder</h1>
            <p className="text-muted-foreground">
              Get a recipe based on clearance items at your local supermarket
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Store Selection */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-center">1. Choose a Store</h2>
            <SearchableStoreSelector
              stores={stores}
              selectedStoreId={selectedStoreId}
              onStoreChange={setSelectedStoreId}
              storesLoading={storesLoading}
              centered
            />
          </div>

          {/* Meal Type */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-center">2. What are you looking for?</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {MEAL_OPTIONS.map((option) => (
                <Card
                  key={option.value}
                  className={cn(
                    "cursor-pointer transition-all hover:border-primary backdrop-blur-sm bg-white/70 dark:bg-white/10",
                    mealType === option.value && "border-primary bg-white/90 dark:bg-white/20"
                  )}
                  onClick={() => setMealType(option.value)}
                >
                  <CardContent className="flex items-center gap-4 p-4">
                    <div
                      className={cn(
                        "p-3 rounded-full",
                        mealType === option.value
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/50"
                      )}
                    >
                      {option.icon}
                    </div>
                    <div>
                      <p className="font-medium">{option.label}</p>
                      <p className="text-sm text-muted-foreground">
                        {option.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Servings */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-center flex items-center justify-center gap-2">
              <Users className="h-5 w-5" />
              3. How many people?
            </h2>
            <div className="flex flex-wrap gap-2 justify-center">
              {SERVING_OPTIONS.map((num) => (
                <Button
                  key={num}
                  variant={servings === num ? "default" : "outline"}
                  size="lg"
                  className="w-14 h-14 text-lg"
                  onClick={() => setServings(num)}
                >
                  {num}
                </Button>
              ))}
            </div>
          </div>

          {/* Budget */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-center flex items-center justify-center gap-2">
              <Wallet className="h-5 w-5" />
              4. Maximum budget
            </h2>
            <div className="space-y-3 flex flex-col items-center">
              <div className="flex flex-wrap gap-2 justify-center">
                {[100, 200, 300, 400].map((amount) => (
                  <Button
                    key={amount}
                    variant={parseInt(maxBudget, 10) === amount ? "default" : "outline"}
                    onClick={() => setMaxBudget(String(amount))}
                  >
                    {amount} DKK
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-2 max-w-xs">
                <Input
                  type="number"
                  value={maxBudget}
                  onChange={(e) => setMaxBudget(e.target.value)}
                  placeholder="Custom"
                  min="10"
                  max="1000"
                  className="text-lg"
                />
                <span className="text-lg font-medium text-muted-foreground">
                  DKK
                </span>
              </div>
            </div>
          </div>

          {/* Submit */}
          <Button
            size="lg"
            className="w-full text-lg py-6"
            onClick={handleSubmit}
            disabled={!isValid || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Finding recipe...
              </>
            ) : (
              <>
                Find Recipe
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
        </div>
      </main>
    </div>
  );
}