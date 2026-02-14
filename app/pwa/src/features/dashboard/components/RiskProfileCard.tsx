import { useSettings } from "@/shared/hooks/useSettings";
import { Card, CardContent } from "@/components/ui/card";
import { Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { resolveRiskAppetiteLabel } from "@/features/settings/utils/resolveRiskAppetiteLabel";

/** Maps risk appetite (1–5) to flame icon + background colors. */
function getFlameStyle(appetite: number) {
    if (appetite <= 1.5) return { icon: "text-blue-500 fill-blue-500", bg: "bg-blue-50" };
    if (appetite <= 2.5) return { icon: "text-sky-500 fill-sky-500", bg: "bg-sky-50" };
    if (appetite <= 3) return { icon: "text-amber-500 fill-amber-500", bg: "bg-amber-50" };
    if (appetite <= 3.5) return { icon: "text-orange-500 fill-orange-500", bg: "bg-orange-50" };
    if (appetite <= 4) return { icon: "text-red-500 fill-red-500", bg: "bg-red-50" };
    return { icon: "text-red-600 fill-red-600", bg: "bg-red-100" };
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

    const riskLabel = resolveRiskAppetiteLabel(settings.RISK_APPETITE);
    const flame = getFlameStyle(settings.RISK_APPETITE);

    return (
        <Card className="h-full bg-transparent border-0 shadow-none flex flex-col justify-center w-full max-w-72">
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

                <div className={`h-14 w-14 rounded-full ${flame.bg} flex items-center justify-center flex-shrink-0`}>
                    <Flame className={`h-7 w-7 ${flame.icon}`} />
                </div>
            </CardContent>
        </Card>
    );
}
