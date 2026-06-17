"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/status-badge";
import { ExperimentStats, Experiment } from "@/types";
import { formatDate, truncate } from "@/lib/utils";
import ExperimentStatsChart from "./experiment-stats-chart";

interface ExperimentDetailProps {
  experimentId: string;
}

export default function ExperimentDetail({ experimentId }: ExperimentDetailProps) {
  const router = useRouter();
  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [stats, setStats] = useState<ExperimentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [actionDialog, setActionDialog] = useState<{
    type: "start" | "pause" | "archive" | null;
  }>({ type: null });
  const [actionLoading, setActionLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const autoRefreshRef = useRef<NodeJS.Timeout | null>(null);
  const AUTO_REFRESH_INTERVAL = 30 * 1000;

  const fetchExperiment = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/experiments/${experimentId}`);
      const data = await response.json();
      if (response.ok) {
        setExperiment(data.experiment);
      }
    } catch (error) {
      console.error("Failed to fetch experiment:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = useCallback(async (showLoading = false) => {
    if (showLoading) setStatsLoading(true);
    setRefreshing(true);
    try {
      const response = await fetch(`/api/experiments/${experimentId}/stats`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      const data = await response.json();
      if (response.ok) {
        setStats(data);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setStatsLoading(false);
      setRefreshing(false);
    }
  }, [experimentId]);

  useEffect(() => {
    fetchExperiment();
    fetchStats(true);
  }, [experimentId, fetchStats]);

  useEffect(() => {
    const startAutoRefresh = () => {
      stopAutoRefresh();
      autoRefreshRef.current = setInterval(() => {
        fetchStats(false);
      }, AUTO_REFRESH_INTERVAL);
    };

    const stopAutoRefresh = () => {
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
        autoRefreshRef.current = null;
      }
    };

    startAutoRefresh();

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchStats(false);
        startAutoRefresh();
      } else {
        stopAutoRefresh();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      stopAutoRefresh();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetchStats]);

  const handleRefresh = () => {
    fetchStats(false);
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const response = await fetch(`/api/experiments/${experimentId}/export`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("导出失败");
      }
      const blob = await response.blob();
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `experiment-events-${Date.now()}.csv`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) filename = match[1];
      }
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
      alert("导出 CSV 失败，请稍后重试");
    } finally {
      setExporting(false);
    }
  };

  const handleStatusChange = async (status: string) => {
    setActionLoading(true);
    try {
      const response = await fetch(`/api/experiments/${experimentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        setActionDialog({ type: null });
        fetchExperiment();
        fetchStats(false);
      }
    } catch (error) {
      console.error("Failed to update status:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const copyTestLink = async () => {
    if (!experiment) return;

    const link = `${window.location.origin}/exp/${experiment.slug}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = link;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const openPreview = (versionId: string) => {
    if (!experiment) return;
    window.open(`/exp/${experiment.slug}?preview=${versionId}`, "_blank");
  };

  if (loading) {
    return (
      <div className="text-center py-12 text-muted-foreground">加载中...</div>
    );
  }

  if (!experiment) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        实验不存在或无权访问
      </div>
    );
  }

  const testUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/exp/${experiment.slug}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            ← 返回
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              {experiment.name}
              <StatusBadge status={experiment.status} />
            </h1>
            <p className="text-muted-foreground text-sm">
              创建于 {formatDate(experiment.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {experiment.status === "DRAFT" && (
            <>
              <Button variant="outline" onClick={() => router.push(`/experiments/${experiment.id}/edit`)}>
                编辑
              </Button>
              <Button onClick={() => setActionDialog({ type: "start" })}>
                启动实验
              </Button>
            </>
          )}
          {experiment.status === "RUNNING" && (
            <Button variant="secondary" onClick={() => setActionDialog({ type: "pause" })}>
              暂停实验
            </Button>
          )}
          {experiment.status === "PAUSED" && (
            <Button onClick={() => setActionDialog({ type: "start" })}>
              继续实验
            </Button>
          )}
          {(experiment.status === "DRAFT" || experiment.status === "PAUSED") && (
            <Button variant="outline" onClick={() => setActionDialog({ type: "archive" })}>
              归档
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-muted-foreground">目标事件</Label>
              <p className="font-mono text-sm mt-1">{experiment.targetEvent}</p>
            </div>
            {experiment.description && (
              <div>
                <Label className="text-muted-foreground">描述</Label>
                <p className="text-sm mt-1">{experiment.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>测试链接</CardTitle>
            <CardDescription>访客通过此链接参与实验</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input value={testUrl} readOnly className="font-mono text-sm" />
              <Button onClick={copyTestLink} variant="outline">
                {copied ? "已复制" : "复制"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              安全提示：请勿输入不可信的代码，本工具仅限内部使用
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>版本列表</CardTitle>
          <CardDescription>共 {experiment.versions.length} 个版本</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {experiment.versions.map((version) => (
              <div
                key={version.id}
                className="border rounded-lg p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{version.name}</span>
                    <span className="text-sm text-muted-foreground">
                      权重: {version.weight}%
                    </span>
                    {version.isControl && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        对照组
                      </span>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openPreview(version.id)}
                  >
                    预览
                  </Button>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">代码预览：</p>
                  <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                    {truncate(version.code, 200)}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {stats && (
        <ExperimentStatsChart
          stats={stats}
          loading={statsLoading}
          refreshing={refreshing}
          exporting={exporting}
          lastUpdated={lastUpdated}
          onRefresh={handleRefresh}
          onExportCSV={handleExportCSV}
        />
      )}

      <Dialog
        open={!!actionDialog.type}
        onOpenChange={() => setActionDialog({ type: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.type === "start" && "确认启动实验"}
              {actionDialog.type === "pause" && "确认暂停实验"}
              {actionDialog.type === "archive" && "确认归档实验"}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.type === "start" &&
                "启动后版本代码和权重将锁定不可修改。确定要启动吗？"}
              {actionDialog.type === "pause" &&
                "暂停后访客将看到'实验已暂停'提示。确定要暂停吗？"}
              {actionDialog.type === "archive" &&
                "归档后实验将从默认列表中隐藏。确定要归档吗？"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActionDialog({ type: null })}
              disabled={actionLoading}
            >
              取消
            </Button>
            <Button
              variant={actionDialog.type === "archive" ? "destructive" : "default"}
              onClick={() => {
                if (actionDialog.type === "start") handleStatusChange("RUNNING");
                if (actionDialog.type === "pause") handleStatusChange("PAUSED");
                if (actionDialog.type === "archive") handleStatusChange("ARCHIVED");
              }}
              disabled={actionLoading}
            >
              {actionLoading ? "处理中..." : "确认"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
