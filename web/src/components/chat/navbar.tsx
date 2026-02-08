"use client";

import { Button } from "@/components/ui/button";
import { Trash2, Menu, ChefHat } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandLink } from "@/components/common/brand";

interface NavbarProps {
  onClearChat: () => void;
  onToggleSidebar?: () => void;
  showMenuButton?: boolean;
}

export function Navbar({ onClearChat, onToggleSidebar, showMenuButton }: NavbarProps) {
  return (
    <header className="flex items-center justify-between px-4 py-3 border-b bg-background">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {showMenuButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            className="md:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <BrandLink />
        <span className="hidden sm:inline text-sm text-muted-foreground">/ Chat</span>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <Button variant="outline" size="sm" asChild className="hidden sm:inline-flex">
          <Link href="/recipe">
            <ChefHat className="mr-2 h-4 w-4" />
            AI Recipe Builder
          </Link>
        </Button>
        <Button variant="outline" size="icon" asChild className="sm:hidden">
          <Link href="/recipe" title="AI Recipe Builder">
            <ChefHat className="h-4 w-4" />
          </Link>
        </Button>
        <ThemeToggle />
        <Button
          variant="ghost"
          size="icon"
          onClick={onClearChat}
          title="Clear chat"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
