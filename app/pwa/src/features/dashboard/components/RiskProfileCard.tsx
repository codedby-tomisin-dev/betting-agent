import { useSettings } from "@/shared/hooks/useSettings";
import { Card, CardContent } from "@/components/ui/card";
import { Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { RiskLevel } from "@/shared/types";

/**
 * Maps numeric risk appetite to a human-readable label.
 * Aligning with settings.types.ts RiskLevel or similar logic.
 */
function getRiskLabel(appetite: number): string {
    if (appetite <= 1.2) return 'Conservative';
    if (appetite <= 1.8) return 'Moderate';
    if (appetite <= 2.5) return 'Aggressive';
    return 'Degen';
}

export function RiskProfileCard() {
    const { settings, loading } = useSettings();

    if (loading) {
        return (
            <Card className="h-full flex items-center justify-center p-6 bg-white border-0">
                <div className="animate-pulse h-4 w-24 bg-gray-200 rounded"></div>
            </Card>
        );
    }

    const riskLabel = getRiskLabel(settings.RISK_APPETITE);

    return (
        <Card className="h-full bg-transparent border-0 shadow-none flex flex-col justify-center w-full max-w-84">
            <CardContent className="p-2 flex items-center justify-between gap-4">
                <div className="space-y-3">
                    <div className="space-y-1">
                        <p className="text-gray-500 text-sm font-medium">Your risk appetite is</p>
                        <h3 className="text-lg font-bold text-gray-900 leading-tight">
                            {riskLabel}
                        </h3>
                    </div>

                    <Button
                        asChild
                        variant="link"
                        className="p-0 h-auto font-semibold text-[#8a2be2] hover:text-[#7020bc]"
                    >
                        <Link href="/settings">
                            Adjust strategy &gt;
                        </Link>
                    </Button>
                </div>

                <div className="h-14 w-14 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Flame className="h-7 w-7 text-blue-500 fill-blue-500" />
                </div>
            </CardContent>
        </Card>
    );
}
