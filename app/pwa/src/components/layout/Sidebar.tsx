"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, History, Settings, Bot } from "lucide-react";
import { cn } from "@/shared/utils";

const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "History", href: "/history", icon: History },
    { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <div className="hidden md:flex h-screen w-64 flex-col bg-transparent border-r border-gray-200/50 fixed left-0 top-0">
            <div className="flex h-16 items-center px-6">
                <Bot className="h-8 w-8 text-[#8a2be2] mr-2" />
                <div>
                    <h1 className="text-lg font-bold leading-none text-gray-900">BetAgent</h1>
                </div>
            </div>

            <div className="flex-1 px-3 py-4">
                <div className="space-y-1">
                    {navigation.map((item) => {
                        const isActive = item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href);
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={cn(
                                    "group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-all duration-200",
                                    isActive
                                        ? "bg-white shadow-sm text-gray-900"
                                        : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                                )}
                            >
                                <item.icon
                                    className={cn(
                                        "mr-3 h-5 w-5 flex-shrink-0 transition-colors",
                                        isActive ? "text-[#8a2be2]" : "text-gray-400 group-hover:text-gray-500"
                                    )}
                                    aria-hidden="true"
                                />
                                {item.name}
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
