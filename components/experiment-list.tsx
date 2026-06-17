"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/status-badge";
import { formatDate } from "@/lib/utils";
import { Experiment } from "@/types";

export default function DashboardPage() {
  const router = useRouter();
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchExperiments = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/experiments?includeArchived=${includeArchived}`
      );
      const data = await response.json();
      if (response.ok) {
        setExperiments(data.experiments);
      } else {
        setError(data.error || "获取实验列表失败");
      }
    } catch (err) {
      console.error("Failed to fetch experiments:", err);
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExperiments();
  }, [includeArchived]);

  const handleDelete = async () => {
    if (!deleteId) return;

    setDeleteLoading(true);
    try {
      const response = await fetch(`/api/experiments/${deleteId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setExperiments((prev) => prev.filter((e) => e.id !== deleteId));
        setDeleteId(null);
      }
    } catch (error) {
      console.error("Failed to delete experiment:", error);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">实验列表</h1>
          <p className="text-muted-foreground">管理您的所有 A/B 测试实验</p>
        </div>
        <Button onClick={() => router.push("/experiments/new")}>
          + 新建实验
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          checked={includeArchived}
          onCheckedChange={setIncludeArchived}
        />
        <Label className="cursor-pointer" onClick={() => setIncludeArchived(!includeArchived)}>
          显示已归档
        </Label>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">加载中...</div>
      ) : experiments.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground mb-4">暂无实验</p>
            <Button onClick={() => router.push("/experiments/new")}>
              创建第一个实验
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {experiments.map((experiment) => (
            <Card key={experiment.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{experiment.name}</CardTitle>
                  <StatusBadge status={experiment.status} />
                </div>
                <CardDescription>
                  目标事件：{experiment.targetEvent}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                {experiment.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {experiment.description}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  创建于 {formatDate(experiment.createdAt)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {experiment.versions.length} 个版本
                </p>
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => router.push(`/experiments/${experiment.id}`)}
                >
                  查看详情
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteId(experiment.id)}
                >
                  删除
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除这个实验吗？此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)} disabled={deleteLoading}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteLoading}>
              {deleteLoading ? "删除中..." : "删除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
