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
import { RefreshCw, Download, Info } from "lucide-react";

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
    .map((v) => ({
      name: v.versionName + (v.isControl ? " (对照)" : ""),
      转化率: v.conversionRate,
      误差下限: v.conversionRate - v.ciLower,
      误差上限: v.ciUpper - v.conversionRate,
      isControl: v.isControl,
      isSignificant: v.isSignificant,
    }));

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

  const uvTooltip = (
    <div className="flex items-start gap-1.5 text-xs text-muted-foreground mt-2">
      <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
      <span>转化率基于独立访客数（UV）计算，是A/B测试的标准口径</span>
    </div>
  );

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
          <div className="grid gap-4 md:grid-cols-3 sm:grid-cols-2">
            <div className="p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">曝光（PV/UV）</p>
              </div>
              <p className="text-2xl sm:text-3xl font-bold mt-1">
                {stats.stats.totalExposures.toLocaleString()}
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  / {stats.stats.totalUvExposures.toLocaleString()}
                </span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                浏览次数 / 独立访客数
              </p>
            </div>
            <div className="p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">转化（PV/UV）</p>
              </div>
              <p className="text-2xl sm:text-3xl font-bold mt-1">
                {stats.stats.totalConversions.toLocaleString()}
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  / {stats.stats.totalUvConversions.toLocaleString()}
                </span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                转化事件数 / 转化用户数
              </p>
            </div>
            <div className="p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">UV 转化率</p>
              </div>
              <p className="text-2xl sm:text-3xl font-bold mt-1">
                {stats.stats.overallConversionRate}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                标准A/B测试口径（转化UV / 曝光UV）
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>转化率对比（含 95% 置信区间）</CardTitle>
          <CardDescription>
            水平柱状图展示各版本 UV 转化率，误差棒为 Wilson 置信区间
          </CardDescription>
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
                    value: "UV 转化率 (%)",
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
                  formatter={(value: number, name: string) => [
                    `${value}%`,
                    "UV 转化率",
                  ]}
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
                            UV 转化率: <span className="font-medium">{rate}%</span>
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
                <Legend
                  payload={[
                    {
                      value: "对照组",
                      type: "rect",
                      color: "hsl(var(--muted-foreground) / 0.6)",
                    },
                    {
                      value: "显著提升 (p<0.05)",
                      type: "rect",
                      color: "#10b981",
                    },
                    {
                      value: "不显著",
                      type: "rect",
                      color: "hsl(var(--primary))",
                    },
                  ]}
                />
                <Bar
                  dataKey="转化率"
                  radius={[0, 4, 4, 0]}
                  barSize={28}
                >
                  <ErrorBar
                    dataKey="误差下限"
                    dataKeyUpper="误差上限"
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
          {uvTooltip}
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
                  <th className="text-left py-3 px-2 font-medium whitespace-nowrap">版本</th>
                  <th className="text-right py-3 px-2 font-medium whitespace-nowrap">曝光 PV/UV</th>
                  <th className="text-right py-3 px-2 font-medium whitespace-nowrap">转化 PV/UV</th>
                  <th className="text-right py-3 px-2 font-medium whitespace-nowrap">UV 转化率</th>
                  <th className="text-right py-3 px-2 font-medium whitespace-nowrap">95% CI</th>
                  <th className="text-right py-3 px-2 font-medium whitespace-nowrap">提升</th>
                  <th className="text-right py-3 px-2 font-medium whitespace-nowrap">p 值</th>
                  <th className="text-center py-3 px-2 font-medium whitespace-nowrap">显著性</th>
                </tr>
              </thead>
              <tbody>
                {stats.versions.map((version) => (
                  <tr
                    key={version.versionId}
                    className={`border-b ${version.isControl ? "bg-muted/20" : ""}`}
                  >
                    <td className="py-3 px-2">
                      <span className="flex items-center gap-2">
                        {version.versionName}
                        {version.isControl && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full shrink-0">
                            对照组
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="text-right py-3 px-2 tabular-nums whitespace-nowrap">
                      <span>{version.pvExposures.toLocaleString()}</span>
                      <span className="text-muted-foreground mx-1">/</span>
                      <span className="font-medium">{version.uvExposures.toLocaleString()}</span>
                    </td>
                    <td className="text-right py-3 px-2 tabular-nums whitespace-nowrap">
                      <span>{version.pvConversions.toLocaleString()}</span>
                      <span className="text-muted-foreground mx-1">/</span>
                      <span className="font-medium">{version.uvConversions.toLocaleString()}</span>
                    </td>
                    <td className="text-right py-3 px-2 tabular-nums font-medium whitespace-nowrap">
                      {version.conversionRate}%
                    </td>
                    <td className="text-right py-3 px-2 tabular-nums text-muted-foreground whitespace-nowrap">
                      [{version.ciLower}%, {version.ciUpper}%]
                    </td>
                    <td
                      className={`text-right py-3 px-2 tabular-nums font-medium whitespace-nowrap ${
                        version.isControl
                          ? "text-muted-foreground"
                          : version.lift !== null && version.lift > 0
                          ? "text-green-600"
                          : version.lift !== null && version.lift < 0
                          ? "text-red-600"
                          : "text-muted-foreground"
                      }`}
                    >
                      {version.isControl
                        ? "—"
                        : version.lift === null
                        ? "N/A"
                        : `${version.lift > 0 ? "+" : ""}${version.lift}%`}
                    </td>
                    <td className="text-right py-3 px-2 tabular-nums text-muted-foreground whitespace-nowrap">
                      {version.isControl
                        ? "—"
                        : version.pValue === null
                        ? "N/A"
                        : version.pValue < 0.0001
                        ? "<0.0001"
                        : version.pValue.toFixed(4)}
                    </td>
                    <td className="text-center py-3 px-2 whitespace-nowrap">
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
          <div className="mt-4 text-xs text-muted-foreground space-y-1">
            <p>* <strong>PV</strong>（浏览量）：每次打开/刷新页面计一次；<strong>UV</strong>（独立访客）：同一访客（cookie标识）只计一次</p>
            <p>* UV 转化率 = 转化UV数 / 曝光UV数 × 100%（标准A/B测试统计口径）</p>
            <p>* 提升百分比 = (实验组UV转化率 - 对照组UV转化率) / 对照组UV转化率 × 100%</p>
            <p>* 95% 置信区间使用 Wilson 得分区间方法计算</p>
            <p>* p 值使用两样本 Z 检验（比例检验），p &lt; 0.05 视为统计显著</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
