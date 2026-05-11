import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { BusStatusBadge } from "@/components/StatusBadge";
import { Bus as BusIcon, Gauge, Calendar, Wrench, ChevronRight, AlertTriangle } from "lucide-react";
import { useSyncStatus } from "@/context/SyncStatusContext";
import type { Bus, MaintenanceAnomaly } from "@/types/fleet";
import { getDaysAgo } from "@/lib/dateUtils";

export function BusCard({ bus, anomalies = [] }: { bus: Bus; anomalies?: MaintenanceAnomaly[] }) {
  const navigate = useNavigate();
  const { getBusOperationState } = useSyncStatus();
  const busQueueState = getBusOperationState(bus.id);

  const busAnomalies = anomalies.filter(
    (a) => a.busId === bus.id && (a.riskLevel === "medium" || a.riskLevel === "high"),
  );
  const topRisk = busAnomalies.some((a) => a.riskLevel === "high") ? "high" : busAnomalies.length > 0 ? "medium" : null;

  return (
    <Card
      className="group cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5"
      onClick={() => navigate(`/bus/${bus.id}`, { state: { from: "/dashboard", bus } })}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <BusIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">{bus.name}</h3>
              <p className="text-xs text-muted-foreground font-mono">{bus.plateNumber} · {bus.year} {bus.model}</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Gauge className="h-3.5 w-3.5" />
            <span className="font-mono text-xs">{bus.mileage.toLocaleString()} mi</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span className="text-xs">Last: {getDaysAgo(bus.lastServiceDate)}d ago</span>
          </div>
          <div className="col-span-2 flex items-center justify-between pt-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</span>
            <BusStatusBadge status={bus.status} />
          </div>
          {topRisk && (
            <div className={`col-span-2 flex items-start gap-2 rounded-md border px-2.5 py-1.5 text-xs font-medium ${
              topRisk === "high"
                ? "border-status-urgent/30 bg-status-urgent/10 text-status-urgent"
                : "border-status-service/30 bg-status-service/10 text-status-service"
            }`}>
              <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
              <span>
                {busAnomalies.length === 1
                  ? `Anomaly detected: ${busAnomalies[0].componentName}`
                  : `${busAnomalies.length} anomalies detected — ${busAnomalies.map((a) => a.componentName).join(", ")}`}
              </span>
            </div>
          )}
        </div>

        <div className="mt-3 rounded-lg border bg-background/60 p-3 space-y-1.5 text-xs text-muted-foreground">
          {(busQueueState.pending > 0 || busQueueState.review > 0) && (
            <div className="flex flex-wrap items-center gap-2 pb-1">
              {busQueueState.pending > 0 && (
                <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 font-semibold text-primary">
                  {busQueueState.pending} pending sync
                </span>
              )}
              {busQueueState.review > 0 && (
                <span className="rounded-full border border-status-urgent/30 bg-status-urgent/10 px-2.5 py-1 font-semibold text-status-urgent">
                  {busQueueState.review} need sync attention
                </span>
              )}
            </div>
          )}
          <p>
            Routine maintenance: <span className="font-medium text-foreground">{bus.serviceIndicator.label}</span>
          </p>
          <p>
            Due date: <span className="font-medium text-foreground">{bus.serviceIndicator.dueDate || "Not scheduled"}</span>
          </p>
          {bus.issueIndicator.activeCount > 0 && (
            <p>
              Open reports: <span className="font-medium text-foreground">{bus.issueIndicator.activeCount}</span>
            </p>
          )}
          {(bus.componentIndicator.outOfOperationCount > 0 || bus.componentIndicator.requiresAttentionCount > 0) && (
            <div className="flex items-center gap-2 pt-1">
              <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-medium text-foreground">
                {bus.componentIndicator.outOfOperationCount > 0
                  ? `${bus.componentIndicator.outOfOperationCount} critical component${bus.componentIndicator.outOfOperationCount === 1 ? "" : "s"}`
                  : `${bus.componentIndicator.requiresAttentionCount} component${bus.componentIndicator.requiresAttentionCount === 1 ? "" : "s"} need attention`}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
