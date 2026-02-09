"use client";

import { useEffect, useState } from "react";
import { Loader2, UtensilsCrossed } from "lucide-react";

const LOADING_MESSAGES = [
  "Checking clearance items...",
  "Finding the best deals...",
  "Creating your recipe...",
  "Calculating costs...",
  "Almost ready...",
];

export function RecipeLoading() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-8">
      <div className="flex flex-col items-center gap-8 text-center">
        {/* Animated plate with utensils */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-blue-500/20 rounded-full blur-xl animate-pulse" />
          <div className="relative bg-gradient-to-br from-green-500/10 to-blue-500/10 p-8 rounded-full">
            <svg width="0" height="0" className="absolute">
              <defs>
                <linearGradient id="loading-icon-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#22c55e" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
              </defs>
            </svg>
            <UtensilsCrossed
              className="h-16 w-16 animate-bounce"
              style={{ stroke: "url(#loading-icon-gradient)" }}
            />
          </div>
        </div>

        {/* Loading spinner */}
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />

        {/* Loading message */}
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">Creating your recipe</h2>
          <p className="text-muted-foreground animate-pulse">
            {LOADING_MESSAGES[messageIndex]}
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-2 w-2 rounded-full bg-primary animate-pulse"
              style={{ animationDelay: `${i * 200}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
