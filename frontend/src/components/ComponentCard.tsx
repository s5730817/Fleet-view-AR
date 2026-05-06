import { ComponentStatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Cog, Disc3 as Disc, Circle, Battery, ArrowUpDown, Thermometer, Settings, Zap, History, Wrench, AlertTriangle } from "lucide-react";
import type { BusComponent } from "@/types/fleet";
import { getDaysAgo } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";

const iconMap: Record<string, React.ElementType> = {
  Cog, Disc, Circle, Battery, ArrowUpDown, Thermometer, Settings, Zap,
};

interface ComponentCardProps {
  component: BusComponent;
  onOpenHistory: (component: BusComponent) => void;
  onLogMaintenance: (component: BusComponent) => void;
  onLogIssue: (component: BusComponent) => void;
  canLogMaintenance?: boolean;
  canLogIssue?: boolean;
}

export function ComponentCard({ component, onOpenHistory, onLogMaintenance, onLogIssue, canLogMaintenance = false, canLogIssue = false }: ComponentCardProps) {
  const Icon = iconMap[component.icon] || Cog;
  const displayStatus = component.status;
  const isCritical = displayStatus === "Needs Replacement!" || displayStatus === "Needs Fix or Replacement" || displayStatus === "Under Repair";
  const isAttention = displayStatus === "Requires Attention" || displayStatus === "Replacement Recommended";
  const canWrite = canLogIssue || canLogMaintenance;

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={cn("flex h-8 w-8 items-center justify-center rounded-md", {
            "bg-status-good/10": displayStatus === "Good",
            "bg-status-service/10": isAttention,
            "bg-status-urgent/10": displayStatus === "Needs Replacement!" || displayStatus === "Needs Fix or Replacement",
            "bg-status-repair/10": displayStatus === "Under Repair",
          })}>
            <Icon className={cn("h-4 w-4", {
              "text-status-good": displayStatus === "Good",
              "text-status-service": isAttention,
              "text-status-urgent": displayStatus === "Needs Replacement!" || displayStatus === "Needs Fix or Replacement",
              "text-status-repair": displayStatus === "Under Repair",
            })} />
          </div>
          <span className="font-semibold text-sm text-foreground">{component.name}</span>
        </div>
        <ComponentStatusBadge status={displayStatus} />
      </div>

      <div className="rounded-md border bg-background/60 p-3 text-xs text-muted-foreground space-y-1.5">
        {component.statusNote && (
          <p className={cn("font-medium", {
            "text-status-urgent": component.maintenanceIndicator.isOverdue || isCritical,
            "text-status-service": !component.maintenanceIndicator.isOverdue && !isCritical && isAttention,
            "text-foreground": displayStatus === "Good",
          })}>
            {component.statusNote}
          </p>
        )}
        {component.maintenanceIndicator.dueDate && (
          <p>
            Maintenance due: <span className="font-medium text-foreground">{component.maintenanceIndicator.dueDate}</span>
          </p>
        )}
        {component.lastInspected && (
          <p>
            Last inspected: <span className="font-medium text-foreground">{getDaysAgo(component.lastInspected)}d ago</span>
          </p>
        )}
        {component.activeIssueCount > 0 && component.statusNote !== `${component.activeIssueCount} open reports` && component.statusNote !== `${component.activeIssueCount} open report` && (
          <p>
            Active reports: <span className="font-medium text-foreground">{component.activeIssueCount}</span>
          </p>
        )}
      </div>

      <div className="flex gap-1.5 pt-1">
        <Button variant="outline" size="sm" className={cn("text-xs h-8", canWrite ? "flex-1" : "w-full")} onClick={() => onOpenHistory(component)}>
          <History className="h-3 w-3 mr-1" /> History
        </Button>
        {canLogIssue && (
          <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => onLogIssue(component)} title="Log issue">
            <AlertTriangle className="h-3 w-3" />
          </Button>
        )}
        {canLogMaintenance && (
          <Button variant="default" size="icon" className="h-8 w-8 shrink-0" onClick={() => onLogMaintenance(component)} title="Log maintenance">
            <Wrench className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}
