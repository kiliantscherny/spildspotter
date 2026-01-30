"use client";

import { Button } from "@/components/ui/button";

interface ExamplePromptsProps {
  onSelect: (prompt: string) => void;
}

const EXAMPLE_PROMPTS = [
  "Suggest a quick dinner recipe",
  "Give me a budget-friendly meal plan",
  "What's the best way to use these items before they expire?",
];

export function ExamplePrompts({ onSelect }: ExamplePromptsProps) {
  return (
    <div className="space-y-3 text-center">
      <p className="text-sm text-muted-foreground font-medium">Try asking:</p>
      <div className="flex flex-col gap-2 max-w-md mx-auto">
        {EXAMPLE_PROMPTS.map((prompt) => (
          <Button
            key={prompt}
            variant="outline"
            className="whitespace-normal h-auto py-3 text-left justify-start"
            onClick={() => onSelect(prompt)}
          >
            {prompt}
          </Button>
        ))}
      </div>
    </div>
  );
}
