"use client";

import { Button } from "@/components/ui/button";
import { Trash2, Menu } from "lucide-react";
import Image from "next/image";

interface NavbarProps {
  onClearChat: () => void;
  onToggleSidebar?: () => void;
  showMenuButton?: boolean;
}

export function Navbar({ onClearChat, onToggleSidebar, showMenuButton }: NavbarProps) {
  return (
    <header className="flex items-center justify-between px-4 py-3 border-b bg-background">
      <div className="flex items-center gap-3">
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
        <Image
          src="/spildspotter-logo.png"
          alt="Spild Spotter"
          width={120}
          height={32}
          className="h-8 w-auto"
          priority
        />
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={onClearChat}
        title="Clear chat"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </header>
  );
}
