import { createVertex } from "@ai-sdk/google-vertex";
import { generateObject } from "ai";
import { z } from "zod";

// Backend URL for fetching store data
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

// Lazy-initialized Vertex AI client
let vertexClient: ReturnType<typeof createVertex> | null = null;

function getVertexClient() {
  if (!vertexClient) {
    vertexClient = createVertex({
      project: process.env.GCP_PROJECT_NAME!,
      location: process.env.GCP_PROJECT_LOCATION!,
      googleAuthOptions: {
        credentials: JSON.parse(
          Buffer.from(
            process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64!,
            "base64"
          ).toString("utf-8")
        ),
      },
    });
  }
  return vertexClient;
}

interface StoreDetails {
  id: string;
  name: string;
  brand: string;
  street: string;
  city: string;
  zip: string;
}

interface ClearanceItem {
  image: string;
  product: string;
  category: string;
  new_price: string;
  original_price: string;
  discount: string;
  stock: string;
}

async function getStoreDetails(storeId: string): Promise<StoreDetails | null> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/stores/${storeId}`);
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

async function getClearanceItems(storeId: string): Promise<ClearanceItem[]> {
  try {
    const response = await fetch(
      `${BACKEND_URL}/api/stores/${storeId}/clearances`
    );
    if (!response.ok) return [];
    return response.json();
  } catch {
    return [];
  }
}

// Schema for the recipe response
const recipeSchema = z.object({
  recipeName: z.string().describe("The name of the recipe"),
  description: z
    .string()
    .describe("A brief, appetizing description of the dish"),
  servings: z.number().describe("Number of servings this recipe makes"),
  prepTime: z.string().describe("Preparation time (e.g., '15 minutes')"),
  cookTime: z.string().describe("Cooking time (e.g., '30 minutes')"),
  totalTime: z.string().describe("Total time (e.g., '45 minutes')"),
  estimatedCost: z
    .number()
    .describe("Estimated total cost in DKK based on clearance prices"),
  steps: z
    .array(
      z.object({
        stepNumber: z.number(),
        instruction: z.string(),
      })
    )
    .describe("Ordered cooking steps"),
  shoppingList: z
    .array(
      z.object({
        item: z.string().describe("Name of the ingredient"),
        quantity: z.string().describe("Amount needed (e.g., '500g', '2 pcs')"),
        price: z
          .string()
          .nullable()
          .describe("Price in DKK if from clearance, null for pantry items"),
        isClearanceItem: z
          .boolean()
          .describe("Whether this is from the clearance section"),
        isPantryStaple: z
          .boolean()
          .describe(
            "Whether this is a common pantry item (salt, pepper, oil, etc.)"
          ),
      })
    )
    .describe("Complete shopping list including clearance items and extras"),
  tips: z
    .array(z.string())
    .optional()
    .describe("Optional cooking tips or substitution suggestions"),
});

export type RecipeResponse = z.infer<typeof recipeSchema>;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { storeId, mealType, servings, maxBudget } = body;

    if (!storeId) {
      return new Response("Store ID is required", { status: 400 });
    }

    // Fetch store details and clearance items
    const [storeDetails, clearanceItems] = await Promise.all([
      getStoreDetails(storeId),
      getClearanceItems(storeId),
    ]);

    if (!storeDetails) {
      return new Response("Store not found", { status: 404 });
    }

    if (clearanceItems.length === 0) {
      return new Response("No clearance items available at this store", {
        status: 400,
      });
    }

    // Format clearance items for the prompt with detailed category info
    const itemsText = clearanceItems
      .map((item) => {
        // Parse category path for better context (e.g., "Dairy And Cold Storage>Dairy>Cheese>Cheese For Slicing")
        const categoryPath = item.category || "Unknown";
        const categoryParts = categoryPath.split(">");
        const mainCategory = categoryParts[0]?.trim() || "Unknown";
        const subCategory = categoryParts.slice(1).join(" > ").trim() || "";

        return `- ${item.product}
    Category: ${mainCategory}${subCategory ? ` (${subCategory})` : ""}
    Price: ${item.new_price} (was ${item.original_price}, ${item.discount} off)
    Stock: ${item.stock}`;
      })
      .join("\n");

    const mealTypeDescription =
      mealType === "vegetarian"
        ? "a vegetarian dinner recipe (no meat or fish)"
        : "a dinner recipe";

    const systemPrompt = `You are a helpful culinary assistant specializing in reducing food waste by creating recipes from discounted clearance items.

