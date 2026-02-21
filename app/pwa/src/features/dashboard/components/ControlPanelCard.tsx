import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Power, RefreshCw, Flame } from "lucide-react";
import { useSettings } from "@/shared/hooks/useSettings";
import { updateSettings } from "@/shared/api/settingsApi";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/shared/api/firebase";
import { toast } from "sonner";
import Link from "next/link";
import { resolveRiskAppetiteLabel } from "@/features/settings/utils/resolveRiskAppetiteLabel";

/** Maps risk appetite (1–5) to flame icon + background colors. */
function getFlameStyle(appetite: number) {
    if (appetite <= 1.5) return { icon: "text-[#5856D6] fill-[#5856D6]", bg: "bg-[#5856D6]/10" };
    if (appetite <= 2.5) return { icon: "text-sky-500 fill-sky-500", bg: "bg-sky-50" };
    if (appetite <= 3) return { icon: "text-amber-500 fill-amber-500", bg: "bg-amber-50" };
    if (appetite <= 3.5) return { icon: "text-orange-500 fill-orange-500", bg: "bg-orange-50" };
    if (appetite <= 4) return { icon: "text-red-500 fill-red-500", bg: "bg-red-50" };
    return { icon: "text-red-600 fill-red-600", bg: "bg-red-100" };
}

export function ControlPanelCard() {
    const { settings, loading } = useSettings();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isToggling, setIsToggling] = useState(false);

    if (loading) {
        return (
            <Card className="h-full flex items-center justify-center p-6 bg-white border-0 shadow-none">
                <div className="animate-pulse h-8 w-full bg-gray-100 rounded-xl"></div>
            </Card>
        );
    }

    const { AUTOMATION_ENABLED, RISK_APPETITE } = settings;
    const riskLabel = resolveRiskAppetiteLabel(RISK_APPETITE);
    const flame = getFlameStyle(RISK_APPETITE);

    const handleToggleAutomation = async () => {
        setIsToggling(true);
        try {
            await updateSettings({ AUTOMATION_ENABLED: !AUTOMATION_ENABLED });
            if (!AUTOMATION_ENABLED) {
                toast.success("Automation enabled.");
            } else {
                toast.info("Automation paused.");
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to toggle automation");
        } finally {
            setIsToggling(false);
        }
    };

    const handleRefreshBalance = async () => {
        setIsRefreshing(true);
        try {
            const refresh = httpsCallable(functions, "refresh_balance");
            await refresh();
            toast.success("Wallet balance refreshed from Betfair.");
        } catch (error: any) {
            toast.error(error.message || "Failed to refresh balance");
        } finally {
            setIsRefreshing(false);
        }
    };

    return (
        <Card className="h-full bg-transparent border-0 shadow-none flex flex-col justify-center w-full">
            <CardContent className="p-0 flex items-center justify-center gap-6 sm:gap-12">
                {/* Automation Toggle */}
                <div className="flex flex-col items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleToggleAutomation}
                        disabled={isToggling}
                        className={`h-16 w-16 rounded-full border-2 transition-colors ${AUTOMATION_ENABLED
                            ? "bg-[#5856D6] border-[#5856D6] hover:bg-[#4a0e82] hover:border-[#4a0e82] text-white shadow-md shadow-[#5856D6]/30"
                            : "bg-gray-50 border-gray-100 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                            }`}
                    >
                        <Power className={`h-6 w-6 ${isToggling ? "animate-pulse" : ""}`} />
                    </Button>
                    <span
                        className={`text-base font-semibold ${AUTOMATION_ENABLED ? "text-[#5856D6]" : "text-slate-500"
                            }`}
                    >
                        Automation {AUTOMATION_ENABLED ? "on" : "off"}
                    </span>
                </div>

                {/* Refresh Balance */}
                <div className="flex flex-col items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleRefreshBalance}
                        disabled={isRefreshing}
                        className="h-16 w-16 rounded-full border-2 bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm"
                    >
                        <RefreshCw className={`h-6 w-6 ${isRefreshing ? "animate-spin" : ""}`} />
                    </Button>
                    <span className="text-base font-semibold text-slate-700">
                        Refresh Balance
                    </span>
                </div>

                {/* Risk Appetite Picker */}
                <div className="flex flex-col items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        asChild
                        className={`h-16 w-16 rounded-full border-2 ${flame.bg} border-transparent hover:brightness-95 transition-all cursor-pointer`}
                    >
                        <Link href="/settings">
                            <Flame className={`h-7 w-7 ${flame.icon}`} />
                        </Link>
                    </Button>
                    <span className="text-base font-semibold text-slate-800">
                        {riskLabel}
                    </span>
                </div>
            </CardContent>
        </Card>
    );
}
