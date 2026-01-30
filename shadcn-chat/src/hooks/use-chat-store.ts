"use client";

import {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
  ChangeEvent,
} from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { type Message as ChatMessage } from "@/components/ui/chat-message";
import { ClearanceItem, Store, StoreInfo } from "@/types";
import {
  fetchBrands,
  fetchStores,
  fetchStoreDetails,
  fetchClearanceItems,
  ApiStore,
  ApiClearanceItem,
} from "@/lib/api";

export function useChatStore() {
  // Store selection state
  const [brands, setBrands] = useState<string[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string>("");
  const [selectedStoreId, setSelectedStoreId] = useState<string>("");
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null);
  const [clearanceItems, setClearanceItems] = useState<ClearanceItem[]>([]);

  // Loading states
  const [brandsLoading, setBrandsLoading] = useState(true);
  const [storesLoading, setStoresLoading] = useState(false);
  const [clearanceLoading, setClearanceLoading] = useState(false);

  // Local input state (managed separately from useChat in v6)
  const [input, setInput] = useState("");

  // Keep track of current store ID for the chat
  const storeIdRef = useRef(selectedStoreId);
  storeIdRef.current = selectedStoreId;

  // Create transport for chat API
  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/chat" }),
    []
  );

  // AI SDK useChat hook
  const {
    messages: rawMessages,
    sendMessage,
    status,
    error: chatError,
    setMessages: setRawMessages,
    stop,
  } = useChat({
    transport,
  });

  // Handle input change for textarea
  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value);
    },
    []
  );

  // Convert UIMessage format to Chat component format
  const messages: ChatMessage[] = useMemo(() => {
    return rawMessages.map((msg) => {
      // Extract text content from parts if present
      let content = "";
      if (msg.parts && Array.isArray(msg.parts)) {
        content = msg.parts
          .filter(
            (part): part is { type: "text"; text: string } => part.type === "text"
          )
          .map((part) => part.text)
          .join("");
      }

      return {
        id: msg.id,
        role: msg.role as "user" | "assistant",
        content,
        // Cast parts to any to handle type differences between AI SDK and Chat component
        parts: msg.parts as ChatMessage["parts"],
      };
    });
  }, [rawMessages]);

  const isLoading = status === "streaming" || status === "submitted";

  // Load brands on mount
  useEffect(() => {
    fetchBrands()
      .then((data) => {
        setBrands(data);
        setBrandsLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load brands:", err);
        setBrandsLoading(false);
      });
  }, []);

  // Load stores when brand changes (or on mount for all stores)
  useEffect(() => {
    setStoresLoading(true);
    fetchStores(selectedBrand || undefined)
      .then((data: ApiStore[]) => {
        setStores(
          data.map((s) => ({
            id: s.id,
            label: s.label,
            city: s.city,
            brand: s.brand,
          }))
        );
        setStoresLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load stores:", err);
        setStoresLoading(false);
      });
  }, [selectedBrand]);

  // Load store details and clearance items when store changes
  useEffect(() => {
    if (!selectedStoreId) {
      setStoreInfo(null);
      setClearanceItems([]);
      return;
    }

    setClearanceLoading(true);

    Promise.all([
      fetchStoreDetails(selectedStoreId),
      fetchClearanceItems(selectedStoreId),
    ])
      .then(([details, items]) => {
        if (details) {
          setStoreInfo({
            name: details.name,
            brand: details.brand,
            address: details.street,
            city: details.city,
          });
        }
        setClearanceItems(
          items.map((item: ApiClearanceItem) => ({
            image: item.image,
            product: item.product,
            category: item.category,
            newPrice: item.new_price,
            originalPrice: item.original_price,
            discount: item.discount,
            stock: item.stock,
          }))
        );
        setClearanceLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load store data:", err);
        setClearanceLoading(false);
      });
  }, [selectedStoreId]);

  // Handle brand selection
  const handleBrandChange = useCallback(
    (brand: string) => {
      setSelectedBrand(brand === "all" ? "" : brand);
      setSelectedStoreId("");
      setRawMessages([]);
    },
    [setRawMessages]
  );

  // Handle store selection
  const handleStoreChange = useCallback(
    (storeId: string) => {
      setSelectedStoreId(storeId);
      setRawMessages([]);

      // Also update brand to match the selected store
      const store = stores.find((s) => s.id === storeId);
      if (store && store.brand !== selectedBrand) {
        setSelectedBrand(store.brand);
      }
    },
    [stores, selectedBrand, setRawMessages]
  );

  // Clear chat
  const clearChat = useCallback(() => {
    stop();
    setRawMessages([]);
  }, [stop, setRawMessages]);

  // Wrapper for setMessages that converts the format
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const setMessages = useCallback(
    (newMessages: any[]) => {
      // The Chat component may call this with converted messages
      // We need to convert back to the raw format
      setRawMessages(
        newMessages.map((msg) => ({
          id: msg.id,
          role: msg.role as "user" | "assistant",
          parts: msg.parts || [{ type: "text" as const, text: msg.content }],
        }))
      );
    },
    [setRawMessages]
  );

  // Send a message programmatically (for example prompts via append)
  const append = useCallback(
    (message: { role: "user"; content: string }) => {
      sendMessage(
        { text: message.content },
        { body: { storeId: storeIdRef.current } }
      );
    },
    [sendMessage]
  );

  // Handle form submit with store ID
  const handleSubmit = useCallback(
    (
      event?: { preventDefault?: () => void },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      _options?: { experimental_attachments?: FileList }
    ) => {
      event?.preventDefault?.();
      if (input.trim()) {
        sendMessage(
          { text: input },
          { body: { storeId: storeIdRef.current } }
        );
        setInput("");
      }
    },
    [sendMessage, input]
  );

  return {
    // Store state
    brands,
    stores,
    selectedBrand,
    selectedStoreId,
    storeInfo,
    clearanceItems,

    // Chat state (from AI SDK)
    messages,
    input,
    handleInputChange,
    isLoading,
    error: chatError?.message || null,

    // Loading states
    brandsLoading,
    storesLoading,
    clearanceLoading,

    // Actions
    handleBrandChange,
    handleStoreChange,
    handleSubmit,
    append,
    clearChat,
    stop,
    setMessages,
  };
}
