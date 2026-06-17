"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ExperimentStats } from "@/types";

interface ExperimentStatsChartProps {
  stats: ExperimentStats;
  loading?: boolean;
}

export default function ExperimentStatsChart({
  stats,
  loading = false,
}: ExperimentStatsChartProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>数据报表</CardTitle>
          <CardDescription>加载中...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const chartData = stats.versions.map((v) => ({
    name: v.versionName + (v.isControl ? " (对照)" : ""),
    曝光量: v.exposures,
    转化量: v.conversions,
    转化率: v.conversionRate,
  }));

  const conversionRateData = stats.versions.map((v) => ({
    name: v.versionName + (v.isControl ? " (对照)" : ""),
    转化率: v.conversionRate,
    lift: v.lift,
  }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>数据概览</CardTitle>
          <CardDescription>整体实验数据统计</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">总曝光量</p>
              <p className="text-3xl font-bold mt-1">
                {stats.stats.totalExposures.toLocaleString()}
              </p>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">总转化量</p>
              <p className="text-3xl font-bold mt-1">
                {stats.stats.totalConversions.toLocaleString()}
              </p>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">整体转化率</p>
              <p className="text-3xl font-bold mt-1">
                {stats.stats.overallConversionRate}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>曝光量与转化量对比</CardTitle>
          <CardDescription>各版本的曝光和转化数据</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="曝光量" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="转化量" fill="hsl(var(--accent-foreground))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>转化率对比</CardTitle>
          <CardDescription>各版本转化率及提升幅度</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={conversionRateData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis label={{ value: "转化率 (%)", angle: -90, position: "insideLeft" }} />
                <Tooltip formatter={(value: number) => [`${value}%`, "转化率"]} />
                <Bar
                  dataKey="转化率"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>版本详细数据</CardTitle>
          <CardDescription>各版本的详细统计数据</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">版本</th>
                  <th className="text-right py-3 px-4 font-medium">曝光量</th>
                  <th className="text-right py-3 px-4 font-medium">转化量</th>
                  <th className="text-right py-3 px-4 font-medium">转化率</th>
                  <th className="text-right py-3 px-4 font-medium">提升幅度</th>
                </tr>
              </thead>
              <tbody>
                {stats.versions.map((version) => (
                  <tr key={version.versionId} className="border-b">
                    <td className="py-3 px-4">
                      <span className="flex items-center gap-2">
                        {version.versionName}
                        {version.isControl && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                            对照组
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="text-right py-3 px-4">
                      {version.exposures.toLocaleString()}
                    </td>
                    <td className="text-right py-3 px-4">
                      {version.conversions.toLocaleString()}
                    </td>
                    <td className="text-right py-3 px-4">
                      {version.conversionRate}%
                    </td>
                    <td
                      className={`text-right py-3 px-4 font-medium ${
                        version.lift > 0
                          ? "text-green-600"
                          : version.lift < 0
                          ? "text-red-600"
                          : "text-muted-foreground"
                      }`}
                    >
                      {version.isControl ? "-" : `${version.lift > 0 ? "+" : ""}${version.lift}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
