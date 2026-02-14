"use client";
import { Bell, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { NotificationModal } from "@/features/notifications/components/NotificationModal";

export function Header() {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-50 transition-all duration-200">
      <div className="flex items-center justify-between h-full px-6">
        {/* Left side - Brand and Page title */}
        <div className="flex items-center gap-6">
          <div className="flex items-center">
            <Bot className="h-8 w-8 text-[#8a2be2] mr-2" />
            <h1 className="text-lg font-bold leading-none text-gray-900">BetAgent</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => setIsNotificationsOpen(true)}
          >
            <Bell className="h-5 w-5 text-gray-600" />
          </Button>

          <NotificationModal
            isOpen={isNotificationsOpen}
            onOpenChange={setIsNotificationsOpen}
          />
        </div>
      </div>
    </header>
  );
}

