import { cn } from "@/lib/utils";
import type {
  BusComponentIndicator,
  BusIssueIndicator,
  BusServiceIndicator,
  BusStatus,
  ComponentStatus,
} from "@/types/fleet";

const busStatusStyles: Record<BusStatus, string> = {
  "Good": "bg-status-operational/15 text-status-operational border-status-operational/30",
  "Requires Attention": "bg-status-service/15 text-status-service border-status-service/30",
  "Out Of Operation": "bg-status-urgent/15 text-status-urgent border-status-urgent/30",
};

const componentStatusStyles: Record<ComponentStatus, string> = {
  "Good": "bg-status-good/15 text-status-good border-status-good/30",
  "Requires Attention": "bg-status-service/15 text-status-service border-status-service/30",
  "Replacement Recommended": "bg-status-service/15 text-status-service border-status-service/30",
  "Needs Replacement!": "bg-status-urgent/15 text-status-urgent border-status-urgent/30",
  "Needs Fix or Replacement": "bg-status-urgent/15 text-status-urgent border-status-urgent/30",
  "Under Repair": "bg-status-repair/15 text-status-repair border-status-repair/30 animate-pulse-slow",
};

const issueIndicatorStyles: Record<BusIssueIndicator["state"], string> = {
  none: "bg-status-operational/15 text-status-operational border-status-operational/30",
  open_reports: "bg-status-service/15 text-status-service border-status-service/30",
  needs_fix: "bg-status-urgent/15 text-status-urgent border-status-urgent/30",
  under_repair: "bg-status-repair/15 text-status-repair border-status-repair/30 animate-pulse-slow",
};

const serviceIndicatorStyles: Record<BusServiceIndicator["state"], string> = {
  ok: "bg-status-operational/15 text-status-operational border-status-operational/30",
  due_soon: "bg-status-service/15 text-status-service border-status-service/30",
  due_today: "bg-status-service/15 text-status-service border-status-service/30",
  overdue: "bg-status-urgent/15 text-status-urgent border-status-urgent/30",
  unscheduled: "bg-muted text-muted-foreground border-border",
};

const componentIndicatorStyles: Record<BusComponentIndicator["state"], string> = {
  good: "bg-status-operational/15 text-status-operational border-status-operational/30",
  requires_attention: "bg-status-service/15 text-status-service border-status-service/30",
  out_of_operation: "bg-status-urgent/15 text-status-urgent border-status-urgent/30",
};

export function BusStatusBadge({ status }: { status: BusStatus }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold", busStatusStyles[status])}>
      <span className={cn("h-1.5 w-1.5 rounded-full", {
        "bg-status-operational": status === "Good",
        "bg-status-service": status === "Requires Attention",
        "bg-status-urgent": status === "Out Of Operation",
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
        "bg-status-service": status === "Requires Attention" || status === "Replacement Recommended",
        "bg-status-urgent": status === "Needs Replacement!" || status === "Needs Fix or Replacement",
        "bg-status-repair": status === "Under Repair",
      })} />
      {status}
    </span>
  );
}

export function IssueIndicatorBadge({ indicator }: { indicator: BusIssueIndicator }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold", issueIndicatorStyles[indicator.state])}>
      <span className={cn("h-1.5 w-1.5 rounded-full", {
        "bg-status-operational": indicator.state === "none",
        "bg-status-service": indicator.state === "open_reports",
        "bg-status-urgent": indicator.state === "needs_fix",
        "bg-status-repair": indicator.state === "under_repair",
      })} />
      {indicator.label}
    </span>
  );
}

export function ServiceIndicatorBadge({ indicator }: { indicator: BusServiceIndicator }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold", serviceIndicatorStyles[indicator.state])}>
      <span className={cn("h-1.5 w-1.5 rounded-full", {
        "bg-status-operational": indicator.state === "ok",
        "bg-status-service": indicator.state === "due_soon" || indicator.state === "due_today",
        "bg-status-urgent": indicator.state === "overdue",
        "bg-muted-foreground": indicator.state === "unscheduled",
      })} />
      {indicator.label}
    </span>
  );
}

export function ComponentIndicatorBadge({ indicator }: { indicator: BusComponentIndicator }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold", componentIndicatorStyles[indicator.state])}>
      <span className={cn("h-1.5 w-1.5 rounded-full", {
        "bg-status-operational": indicator.state === "good",
        "bg-status-service": indicator.state === "requires_attention",
        "bg-status-urgent": indicator.state === "out_of_operation",
      })} />
      {indicator.label}
    </span>
  );
}
