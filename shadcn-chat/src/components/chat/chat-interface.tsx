"use client";

import { useChatStore } from "@/hooks/use-chat-store";
import { Chat } from "@/components/ui/chat";
import { Navbar } from "./navbar";
import { StoreSelector } from "./store-selector";
import { StoreInfoBar } from "./store-info-bar";
import { ClearancePanel } from "./clearance-panel";
import { MobileClearancePanel } from "./mobile-clearance-panel";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

const EXAMPLE_PROMPTS = [
  "What can I make with the clearance items?",
  "Suggest a quick dinner recipe",
  "Any vegetarian options available?",
  "What's the best deal right now?",
];

export function ChatInterface() {
  const {
    brands,
    stores,
    selectedBrand,
    selectedStoreId,
    storeInfo,
    clearanceItems,
    messages,
    input,
    handleInputChange,
    isLoading,
    error,
    brandsLoading,
    storesLoading,
    clearanceLoading,
    handleBrandChange,
    handleStoreChange,
    handleSubmit,
    append,
    clearChat,
    stop,
    setMessages,
  } = useChatStore();

  return (
    <div className="flex h-dvh max-h-dvh overflow-hidden bg-background">
      {/* Main chat area */}
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
        {/* Fixed header area */}
        <div className="flex-shrink-0">
          <Navbar onClearChat={clearChat} />

          <StoreSelector
            brands={brands}
            stores={stores}
            selectedBrand={selectedBrand}
            selectedStoreId={selectedStoreId}
            onBrandChange={handleBrandChange}
            onStoreChange={handleStoreChange}
            brandsLoading={brandsLoading}
            storesLoading={storesLoading}
          />

          <StoreInfoBar
            storeInfo={storeInfo}
            itemCount={clearanceItems.length}
          />

          {error && (
            <Alert variant="destructive" className="mx-4 mt-4 flex-shrink-0">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        {/* Chat area - takes remaining space */}
        <div className="flex-1 min-h-0 overflow-hidden p-4">
          {!selectedStoreId ? (
            <div className="h-full flex flex-col items-center justify-center">
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold">Welcome!</h2>
                <p className="text-muted-foreground">
                  Select a store above to get started.
                </p>
              </div>
            </div>
          ) : (
            <Chat
              messages={messages}
              input={input}
              handleInputChange={handleInputChange}
              handleSubmit={handleSubmit}
              isGenerating={isLoading}
              stop={stop}
              append={append}
              suggestions={EXAMPLE_PROMPTS}
              setMessages={setMessages}
              className="h-full"
            />
          )}
        </div>

        {/* Mobile clearance panel */}
        <div className="md:hidden flex-shrink-0">
          <MobileClearancePanel
            items={clearanceItems}
            isLoading={clearanceLoading}
            hasStore={!!selectedStoreId}
          />
        </div>
      </div>

      {/* Desktop clearance panel - fixed height with internal scroll */}
      <div className="hidden md:flex md:flex-col w-[300px] flex-shrink-0 h-full overflow-hidden border-l">
        <ClearancePanel
          items={clearanceItems}
          isLoading={clearanceLoading}
          hasStore={!!selectedStoreId}
        />
      </div>
    </div>
  );
}
