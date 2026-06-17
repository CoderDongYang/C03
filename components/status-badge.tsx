import { Badge } from "@/components/ui/badge";
import { ExperimentStatus } from "@/types";

interface StatusBadgeProps {
  status: ExperimentStatus;
}

const statusConfig: Record<ExperimentStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  DRAFT: { label: "草稿", variant: "secondary" },
  RUNNING: { label: "运行中", variant: "default" },
  PAUSED: { label: "已暂停", variant: "outline" },
  ARCHIVED: { label: "已归档", variant: "destructive" },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
