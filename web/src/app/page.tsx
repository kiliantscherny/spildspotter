"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, ArrowRight, Sparkles, UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandLink, BrandText } from "@/components/common/brand";

export default function Home() {
  return (
    <div className="min-h-dvh flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b bg-background">
        <BrandLink />
        <ThemeToggle />
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl space-y-8">
          {/* Hero */}
          <div className="text-center space-y-3">
            <h1 className="text-4xl font-bold tracking-tight">
              <BrandText />
            </h1>
            <p className="text-lg text-muted-foreground">
              An AI-powered app to help turn food waste into{" "}
              <span className="relative inline-flex items-center gap-1.5">
                <span className="relative">
                  meal inspiration
                  {/* Squiggly underline */}
                  <svg
                    className="absolute -bottom-1 left-0 w-full pointer-events-none"
                    height="6"
                    viewBox="0 0 100 6"
                    preserveAspectRatio="none"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M0 3C5 1 10 5 15 3C20 1 25 5 30 3C35 1 40 5 45 3C50 1 55 5 60 3C65 1 70 5 75 3C80 1 85 5 90 3C95 1 100 5 100 3"
                      stroke="url(#squiggle-gradient)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      fill="none"
                    />
                    <defs>
                      <linearGradient id="squiggle-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#22c55e" />
                        <stop offset="100%" stopColor="#3b82f6" />
                      </linearGradient>
                    </defs>
                  </svg>
                </span>
                {/* Utensils icon with gradient */}
                <svg width="0" height="0" className="absolute">
                  <defs>
                    <linearGradient id="utensils-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#22c55e" />
                      <stop offset="100%" stopColor="#3b82f6" />
                    </linearGradient>
                  </defs>
                </svg>
                <UtensilsCrossed
                  className="h-5 w-5 inline-block"
                  style={{ stroke: "url(#utensils-gradient)" }}
                />
              </span>
            </p>
          </div>

          {/* Options */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* AI Recipe Builder */}
            <Card className="relative overflow-hidden hover:border-primary/50 transition-colors">
              <Link href="/recipe" className="absolute inset-0 z-10" />
              <CardHeader className="pb-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500/20 to-blue-500/20 flex items-center justify-center mb-2">
                  <Sparkles className="h-6 w-6 text-green-500" />
                </div>
                <CardTitle style={{ fontFamily: "var(--font-heading)" }}>
                  AI Recipe Builder
                </CardTitle>
                <CardDescription>
                  Step-by-step guided experience to find the perfect recipe
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-center gap-2">
                    <ArrowRight className="h-3 w-3 flex-shrink-0" />
                    Select your store
                  </li>
                  <li className="flex items-center gap-2">
                    <ArrowRight className="h-3 w-3 flex-shrink-0" />
                    Choose dietary preferences
                  </li>
                  <li className="flex items-center gap-2">
                    <ArrowRight className="h-3 w-3 flex-shrink-0" />
                    Get a tailored recipe with shopping list
                  </li>
                </ul>
                <Button
                  className="w-full mt-4 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white border-0"
                  style={{ fontFamily: "var(--font-heading)" }}
                  asChild
                >
                  <span>Start Wizard</span>
                </Button>
              </CardContent>
            </Card>

            {/* Chat */}
            <Card className="relative overflow-hidden hover:border-primary/50 transition-colors">
              <Link href="/chat" className="absolute inset-0 z-10" />
              <CardHeader className="pb-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <CardTitle style={{ fontFamily: "var(--font-heading)" }}>
                  Chat Assistant
                </CardTitle>
                <CardDescription>
                  Have a conversation to explore options freely
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-center gap-2">
                    <ArrowRight className="h-3 w-3 flex-shrink-0" />
                    Ask questions about clearance items
                  </li>
                  <li className="flex items-center gap-2">
                    <ArrowRight className="h-3 w-3 flex-shrink-0" />
                    Get multiple recipe suggestions
                  </li>
                  <li className="flex items-center gap-2">
                    <ArrowRight className="h-3 w-3 flex-shrink-0" />
                    Flexible, open-ended exploration
                  </li>
                </ul>
                <Button className="w-full mt-4" variant="outline" style={{ fontFamily: "var(--font-heading)" }} asChild>
                  <span>Open Chat</span>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
