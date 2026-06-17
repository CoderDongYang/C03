import { Badge } from "@/components/ui/badge";
import { ExperimentStatus } from "@/types";

const statusConfig: Record<ExperimentStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  DRAFT: { label: "草稿", variant: "secondary" },
  RUNNING: { label: "运行中", variant: "default" },
  PAUSED: { label: "已暂停", variant: "outline" },
  ARCHIVED: { label: "已归档", variant: "destructive" },
};

export function StatusBadge({ status }: { status: ExperimentStatus }) {
  const config = statusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