Your task is to create ${mealTypeDescription} for ${servings} people with a maximum budget of ${maxBudget} DKK.

The user is shopping at: ${storeDetails.name} (${storeDetails.brand})

=== AVAILABLE CLEARANCE ITEMS ===
${itemsText}
=== END OF CLEARANCE ITEMS ===

IMPORTANT - USE THE CATEGORY INFORMATION:
- The category path tells you exactly what each product is (e.g., "Meat And Poultry > Fresh Meat > Beef" means it's fresh beef)
- Product names are in Danish, but categories are in English - use categories to understand what you're working with
- For vegetarian requests, use the category to identify and EXCLUDE any meat/fish products

GUIDELINES:
1. PRIORITIZE using the clearance items - the recipe should feature these as main ingredients
2. Stay within the ${maxBudget} DKK budget (use clearance prices for those items)
3. Create a practical, delicious recipe that serves ${servings} people
4. Include common pantry staples (oil, salt, pepper, basic spices) in the shopping list but mark them as pantry items
5. Keep product names EXACTLY as written (they are in Danish)
6. Provide clear, numbered cooking steps
7. Be realistic about quantities needed for ${servings} servings
8. In the tips section, do NOT include "(pantry item)" or similar annotations - just write natural, clean tips

The recipe should be achievable for a home cook and the instructions should be clear and easy to follow.`;

    const vertex = getVertexClient();

    const result = await generateObject({
      model: vertex("gemini-2.0-flash"),
      schema: recipeSchema,
      prompt: systemPrompt,
    });

    // Match shopping list items to clearance items to get images, categories, and pricing
    const shoppingListWithDetails = result.object.shoppingList.map((item) => {
      // Skip matching for pantry staples — trust the AI's classification
      if (item.isPantryStaple) {
        return {
          ...item,
          price: null,
          isClearanceItem: false,
          image: null,
          category: null,
          originalPrice: null,
          discount: null,
        };
      }

      // Try to find a matching clearance item by name
      const matchingClearanceItem = clearanceItems.find((ci) => {
        const itemNameLower = item.item.toLowerCase();
        const productNameLower = ci.product.toLowerCase();
        // Only match if the ingredient name contains the full product name
        // (not the reverse — avoids "pepper" matching "pepper steak")
        return itemNameLower.includes(productNameLower);
      });

      // Pass full category path for hierarchical display
      const category = matchingClearanceItem?.category || null;

      // Only set price for actual clearance items, null for everything else
      const price = matchingClearanceItem ? matchingClearanceItem.new_price : null;

      return {
        ...item,
        price,
        isClearanceItem: !!matchingClearanceItem,
        image: matchingClearanceItem?.image || null,
        category,
        originalPrice: matchingClearanceItem?.original_price || null,
        discount: matchingClearanceItem?.discount || null,
      };
    });

    // Calculate actual total cost from clearance items only
    const actualEstimatedCost = shoppingListWithDetails
      .filter((item) => item.isClearanceItem && item.price)
      .reduce((total, item) => {
        // Parse price like "25.- kr" or "4.50 kr" to number
        const priceMatch = item.price?.match(/(\d+[.,]?\d*)/);
        const priceNum = priceMatch ? parseFloat(priceMatch[1].replace(",", ".")) : 0;
        return total + priceNum;
      }, 0);

    const recipeWithImages = {
      ...result.object,
      shoppingList: shoppingListWithDetails,
      estimatedCost: actualEstimatedCost,
    };

    return Response.json(recipeWithImages);
  } catch (error) {
    console.error("Recipe API error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
