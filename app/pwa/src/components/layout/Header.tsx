"use client";

import { Bell, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function Header() {
  const [isDark, setIsDark] = useState(false);

  return (
    <header className="fixed top-0 left-64 right-0 h-16 bg-white border-b border-gray-200 z-10">
      <div className="flex items-center justify-between h-full px-8">
        {/* Left side - Page title */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-100 rounded">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect width="20" height="20" rx="2" fill="#E5E7EB" />
              <rect x="4" y="4" width="12" height="12" rx="1" fill="#9CA3AF" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
        </div>

        {/* Right side - Utility icons */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5 text-gray-600" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-green-500 rounded-full"></span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsDark(!isDark)}
          >
            {isDark ? (
              <Sun className="h-5 w-5 text-gray-600" />
            ) : (
              <Moon className="h-5 w-5 text-gray-600" />
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}
