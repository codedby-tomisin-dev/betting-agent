"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp } from "lucide-react";
import { ReactNode } from "react";

interface BetApprovalViewProps {
    pendingCount: number;
    isExpanded: boolean;
    onToggleExpand: () => void;
    children: ReactNode;
}

export function BetApprovalView({
    pendingCount,
    isExpanded,
    onToggleExpand,
    children,
}: BetApprovalViewProps) {
    if (pendingCount === 0) return null;

    return (
        <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
            <Card className={`${isExpanded ? "bg-white" : "bg-pink-50"}`}>
                <CollapsibleTrigger className="w-full">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <CardTitle className="text-lg font-semibold">Pending Approvals</CardTitle>
                                <Badge variant="destructive" className="bg-pink-100 text-pink-700 hover:bg-pink-100">
                                    {pendingCount} pending
                                </Badge>
                            </div>
                            <Button variant="ghost" size="sm" className="gap-2">
                                {isExpanded ? (
                                    <>
                                        Collapse
                                        <ChevronUp className="h-4 w-4" />
                                    </>
                                ) : (
                                    <>
                                        Expand
                                        <ChevronDown className="h-4 w-4" />
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                    <CardContent className="space-y-4">
                        {children}
                    </CardContent>
                </CollapsibleContent>
            </Card>
        </Collapsible>
    );
}
