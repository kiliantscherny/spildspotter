import { createVertex } from "@ai-sdk/google-vertex";
import { streamText } from "ai";

// Backend URL for fetching store data
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

// Convert messages from parts format to content format
interface MessagePart {
  type: string;
  text?: string;
}

interface IncomingMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content?: string;
  parts?: MessagePart[];
}

interface ConvertedMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

function convertMessages(messages: IncomingMessage[]): ConvertedMessage[] {
  return messages.map((msg) => {
    // If message already has content as string, use it directly
    if (typeof msg.content === "string" && msg.content) {
      return {
        role: msg.role,
        content: msg.content,
      };
    }

    // If message has parts array, extract text content
    if (msg.parts && Array.isArray(msg.parts)) {
      const textContent = msg.parts
        .filter((part) => part.type === "text" && part.text)
        .map((part) => part.text)
        .join("");

      return {
        role: msg.role,
        content: textContent,
      };
    }

    // Fallback to empty content
    return {
      role: msg.role,
      content: "",
    };
  });
}

// Lazy-initialized Vertex AI client (created on first request)
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

function formatClearanceItems(items: ClearanceItem[]): string {
  if (items.length === 0) {
    return "No clearance items currently available at this store.";
  }

  return items
    .map(
      (item) =>
        `- ${item.product} (${item.category}): ${item.new_price} (was ${item.original_price}, ${item.discount} off), ${item.stock} available`
    )
    .join("\n");
}

function buildSystemPrompt(
  storeName: string,
  storeBrand: string,
  clearanceItems: ClearanceItem[]
): string {
  const itemsText = formatClearanceItems(clearanceItems);

  return `CRITICAL LANGUAGE INSTRUCTION:
You MUST respond in English.

IMPORTANT: Product names in the clearance items list may be in Danish (e.g. "Hakket Oksekod", "Gnocchi").
Keep these product names EXACTLY as written - do NOT translate them.
Only the recipe instructions, explanations, and general text should match the user's language.

---

You are a friendly, conversational culinary assistant specializing in reducing food waste.
You help users create delicious recipes using discounted clearance items from Danish supermarkets.

The user is currently looking at clearance items from: ${storeName} (${storeBrand})

CONVERSATION STYLE:
- Be natural and conversational - respond to greetings, questions, and small talk appropriately
- Only provide detailed recipes, lists, or cooking instructions when SPECIFICALLY ASKED
- If the user just says "hi", "hello", or similar - greet them warmly and ask how you can help
- Match the tone and length of your response to the user's message
- Don't automatically list all clearance items unless the user asks to see them

=== START OF CLEARANCE ITEMS (NAMES ARE IN DANISH) ===
${itemsText}
=== END OF CLEARANCE ITEMS ===

WHEN PROVIDING RECIPES (only when asked):
1. Suggest creative, practical recipes using the available clearance items
2. Prioritize items that expire soonest (they appear first in the list)
3. Consider combining multiple clearance items when possible
4. Provide clear, step-by-step cooking instructions
5. Suggest approximate cooking times and serving sizes
6. Be encouraging about reducing food waste

REMEMBER: Your entire response must be in English.`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, storeId } = body;

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

    const systemPrompt = buildSystemPrompt(
      storeDetails.name,
      storeDetails.brand,
      clearanceItems
    );

    const vertex = getVertexClient();
    const convertedMessages = convertMessages(messages);
    const result = streamText({
      model: vertex("gemini-2.0-flash"),
      system: systemPrompt,
      messages: convertedMessages,
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
