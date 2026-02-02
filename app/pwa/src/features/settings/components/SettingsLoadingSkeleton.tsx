"use client";

import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function SettingsLoadingSkeleton() {
    return (
        <Card className="col-span-1">
            <CardHeader>
                <CardTitle>AI Configuration</CardTitle>
                <CardDescription>Loading settings...</CardDescription>
            </CardHeader>
        </Card>
    );
}
