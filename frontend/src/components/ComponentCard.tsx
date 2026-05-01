import { ComponentStatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Cog, Disc3 as Disc, Circle, Battery, ArrowUpDown, Thermometer, Settings, Zap, History, Wrench } from "lucide-react";
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
}

export function ComponentCard({ component, onOpenHistory, onLogMaintenance }: ComponentCardProps) {
  const Icon = iconMap[component.icon] || Cog;

  const progressColor = component.healthPercent >= 70
    ? "bg-status-good"
    : component.healthPercent >= 40
    ? "bg-status-due-soon"
    : "bg-status-urgent";

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={cn("flex h-8 w-8 items-center justify-center rounded-md", {
            "bg-status-good/10": component.status === "Good",
            "bg-status-due-soon/10": component.status === "Due Soon",
            "bg-status-urgent/10": component.status === "Urgent",
          })}>
            <Icon className={cn("h-4 w-4", {
              "text-status-good": component.status === "Good",
              "text-status-due-soon": component.status === "Due Soon",
              "text-status-urgent": component.status === "Urgent",
            })} />
          </div>
          <span className="font-semibold text-sm text-foreground">{component.name}</span>
        </div>
        <ComponentStatusBadge status={component.status} />
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Health</span>
          <span className="font-mono">{component.healthPercent}%</span>
        </div>
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className={cn("h-full rounded-full transition-all", progressColor)}
            style={{ width: `${component.healthPercent}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
        <div>
          <p className="text-[10px] uppercase tracking-wider mb-0.5">Last Repair</p>
          <p className="font-mono font-medium text-foreground">{getDaysAgo(component.lastRepair)}d ago</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider mb-0.5">Last Service</p>
          <p className="font-mono font-medium text-foreground">{getDaysAgo(component.lastService)}d ago</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider mb-0.5">Last Replace</p>
          <p className="font-mono font-medium text-foreground">{getDaysAgo(component.lastReplacement)}d ago</p>
        </div>
      </div>

      <div className="flex gap-1.5 pt-1">
        <Button variant="outline" size="sm" className="flex-1 text-xs h-8" onClick={() => onOpenHistory(component)}>
          <History className="h-3 w-3 mr-1" /> History
        </Button>
        <Button variant="default" size="icon" className="h-8 w-8 shrink-0" onClick={() => onLogMaintenance(component)}>
          <Wrench className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
