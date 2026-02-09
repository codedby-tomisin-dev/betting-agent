"use client";

import { useState } from "react";
import { Sparkles, ChevronRight, X } from "lucide-react";
import { cn } from "@/shared/utils";

interface SelectionReasoningProps {
    reasoning: string;
    className?: string;
}

export function SelectionReasoning({ reasoning, className }: SelectionReasoningProps) {
    const [isOpen, setIsOpen] = useState(false);
    // Remove manual width calculation that prevents wrapping
    // logic simplified to rely on CSS handling

    if (!reasoning) return null;

    return (
        <div className={cn("mt-2 flex items-start max-w-full", className)}>
            <div
                role="button"
                tabIndex={0}
                className={cn(
                    "relative flex items-center overflow-hidden transition-all duration-300 ease-out border group outline-none focus-visible:ring-2 focus-visible:ring-gray-400 max-w-full",
                    isOpen
                        ? "bg-gray-100/50 border-gray-300 shadow-sm pr-2 pl-3 items-start rounded-[10px]"
                        : "bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/50 hover:shadow-sm cursor-pointer items-center rounded-[20px]"
                )}
                onClick={() => !isOpen && setIsOpen(true)}
                onKeyDown={(e) => {
                    if (!isOpen && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        setIsOpen(true);
                    }
                }}
            >
                {!isOpen && (
                    <div
                        className={cn(
                            "flex items-center gap-2 px-3 py-1.5 transition-colors duration-200 shrink-0",
                            "text-gray-500 group-hover:text-gray-700"
                        )}
                    >
                        <Sparkles className="h-3.5 w-3.5 transition-colors text-gray-400 group-hover:text-gray-500" />
                        <span className="text-xs font-medium whitespace-nowrap select-none">AI Context</span>
                        <ChevronRight className="h-3 w-3 text-gray-300 group-hover:text-gray-500" />
                    </div>
                )}

                <div
                    className={cn(
                        "grid transition-all duration-300 ease-out",
                        isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0 w-0"
                    )}
                    style={{ gridTemplateColumns: isOpen ? '1fr' : '0fr' }}
                >
                    <div className="overflow-hidden flex items-start min-w-0">
                        <div className="py-2 pr-1">
                            <p className="text-xs text-gray-600 leading-relaxed whitespace-normal break-words text-left min-w-[200px] max-w-prose">
                                {reasoning}
                            </p>
                        </div>
                    </div>
                </div>

                {isOpen && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsOpen(false);
                        }}
                        className="ml-1 mt-2 p-0.5 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors shrink-0"
                    >
                        <X className="h-3 w-3" />
                        <span className="sr-only">Close AI Context</span>
                    </button>
                )}
            </div>
        </div>
    );
}
