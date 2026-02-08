"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { ChatMessage } from "./chat-message";
import { MessageSquare, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UIMessage } from "ai";

interface ChatMessagesProps {
  messages: UIMessage[];
}

export function ChatMessages({ messages }: ChatMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);

  // Check if user has scrolled up
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;

    setShowScrollButton(!isAtBottom);
    setAutoScroll(isAtBottom);
  }, []);

  // Auto-scroll to bottom when new messages arrive (if autoScroll is enabled)
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, autoScroll]);

  // Scroll to bottom button handler
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
      setAutoScroll(true);
    }
  }, []);

  if (messages.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center space-y-4 max-w-md">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <MessageSquare className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">Start a conversation</h3>
            <p className="text-muted-foreground text-sm">
              Select a store above to see available clearance items, then ask
              for recipe ideas to reduce food waste!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto scroll-smooth"
      >
        <div className="flex flex-col py-4">
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
        </div>
      </div>

      {/* Scroll to bottom button */}
      <Button
        variant="secondary"
        size="icon"
        className={cn(
          "absolute bottom-4 right-4 rounded-full shadow-lg transition-opacity duration-200",
          showScrollButton ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={scrollToBottom}
      >
        <ArrowDown className="h-4 w-4" />
      </Button>
    </div>
  );
}
