"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, History, Settings } from "lucide-react";
import { cn } from "@/shared/utils";

const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "History", href: "/#history", icon: History },
    { name: "Settings", href: "/settings", icon: Settings },
];

export function BottomNav() {
    const pathname = usePathname();

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-gray-800 bg-[#111827] px-4 md:hidden">
            {navigation.map((item) => (
                <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                        "flex flex-col items-center justify-center space-y-1 text-xs font-medium transition-colors",
                        // Simple active check logic - can be refined if exact matching needed
                        (item.href === "/" && pathname === "/") || (item.href !== "/" && pathname?.startsWith(item.href))
                            ? "text-white"
                            : "text-gray-400 hover:text-gray-200"
                    )}
                >
                    <item.icon className="h-5 w-5" />
                    <span>{item.name}</span>
                </Link>
            ))}
        </div>
    );
}
