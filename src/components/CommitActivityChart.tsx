
'use client';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartTooltipContent, ChartTooltip, ChartContainer } from '@/components/ui/chart';

interface CommitActivityChartProps {
    commitActivity: { week: string, commits: number }[];
}

export function CommitActivityChart({ commitActivity }: CommitActivityChartProps) {
    if (commitActivity.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Commit Activity</CardTitle>
                    <CardDescription>Weekly commits over the last year.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-center p-8 text-muted-foreground">
                        No commit activity data available.
                    </div>
                </CardContent>
            </Card>
        )
    }

    const chartData = commitActivity.map(d => ({
        date: d.week,
        commits: d.commits
    }));

    return (
        <Card>
            <CardHeader>
                <CardTitle>Commit Activity</CardTitle>
                <CardDescription>Weekly commits over the last year.</CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer
                    config={{
                        commits: {
                            label: 'Commits',
                            color: 'hsl(var(--primary))',
                        },
                    }}
                    className="h-[200px] w-full"
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid vertical={false} strokeDasharray="3 3" />
                            <XAxis
                                dataKey="date"
                                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short' })}
                                interval={Math.ceil(chartData.length / 6)}
                                tickLine={false}
                                axisLine={false}
                                fontSize={12}
                            />
                            <YAxis
                                tickLine={false}
                                axisLine={false}
                                fontSize={12}
                                allowDecimals={false}
                            />
                            <ChartTooltip
                                cursor={false}
                                content={<ChartTooltipContent
                                    labelFormatter={(label) => new Date(label).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    indicator="dot"
                                />}
                            />
                            <Bar dataKey="commits" fill="var(--color-commits)" radius={4} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}
