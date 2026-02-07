"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, History, Settings } from "lucide-react";
import { cn } from "@/shared/utils";

const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "History", href: "/history", icon: History },
    { name: "Settings", href: "/settings", icon: Settings },
];

export function BottomNav() {
    const pathname = usePathname();

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 flex h-20 items-center justify-around bg-transparent md:hidden pb-safe">
            <div className="absolute inset-0 bg-gradient-to-t from-gray-100/90 to-transparent pointer-events-none" />

            {navigation.map((item) => {
                const isActive = (item.href === "/" && pathname === "/") || (item.href !== "/" && pathname?.startsWith(item.href));
                return (
                    <Link
                        key={item.name}
                        href={item.href}
                        className={cn(
                            "relative z-10 flex flex-col items-center justify-center transition-all duration-300",
                            isActive
                                ? "bg-white shadow-sm rounded-2xl h-12 w-12 text-primary"
                                : "text-gray-400 hover:text-gray-600"
                        )}
                    >
                        <item.icon className={cn("h-5 w-5", isActive && "text-green-600")} />
                    </Link>
                );
            })}
        </div>
    );
}
