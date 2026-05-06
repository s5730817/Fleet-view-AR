import { useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getBusById, addMaintenanceEntry, addFaultUpdate, createFault, getBusARContext } from "@/lib/api";
import { getDaysAgo } from "@/lib/dateUtils";
import type { ARBusPart, BusComponent, MaintenanceEntry } from "@/types/fleet";
import { usePermission } from "@/context/PermissionContext";
import {
  BusStatusBadge,
} from "@/components/StatusBadge";
import { ComponentCard } from "@/components/ComponentCard";
import { ARView } from "@/components/ARView";
import { HistoryModal } from "@/components/HistoryModal";
import { MaintenanceLogModal } from "@/components/MaintenanceLogModal";
import { IssueLogModal } from "@/components/IssueLogModal";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Bus as BusIcon,
  Gauge,
  Calendar,
  MapPin,
  Eye,
} from "lucide-react";

type MaintenanceEntryDraft = Omit<MaintenanceEntry, "id">;

const BusDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasPermission } = usePermission();
  const location = useLocation();
  const backPath = location.state?.from || "/dashboard";
  const { data: busData, isLoading, error, refetch } = useQuery({
    queryKey: ["bus", id],
    queryFn: () => getBusById(id!),
    enabled: !!id,
  });
  const { data: arContext, refetch: refetchArContext } = useQuery({
    queryKey: ["bus-ar-context", id],
    queryFn: () => getBusARContext(id!),
    enabled: !!id && hasPermission("create"),
  });

  const [arOpen, setArOpen] = useState(false);
  const [historyComponent, setHistoryComponent] =
    useState<BusComponent | null>(null);
  const [logComponent, setLogComponent] = useState<BusComponent | null>(null);
  const [issueComponent, setIssueComponent] = useState<BusComponent | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-lg font-bold text-foreground">Loading bus...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-lg font-bold text-red-500">Error loading bus</p>
      </div>
    );
  }

  if (!busData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-lg font-bold text-foreground">Bus not found</p>

          <Button
            variant="outline"
            onClick={() => navigate("/dashboard")}
            className="mt-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Fleet
          </Button>
        </div>
      </div>
    );
  }

  const bus = busData;

  const handleLogSubmit = async (
    componentId: string,
    entry: MaintenanceEntryDraft
  ) => {
    await addMaintenanceEntry(bus.id, componentId, entry);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["bus", id] }),
      queryClient.invalidateQueries({ queryKey: ["fleet"] }),
    ]);
    await refetch();
  };

  const getStoredUser = () => {
    try {
      return JSON.parse(window.localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  };

  const handleIssueSubmit = async (
    componentId: string,
    input: { issueTypeId: string; assignedUserId?: string; note?: string }
  ) => {
    const issuePart = arContext?.parts.find((part) => part.id === componentId);

    if (!issuePart) {
      throw new Error("Issue metadata for this component is unavailable");
    }

    const issueType = issuePart.issueTypeOptions.find((option) => option.id === input.issueTypeId);

    if (!issueType) {
      throw new Error("Choose an issue type before creating the issue");
    }

    const storedUser = getStoredUser();
    const createdIssue = await createFault({
      title: `${issuePart.name}: ${issueType.label}`,
      description: `${issueType.summary}\n\nBus: ${bus.name} (${bus.plateNumber})\nPart marker: ${issuePart.markerCode}`,
      priority: issueType.priority,
      bus_part_id: componentId,
      issue_type_id: issueType.id,
      created_by: storedUser.id || undefined,
      assigned_user_id: input.assignedUserId || undefined,
      source: "admin_panel",
    });

    if (input.note?.trim()) {
      await addFaultUpdate(createdIssue.id, {
        created_by: storedUser.id || null,
        update_type: "comment",
        description: input.note.trim(),
      });
    }

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["bus", id] }),
      queryClient.invalidateQueries({ queryKey: ["fleet"] }),
      queryClient.invalidateQueries({ queryKey: ["bus-ar-context", id] }),
    ]);
    await Promise.all([refetch(), refetchArContext()]);
  };

  const issuePart: ARBusPart | null = issueComponent
    ? arContext?.parts.find((part) => part.id === issueComponent.id) || null
    : null;

  return (
    <main className="container max-w-6xl px-4 py-6 space-y-6">
      <section className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(backPath)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <BusIcon className="h-6 w-6" />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {bus.name}
              </h1>
              <p className="text-sm text-muted-foreground font-mono">
                {bus.plateNumber}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 justify-end">
            <BusStatusBadge status={bus.status} />

            <Button onClick={() => navigate(`/ar?busId=${bus.id}`, { state: { from: `/bus/${bus.id}` } })}>
              <Eye className="h-4 w-4 mr-2" />
              Open AR Mode
            </Button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-lg border bg-card p-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Gauge className="h-3.5 w-3.5" />
            <span className="text-xs">Mileage</span>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">
            {bus.mileage.toLocaleString()}
          </p>
        </div>

        <div className="rounded-lg border bg-card p-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Calendar className="h-3.5 w-3.5" />
            <span className="text-xs">Last Service</span>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">
            {getDaysAgo(bus.lastServiceDate)}d ago
          </p>
        </div>

        <div className="rounded-lg border bg-card p-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Calendar className="h-3.5 w-3.5" />
            <span className="text-xs">Routine Maintenance</span>
          </div>
          <p className="text-sm font-bold text-foreground">
            {bus.serviceIndicator.label}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {bus.serviceIndicator.dueDate || "No routine maintenance date set"}
          </p>
        </div>
      
        <div className="rounded-lg border bg-card p-3 col-span-2 md:col-span-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <MapPin className="h-3.5 w-3.5" />
            <span className="text-xs">Vehicle</span>
          </div>
          <p className="text-sm font-bold text-foreground">
            {bus.year} {bus.model}
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">
          Component Health
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {bus.components.map((comp) => (
            <ComponentCard
              key={comp.id}
              component={comp}
              onOpenHistory={setHistoryComponent}
              onLogMaintenance={setLogComponent}
              onLogIssue={setIssueComponent}
              canLogMaintenance={hasPermission("create")}
              canLogIssue={hasPermission("create") && Boolean(arContext?.parts.find((part) => part.id === comp.id)?.issueTypeOptions.length)}
            />
          ))}
        </div>
      </section>

      <ARView open={arOpen} onClose={() => setArOpen(false)} bus={bus} />

      <HistoryModal
        open={!!historyComponent}
        onClose={() => setHistoryComponent(null)}
        component={historyComponent}
      />

      <MaintenanceLogModal
        open={!!logComponent}
        onClose={() => setLogComponent(null)}
        component={logComponent}
        busName={bus.name}
        onLogSubmit={handleLogSubmit}
      />

      <IssueLogModal
        open={!!issueComponent}
        onClose={() => setIssueComponent(null)}
        component={issueComponent}
        busName={bus.name}
        issuePart={issuePart}
        assignableUsers={arContext?.assignableUsers || []}
        onIssueSubmit={handleIssueSubmit}
      />
    </main>
  );
};

export default BusDetail;