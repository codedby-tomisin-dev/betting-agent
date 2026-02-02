"use client";

import { SettingsContainer } from "@/features/settings";

export default function SettingsPage() {
    return (
        <div className="p-8 space-y-8 max-w-4xl mx-auto">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold">Settings</h1>
                <p className="text-gray-500">Configure your AI betting agent parameters</p>
            </div>

            <SettingsContainer />
        </div>
    );
}
