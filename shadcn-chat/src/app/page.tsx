"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChefHat, MessageSquare } from "lucide-react";
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
              Welcome to <BrandText />
            </h1>
            <p className="text-lg text-muted-foreground">
              Reduce food waste by finding recipes based on clearance items at your local store
            </p>
          </div>

          {/* Options */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Recipe Builder */}
            <Card className="relative overflow-hidden hover:border-primary/50 transition-colors">
              <Link href="/recipe" className="absolute inset-0 z-10" />
              <CardHeader className="pb-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                  <ChefHat className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Recipe Builder</CardTitle>
                <CardDescription>
                  Step-by-step guided experience to find the perfect recipe
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>Select your store</li>
                  <li>Choose dietary preferences</li>
                  <li>Get a tailored recipe with shopping list</li>
                </ul>
                <Button className="w-full mt-4" asChild>
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
                <CardTitle>Chat Assistant</CardTitle>
                <CardDescription>
                  Have a conversation to explore options freely
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>Ask questions about clearance items</li>
                  <li>Get multiple recipe suggestions</li>
                  <li>Flexible, open-ended exploration</li>
                </ul>
                <Button className="w-full mt-4" variant="outline" asChild>
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
