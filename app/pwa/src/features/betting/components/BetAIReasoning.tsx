"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { cn } from "@/shared/utils";

interface BetAIReasoningProps {
    reasoning: string;
    className?: string;
    defaultOpen?: boolean;
}

export function BetAIReasoning({
    reasoning,
    className,
    defaultOpen = false
}: BetAIReasoningProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    if (!reasoning) return null;

    return (
        <Collapsible
            open={isOpen}
            onOpenChange={setIsOpen}
            className={cn(
                "rounded-lg border border-blue-100 bg-gradient-to-b from-blue-50/50 to-white overflow-hidden shadow-sm",
                className
            )}
        >
            <div className="flex items-center justify-between px-4 py-3 bg-blue-50/30">
                <div className="flex items-center gap-2 text-blue-700">
                    <Sparkles className="h-4 w-4 text-blue-600 fill-blue-100" />
                    <span className="text-sm font-semibold select-none">AI Analysis Summary</span>
                </div>
                <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-blue-100/50 text-blue-600">
                        {isOpen ? (
                            <ChevronUp className="h-4 w-4" />
                        ) : (
                            <ChevronDown className="h-4 w-4" />
                        )}
                        <span className="sr-only">Toggle AI Analysis</span>
                    </Button>
                </CollapsibleTrigger>
            </div>

            <CollapsibleContent>
                <div className="px-4 pb-4 pt-1">
                    <div className="text-sm text-blue-800/90 prose prose-blue prose-sm max-w-none leading-relaxed">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {reasoning}
                        </ReactMarkdown>
                    </div>
                </div>
            </CollapsibleContent>

            {!isOpen && (
                <div className="px-4 pb-2 -mt-1">
                    <p className="text-xs text-blue-400 truncate opacity-70 italic select-none">
                        Click to expand full analysis...
                    </p>
                </div>
            )}
        </Collapsible>
    );
}
