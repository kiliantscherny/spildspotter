// Types for the chat application

export interface Store {
  id: string;
  label: string;
  city: string;
  brand: string;
  latitude: number | null;
  longitude: number | null;
}

export interface ClearanceItem {
  image: string;
  product: string;
  category: string;
  newPrice: string;
  originalPrice: string;
  discount: string;
  stock: string;
}

export interface StoreInfo {
  name: string;
  brand: string;
  address: string;
  city: string;
}

// Recipe wizard types
export type MealType = "dinner" | "vegetarian";

export interface RecipeFormData {
  storeId: string;
  mealType: MealType;
  servings: number;
  maxBudget: number;
}

export interface RecipeStep {
  stepNumber: number;
  instruction: string;
}

export interface ShoppingListItem {
  item: string;
  quantity: string;
  price: string | null;
  originalPrice?: string | null;
  discount?: string | null;
  category?: string | null;
  isClearanceItem: boolean;
  isPantryStaple: boolean;
  image?: string | null;
  checked?: boolean;
}

export interface Recipe {
  recipeName: string;
  description: string;
  servings: number;
  prepTime: string;
  cookTime: string;
  totalTime: string;
  estimatedCost: number;
  steps: RecipeStep[];
  shoppingList: ShoppingListItem[];
  tips?: string[];
}
