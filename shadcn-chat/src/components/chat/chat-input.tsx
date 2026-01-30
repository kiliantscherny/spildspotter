"use client";

import { FormEvent, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Square } from "lucide-react";

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  handleSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onStop?: () => void;
  isLoading: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  input,
  setInput,
  handleSubmit,
  onStop,
  isLoading,
  disabled,
  placeholder = "Type your message...",
}: ChatInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep focus on input after loading completes
  useEffect(() => {
    if (!isLoading && !disabled) {
      inputRef.current?.focus();
    }
  }, [isLoading, disabled]);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (input.trim() && !isLoading && !disabled) {
      handleSubmit(e);
      // Refocus after sending
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex gap-2 p-4 border-t bg-background">
      <Input
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={placeholder}
        disabled={isLoading || disabled}
        className="flex-1"
        autoFocus
      />
      {isLoading ? (
        <Button
          type="button"
          size="icon"
          variant="destructive"
          onClick={onStop}
          title="Stop generating"
        >
          <Square className="h-4 w-4" />
        </Button>
      ) : (
        <Button
          type="submit"
          size="icon"
          disabled={!(input ?? '').trim() || disabled}
        >
          <Send className="h-4 w-4" />
        </Button>
      )}
    </form>
  );
}
