"use client";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot, User, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useCallback, memo } from "react";
import ReactMarkdown from "react-markdown";
import type { UIMessage } from "ai";

interface ChatMessageProps {
  message: UIMessage;
}

// Memoized markdown renderer to prevent re-renders during streaming
const MarkdownContent = memo(function MarkdownContent({
  content,
}: {
  content: string;
}) {
  return (
    <ReactMarkdown
      components={{
        // Custom renderers for better streaming experience
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        ul: ({ children }) => (
          <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside mb-2 space-y-1">
            {children}
          </ol>
        ),
        li: ({ children }) => <li className="ml-2">{children}</li>,
        h1: ({ children }) => (
          <h1 className="text-xl font-bold mb-2 mt-4 first:mt-0">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-lg font-bold mb-2 mt-3 first:mt-0">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-base font-bold mb-2 mt-2 first:mt-0">
            {children}
          </h3>
        ),
        code: ({ className, children }) => {
          const isInline = !className;
          if (isInline) {
            return (
              <code className="bg-black/20 dark:bg-white/20 px-1 py-0.5 rounded text-sm">
                {children}
              </code>
            );
          }
          return (
            <code className="block bg-black/20 dark:bg-white/10 p-3 rounded-md text-sm overflow-x-auto my-2">
              {children}
            </code>
          );
        },
        pre: ({ children }) => (
          <pre className="overflow-x-auto">{children}</pre>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold">{children}</strong>
        ),
        em: ({ children }) => <em className="italic">{children}</em>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-current/30 pl-3 italic my-2">
            {children}
          </blockquote>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
});

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  // Get the text content from the message parts
  const content = message.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("");

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [content]);

  return (
    <div
      className={cn(
        "group flex gap-3 px-4 py-3",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      <Avatar
        className={cn(
          "h-8 w-8 flex-shrink-0",
          isUser ? "bg-blue-600" : "bg-green-600"
        )}
      >
        <AvatarFallback
          className={cn("text-white", isUser ? "bg-blue-600" : "bg-green-600")}
        >
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>

      <div
        className={cn(
          "flex flex-col gap-1 max-w-[80%]",
          isUser ? "items-end" : "items-start"
        )}
      >
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5",
            isUser ? "bg-blue-600 text-white" : "bg-muted text-foreground"
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap text-sm">{content}</p>
          ) : content ? (
            <div className="text-sm prose-sm">
              <MarkdownContent content={content} />
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-2 h-2 bg-current rounded-full animate-bounce" />
            </div>
          )}
        </div>

        {/* Copy button for assistant messages */}
        {!isUser && content && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-7 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            {copied ? (
              <Check className="h-3 w-3 mr-1" />
            ) : (
              <Copy className="h-3 w-3 mr-1" />
            )}
            <span className="text-xs">{copied ? "Copied" : "Copy"}</span>
          </Button>
        )}
      </div>
    </div>
  );
}
