"use client";

import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { RiskLevel } from "@/shared/types";

interface RiskAppetiteSliderProps {
    value: number;
    label: RiskLevel;
    onChange: (value: number) => void;
}

export function RiskAppetiteSlider({
    value,
    label,
    onChange,
}: RiskAppetiteSliderProps) {
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <Label htmlFor="risk">Risk Appetite</Label>
                <Badge variant="outline">{label}</Badge>
            </div>
            <Slider
                id="risk"
                min={1}
                max={5}
                step={0.1}
                value={[value]}
                onValueChange={(values) => onChange(values[0])}
                className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
                <span>Conservative (1)</span>
                <span className="font-medium">{value.toFixed(1)}</span>
                <span>Aggressive (5)</span>
            </div>
        </div>
    );
}
