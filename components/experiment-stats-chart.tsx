"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ErrorBar,
  Legend,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExperimentStats } from "@/types";
import { RefreshCw, Download } from "lucide-react";

interface ExperimentStatsChartProps {
  stats: ExperimentStats;
  loading?: boolean;
  onRefresh?: () => void;
  onExportCSV?: () => void;
  refreshing?: boolean;
  exporting?: boolean;
  lastUpdated?: Date | null;
}

export default function ExperimentStatsChart({
  stats,
  loading = false,
  onRefresh,
  onExportCSV,
  refreshing = false,
  exporting = false,
  lastUpdated = null,
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

  const chartData = stats.versions
    .slice()
    .sort((a, b) => {
      if (a.isControl !== b.isControl) return a.isControl ? -1 : 1;
      return 0;
    })
    .map((v) => {
      const lowerError = v.conversionRate - v.ciLower;
      const upperError = v.ciUpper - v.conversionRate;
      const avgError = (lowerError + upperError) / 2;
      return {
        name: v.versionName + (v.isControl ? " (对照)" : ""),
        转化率: v.conversionRate,
        误差: avgError,
        误差下限: lowerError,
        误差上限: upperError,
        isControl: v.isControl,
        isSignificant: v.isSignificant,
      };
    });

  const handleRefresh = () => {
    if (onRefresh && !refreshing) onRefresh();
  };

  const handleExport = () => {
    if (onExportCSV && !exporting) onExportCSV();
  };

  const getBarColor = (entry: any, index: number) => {
    if (entry.isControl) return "hsl(var(--muted-foreground) / 0.6)";
    if (entry.isSignificant) return "#10b981";
    return "hsl(var(--primary))";
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>数据概览</CardTitle>
            <CardDescription className="mt-1">
              目标事件: <span className="font-mono">{stats.stats.targetEvent}</span>
              {lastUpdated && (
                <span className="ml-4 text-muted-foreground">
                  更新于 {lastUpdated.toLocaleTimeString()}
                </span>
              )}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
              />
              {refreshing ? "刷新中..." : "刷新"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={exporting}
            >
              <Download className="h-4 w-4 mr-2" />
              {exporting ? "导出中..." : "导出 CSV"}
            </Button>
          </div>
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
          <CardTitle>转化率对比（含 95% 置信区间）</CardTitle>
          <CardDescription>
            水平柱状图展示各版本转化率，误差棒为 Wilson 置信区间
          </CardDescription>
          <div className="flex flex-wrap gap-4 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: "hsl(var(--muted-foreground) / 0.6)" }}></span>
              对照组
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm bg-emerald-500"></span>
              显著提升 (p&lt;0.05)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: "hsl(var(--primary))" }}></span>
              不显著
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[320px] sm:h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 10, right: 40, left: 10, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis
                  type="number"
                  domain={[0, "auto"]}
                  label={{
                    value: "转化率 (%)",
                    position: "insideBottom",
                    offset: -5,
                  }}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={120}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  formatter={(value) => [`${value}%`, "转化率"]}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      const rate = d.转化率;
                      const lower = rate - d.误差下限;
                      const upper = rate + d.误差上限;
                      return (
                        <div className="bg-background border rounded-lg p-3 shadow-lg text-sm">
                          <p className="font-semibold mb-1">{d.name}</p>
                          <p className="text-muted-foreground">
                            转化率: <span className="font-medium">{rate}%</span>
                          </p>
                          <p className="text-muted-foreground">
                            95% CI: [{lower.toFixed(2)}%, {upper.toFixed(2)}%]
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="转化率"
                  radius={[0, 4, 4, 0]}
                  barSize={28}
                >
                  <ErrorBar
                    dataKey="误差"
                    width={8}
                    strokeWidth={2}
                    stroke="hsl(var(--foreground) / 0.7)"
                    direction="x"
                  />
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={getBarColor(entry, index)}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>版本详细数据</CardTitle>
          <CardDescription>
            各版本的完整统计数据（基准：对照组）
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-3 font-medium">版本</th>
                  <th className="text-right py-3 px-3 font-medium">曝光数</th>
                  <th className="text-right py-3 px-3 font-medium">转化数</th>
                  <th className="text-right py-3 px-3 font-medium">转化率</th>
                  <th className="text-right py-3 px-3 font-medium">95% CI</th>
                  <th className="text-right py-3 px-3 font-medium">提升</th>
                  <th className="text-right py-3 px-3 font-medium">p 值</th>
                  <th className="text-center py-3 px-3 font-medium">显著性</th>
                </tr>
              </thead>
              <tbody>
                {stats.versions.map((version) => (
                  <tr
                    key={version.versionId}
                    className={`border-b ${version.isControl ? "bg-muted/20" : ""}`}
                  >
                    <td className="py-3 px-3">
                      <span className="flex items-center gap-2">
                        {version.versionName}
                        {version.isControl && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                            对照组
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="text-right py-3 px-3 tabular-nums">
                      {version.exposures.toLocaleString()}
                    </td>
                    <td className="text-right py-3 px-3 tabular-nums">
                      {version.conversions.toLocaleString()}
                    </td>
                    <td className="text-right py-3 px-3 tabular-nums font-medium">
                      {version.conversionRate}%
                    </td>
                    <td className="text-right py-3 px-3 tabular-nums text-muted-foreground">
                      [{version.ciLower}%, {version.ciUpper}%]
                    </td>
                    <td
                      className={`text-right py-3 px-3 tabular-nums font-medium ${
                        version.isControl
                          ? "text-muted-foreground"
                          : version.lift > 0
                          ? "text-green-600"
                          : version.lift < 0
                          ? "text-red-600"
                          : "text-muted-foreground"
                      }`}
                    >
                      {version.isControl
                        ? "—"
                        : `${version.lift > 0 ? "+" : ""}${version.lift}%`}
                    </td>
                    <td className="text-right py-3 px-3 tabular-nums text-muted-foreground">
                      {version.isControl
                        ? "—"
                        : version.pValue === null
                        ? "N/A"
                        : version.pValue < 0.0001
                        ? "<0.0001"
                        : version.pValue.toFixed(4)}
                    </td>
                    <td className="text-center py-3 px-3">
                      {version.isControl ? (
                        <span className="text-muted-foreground text-xs">基准</span>
                      ) : version.isSignificant ? (
                        <span className="inline-flex items-center gap-1 text-green-700 bg-green-50 dark:bg-green-950/40 px-2.5 py-1 rounded-full text-xs font-medium">
                          显著 ✅
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-700 bg-red-50 dark:bg-red-950/40 px-2.5 py-1 rounded-full text-xs font-medium">
                          不显著 ❌
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 text-xs text-muted-foreground">
            <p>* 提升百分比 = (实验组转化率 - 对照组转化率) / 对照组转化率 × 100%</p>
            <p>* 95% 置信区间使用 Wilson 得分区间方法计算</p>
            <p>* p 值使用两样本 Z 检验（比例检验），p &lt; 0.05 视为统计显著</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
