"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { generateSlug } from "@/lib/utils";

interface VersionFormData {
  id?: string;
  name: string;
  weight: number;
  code: string;
  isControl: boolean;
}

interface NewExperimentFormProps {
  isEdit?: boolean;
  initialData?: {
    id: string;
    name: string;
    slug: string;
    targetEvent: string;
    description?: string | null;
    status: string;
    versions: VersionFormData[];
  };
}

export default function NewExperimentForm({ isEdit = false, initialData }: NewExperimentFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialData?.name || "");
  const [targetEvent, setTargetEvent] = useState(initialData?.targetEvent || "");
  const [slug, setSlug] = useState(initialData?.slug || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [versions, setVersions] = useState<VersionFormData[]>(
    initialData?.versions || [
      { name: "对照组", weight: 50, code: "", isControl: true },
      { name: "实验组A", weight: 50, code: "", isControl: false },
    ]
  );
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [slugChecking, setSlugChecking] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  const totalWeight = versions.reduce((sum, v) => sum + v.weight, 0);
  const controlCount = versions.filter((v) => v.isControl).length;
  const isFormValid =
    name.trim() !== "" &&
    targetEvent.trim() !== "" &&
    slug.trim() !== "" &&
    slugAvailable !== false &&
    totalWeight === 100 &&
    controlCount === 1 &&
    versions.length >= 2 &&
    versions.every((v) => v.name.trim() !== "" && v.code.trim() !== "");
  const isEditable = !isEdit || initialData?.status === "DRAFT";

  const checkSlugAvailability = useCallback(async (slugValue: string) => {
    if (!slugValue || isEdit) { setSlugAvailable(null); return; }
    setSlugChecking(true);
    try {
      const response = await fetch(`/api/check-slug?slug=${slugValue}`);
      const data = await response.json();
      setSlugAvailable(data.available);
    } catch { setSlugAvailable(null); } finally { setSlugChecking(false); }
  }, [isEdit]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (slug && !isEdit) checkSlugAvailability(slug);
    }, 300);
    return () => clearTimeout(timer);
  }, [slug, checkSlugAvailability, isEdit]);

  const addVersion = () => {
    const newWeight = Math.floor(100 / (versions.length + 1));
    const newVersions = versions.map((v) => ({ ...v, weight: newWeight }));
    const remainder = 100 - newWeight * (versions.length + 1);
    newVersions.push({
      name: `版本${String.fromCharCode(65 + versions.length)}`,
      weight: newWeight + remainder,
      code: "",
      isControl: false,
    });
    setVersions(newVersions);
  };

  const removeVersion = (index: number) => {
    if (versions.length <= 2) return;
    const removedWeight = versions[index].weight;
    const wasControl = versions[index].isControl;
    const newVersions = versions.filter((_, i) => i !== index);
    const extraWeight = Math.floor(removedWeight / newVersions.length);
    newVersions.forEach((v) => { v.weight += extraWeight; });
    const remainder = removedWeight - extraWeight * newVersions.length;
    if (newVersions.length > 0) newVersions[0].weight += remainder;
    if (wasControl && newVersions.length > 0) newVersions[0].isControl = true;
    setVersions(newVersions);
  };

  const updateVersion = (index: number, field: keyof VersionFormData, value: any) => {
    const newVersions = [...versions];
    if (field === "isControl" && value === true) {
      newVersions.forEach((v) => (v.isControl = false));
    }
    newVersions[index] = { ...newVersions[index], [field]: value };
    setVersions(newVersions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!isFormValid) { setError("请检查表单填写是否正确"); return; }
    setLoading(true);
    try {
      const url = isEdit ? `/api/experiments/${initialData!.id}` : "/api/experiments";
      const method = isEdit ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          targetEvent,
          slug: isEdit ? undefined : slug,
          description: description || undefined,
          versions: isEditable ? versions : undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) { setError(data.error || "保存失败"); return; }
      router.push(`/experiments/${data.experiment.id}`);
      router.refresh();
    } catch { setError("保存失败，请重试"); } finally { setLoading(false); }
  };

  const handleStartExperiment = async () => {
    if (!initialData) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/experiments/${initialData.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "RUNNING" }),
      });
      if (response.ok) { setConfirmDialogOpen(false); router.refresh(); }
      else { const data = await response.json(); setError(data.error || "启动失败"); }
    } catch { setError("启动失败，请重试"); } finally { setLoading(false); }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{isEdit ? "编辑实验" : "新建实验"}</h1>
          <p className="text-muted-foreground">{isEdit ? "修改实验配置" : "创建一个新的 A/B 测试实验"}</p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>返回</Button>
      </div>

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      {!isEditable && (
        <Alert><AlertDescription>实验已启动，版本代码和权重不可修改。如需修改，请先暂停实验。</AlertDescription></Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
            <CardDescription>配置实验的基本参数</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">实验名称 *</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：首页按钮颜色测试" disabled={!isEditable || loading} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetEvent">目标事件名 *</Label>
              <Input id="targetEvent" value={targetEvent} onChange={(e) => setTargetEvent(e.target.value)} placeholder="例如：purchase" disabled={!isEditable || loading} required />
              <p className="text-xs text-muted-foreground">调用 window.__track() 时默认上报的事件名</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">短链 Slug *</Label>
              <div className="flex gap-2">
                <Input id="slug" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="例如：btn-color-test" disabled={isEdit || loading} required />
                {!isEdit && <Button type="button" variant="outline" onClick={() => setSlug(generateSlug())} disabled={loading}>自动生成</Button>}
              </div>
              {slugChecking && <p className="text-xs text-muted-foreground">检查中...</p>}
              {!slugChecking && slug && slugAvailable === true && <p className="text-xs text-green-600">✓ Slug 可用</p>}
              {!slugChecking && slug && slugAvailable === false && <p className="text-xs text-destructive">✗ Slug 已被占用</p>}
              <p className="text-xs text-muted-foreground">测试页面地址：/exp/{"{slug}"}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">描述（选填）</Label>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="简单描述这个实验的目的..." disabled={!isEditable || loading} rows={3} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>版本管理</CardTitle>
              <CardDescription>至少 2 个版本，权重之和必须等于 100</CardDescription>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addVersion} disabled={!isEditable || loading}>+ 添加版本</Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span>总权重：</span>
              <span className={`font-medium ${totalWeight === 100 ? "text-green-600" : "text-destructive"}`}>
                {totalWeight}% {totalWeight === 100 ? "✓" : "(需等于 100%)"}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>对照组数量：</span>
              <span className={`font-medium ${controlCount === 1 ? "text-green-600" : "text-destructive"}`}>
                {controlCount} 个 {controlCount === 1 ? "✓" : "(需有且仅有 1 个)"}
              </span>
            </div>
            <div className="space-y-4">
              {versions.map((version, index) => (
                <Card key={index} className="border-dashed">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="font-medium">版本 {index + 1}</span>
                        {version.isControl && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">对照组</span>}
                      </div>
                      {versions.length > 2 && (
                        <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => removeVersion(index)} disabled={!isEditable || loading}>删除</Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>版本名称 *</Label>
                        <Input value={version.name} onChange={(e) => updateVersion(index, "name", e.target.value)} placeholder="例如：红色按钮" disabled={!isEditable || loading} />
                      </div>
                      <div className="space-y-2">
                        <Label>权重 (%) *</Label>
                        <Input type="number" min={0} max={100} value={version.weight} onChange={(e) => updateVersion(index, "weight", parseInt(e.target.value) || 0)} disabled={!isEditable || loading} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>代码 (HTML/JS) *</Label>
                      <Textarea value={version.code} onChange={(e) => updateVersion(index, "code", e.target.value)} placeholder={'<button onclick="window.__track()">点击购买</button>'} rows={6} disabled={!isEditable || loading} className="font-mono text-sm" />
                      <p className="text-xs text-muted-foreground">支持 HTML 和 JavaScript，可调用 window.__track(eventName, extraData) 上报转化</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox checked={version.isControl} onCheckedChange={(checked) => updateVersion(index, "isControl", checked)} disabled={!isEditable || loading || version.isControl} />
                      <Label className="text-sm cursor-pointer">设为对照组</Label>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>取消</Button>
          {isEdit && initialData?.status === "DRAFT" && (
            <Button type="button" variant="secondary" onClick={() => setConfirmDialogOpen(true)} disabled={loading || !isFormValid}>启动实验</Button>
          )}
          <Button type="submit" disabled={loading || !isFormValid}>{loading ? "保存中..." : isEdit ? "保存修改" : "创建实验"}</Button>
        </div>
      </form>

      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认启动实验</DialogTitle>
            <DialogDescription>启动后版本代码和权重将锁定不可修改。确定要启动吗？</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)} disabled={loading}>取消</Button>
            <Button onClick={handleStartExperiment} disabled={loading}>{loading ? "启动中..." : "确认启动"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
