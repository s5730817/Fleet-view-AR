import { cn } from "@/lib/utils";
import type { BusStatus, ComponentStatus } from "@/types/fleet";

const busStatusStyles: Record<BusStatus, string> = {
  "Operational": "bg-status-operational/15 text-status-operational border-status-operational/30",
  "Needs Service": "bg-status-service/15 text-status-service border-status-service/30",
  "Under Repair": "bg-status-repair/15 text-status-repair border-status-repair/30 animate-pulse-slow",
};

const componentStatusStyles: Record<ComponentStatus, string> = {
  "Good": "bg-status-good/15 text-status-good border-status-good/30",
  "Due Soon": "bg-status-due-soon/15 text-status-due-soon border-status-due-soon/30",
  "Urgent": "bg-status-urgent/15 text-status-urgent border-status-urgent/30 animate-pulse-slow",
};

export function BusStatusBadge({ status }: { status: BusStatus }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold", busStatusStyles[status])}>
      <span className={cn("h-1.5 w-1.5 rounded-full", {
        "bg-status-operational": status === "Operational",
        "bg-status-service": status === "Needs Service",
        "bg-status-repair": status === "Under Repair",
      })} />
      {status}
    </span>
  );
}

export function ComponentStatusBadge({ status }: { status: ComponentStatus }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-semibold", componentStatusStyles[status])}>
      <span className={cn("h-1.5 w-1.5 rounded-full", {
        "bg-status-good": status === "Good",
        "bg-status-due-soon": status === "Due Soon",
        "bg-status-urgent": status === "Urgent",
      })} />
      {status}
    </span>
  );
}
