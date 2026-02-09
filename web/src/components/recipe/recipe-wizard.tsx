"use client";

import { useState, useCallback, useEffect } from "react";
import { RecipeForm } from "./recipe-form";
import { RecipeLoading } from "./recipe-loading";
import { RecipeResults } from "./recipe-results";
import {
  Store,
  Recipe,
  RecipeFormData,
  ShoppingListItem,
} from "@/types";
import { fetchStores, ApiStore } from "@/lib/api";

type WizardStep = "form" | "loading" | "results";

export function RecipeWizard() {
  const [step, setStep] = useState<WizardStep>("form");
  const [formData, setFormData] = useState<RecipeFormData | null>(null);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Store data
  const [stores, setStores] = useState<Store[]>([]);
  const [storesLoading, setStoresLoading] = useState(true);

  // Load all stores on mount
  useEffect(() => {
    fetchStores()
      .then((data: ApiStore[]) => {
        setStores(
          data.map((s) => ({
            id: s.id,
            label: s.label,
            city: s.city,
            brand: s.brand,
            latitude: s.latitude,
            longitude: s.longitude,
          }))
        );
        setStoresLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load stores:", err);
        setStoresLoading(false);
      });
  }, []);

  const handleFormSubmit = useCallback(async (data: RecipeFormData) => {
    setFormData(data);
    setStep("loading");
    setError(null);

    try {
      const response = await fetch("/api/recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to generate recipe");
      }

      const recipeData: Recipe = await response.json();
      // Add checked property to shopping list items
      recipeData.shoppingList = recipeData.shoppingList.map((item) => ({
        ...item,
        checked: item.isPantryStaple ? false : false,
      }));
      setRecipe(recipeData);
      setStep("results");
    } catch (err) {
      console.error("Recipe generation error:", err);
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStep("form");
    }
  }, []);

  const handleToggleItem = useCallback((index: number) => {
    setRecipe((prev) => {
      if (!prev) return prev;
      const newShoppingList = [...prev.shoppingList];
      newShoppingList[index] = {
        ...newShoppingList[index],
        checked: !newShoppingList[index].checked,
      };
      return { ...prev, shoppingList: newShoppingList };
    });
  }, []);

  const handleRestart = useCallback(() => {
    setStep("form");
    setFormData(null);
    setRecipe(null);
    setError(null);
  }, []);

  return (
    <div className="min-h-dvh">
      {step === "form" && (
        <RecipeForm
          stores={stores}
          storesLoading={storesLoading}
          onSubmit={handleFormSubmit}
          error={error}
        />
      )}

      {step === "loading" && <RecipeLoading />}

      {step === "results" && recipe && (
        <RecipeResults
          recipe={recipe}
          onToggleItem={handleToggleItem}
          onRestart={handleRestart}
        />
      )}
    </div>
  );
}
