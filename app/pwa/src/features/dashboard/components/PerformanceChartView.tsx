import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bet } from "@/shared/types";
import { BalanceHistoryChart } from "./charts/BalanceHistoryChart";
import { WinningsStackedBarChart } from "./charts/WinningsStackedBarChart";

interface PerformanceChartViewProps {
    bets: Bet[];
}

export function PerformanceChartView({ bets }: PerformanceChartViewProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Performance Overview</CardTitle>
            </CardHeader>
            <CardContent className="pl-2 -ml-8">
                <Tabs defaultValue="balance" className="w-full">
                    <div className="px-8 mb-4">
                        <TabsList>
                            <TabsTrigger value="balance">Balance</TabsTrigger>
                            <TabsTrigger value="winnings">Winnings</TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="balance">
                        <BalanceHistoryChart bets={bets} />
                    </TabsContent>

                    <TabsContent value="winnings">
                        <WinningsStackedBarChart bets={bets} />
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
