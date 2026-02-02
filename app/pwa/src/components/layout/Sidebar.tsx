import Link from "next/link";
import { LayoutDashboard, History, Settings, Bot } from "lucide-react";
import { cn } from "@/shared/utils";

const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Bet History", href: "/#history", icon: History },
    { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
    // Mock pathname for now as we might be using hash routing or single page for some sections
    // But using usePathname to be safe for future pages
    // const pathname = usePathname(); 

    return (
        <div className="flex h-screen w-64 flex-col bg-[#111827] text-white fixed left-0 top-0">
            <div className="flex h-16 items-center px-6">
                <Bot className="h-8 w-8 text-green-500 mr-2" />
                <div>
                    <h1 className="text-lg font-bold leading-none">BetAgent</h1>
                </div>
            </div>

            <div className="flex-1 px-3 py-4">
                <div className="space-y-1">
                    <p className="px-3 text-xs font-semibold uppercase text-gray-500 mb-2">Navigation</p>
                    {navigation.map((item) => (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                "group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-gray-800 hover:text-white",
                                // item.href === "/" ? "bg-gray-800 text-white" : "text-gray-300"
                                "text-gray-300"
                            )}
                        >
                            <item.icon
                                className="mr-3 h-5 w-5 flex-shrink-0"
                                aria-hidden="true"
                            />
                            {item.name}
                        </Link>
                    ))}
                </div>
            </div>

            <div className="p-4">
                <div className="flex items-center rounded-md bg-gray-800 px-4 py-3">
                    <div className="flex-shrink-0">
                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    </div>
                    <div className="ml-3">
                        <p className="text-sm font-medium text-white">AI Agent Active</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
