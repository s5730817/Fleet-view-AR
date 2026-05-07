import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getBusById, addFaultUpdate, addMaintenanceEntry, createFault, getBusARContext, updateFaultStatus } from "@/lib/api";
import { getDaysAgo } from "@/lib/dateUtils";
import type { ARBusPart, Bus, BusComponent, MaintenanceEntry } from "@/types/fleet";
import { usePermission } from "@/context/PermissionContext";
import { useSyncStatus } from "@/context/SyncStatusContext";
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
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";

type MaintenanceEntryDraft = Omit<MaintenanceEntry, "id"> & {
  type: "service" | "repair" | "replacement";
  user_id: string;
  resolved_issue_ids?: string[];
};

type QueuedWriteResult = {
  offlinePending?: boolean;
};

const BusDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasPermission, role } = usePermission();
  const { isOnline, operations, getBusOperationState, retryOperation, resolveOperation, syncInProgress } = useSyncStatus();
  const location = useLocation();
  const backPath = location.state?.from || "/dashboard";
  const cachedFleetBus = queryClient.getQueryData<Bus[]>(["fleet"])?.find((bus) => bus.id === id);
  const { data: busData, isLoading, error, refetch } = useQuery({
    queryKey: ["bus", id],
    queryFn: () => getBusById(id!),
    enabled: !!id,
    initialData: () => (location.state?.bus as Bus | undefined) || cachedFleetBus,
  });
  const { data: arContext, refetch: refetchArContext } = useQuery({
    queryKey: ["bus-ar-context", id],
    queryFn: () => getBusARContext(id!),
    enabled: !!id,
  });

  const [arOpen, setArOpen] = useState(false);
  const [historyComponent, setHistoryComponent] =
    useState<BusComponent | null>(null);
  const [logComponent, setLogComponent] = useState<BusComponent | null>(null);
  const [issueComponent, setIssueComponent] = useState<BusComponent | null>(null);
  const [queueActionId, setQueueActionId] = useState<string | null>(null);
  const [serverApprovalActionId, setServerApprovalActionId] = useState<string | null>(null);
  const [modalArContext, setModalArContext] = useState<ARBusPart[] | null>(null);

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
  const busQueueState = getBusOperationState(bus.id);
  const busOperations = operations.filter((operation) => operation.busId === bus.id);
  const pendingApprovalIssues = (arContext?.parts || []).flatMap((part) =>
    part.activeIssues
      .filter((issue) => issue.status === "awaiting_approval" && issue.pendingMaintenanceApproval)
      .map((issue) => ({
        ...issue,
        partName: part.name,
      }))
  );

  const refreshBusQueries = () => {
    void queryClient.invalidateQueries({ queryKey: ["bus", id] });
    void queryClient.invalidateQueries({ queryKey: ["fleet"] });
    void queryClient.invalidateQueries({ queryKey: ["bus-ar-context", id] });
    void refetch();
    void refetchArContext();
  };

  useEffect(() => {
    if (arContext) {
      setModalArContext(arContext.parts);
    }
  }, [arContext]);

  const loadArContextForModals = async () => {
    if (!id) {
      return null;
    }

    try {
      const resolvedArContext = await getBusARContext(id);
      setModalArContext(resolvedArContext.parts);
      return resolvedArContext;
    } catch {
      return null;
    }
  };

  const handleLogSubmit = async (componentId: string, entry: MaintenanceEntryDraft): Promise<QueuedWriteResult> => {
    const result = await addMaintenanceEntry(bus.id, componentId, entry, { busName: bus.name });
    refreshBusQueries();
    return {
      offlinePending: "offlinePending" in result ? Boolean(result.offlinePending) : false,
    };
  };

  const handleIssueSubmit = async (
    componentId: string,
    input: { issueTypeId: string; assignedUserId?: string; note?: string }
  ): Promise<QueuedWriteResult> => {
    const resolvedArContext = await loadArContextForModals();
    const issuePart = resolvedArContext?.parts.find((part) => part.id === componentId)
      || modalArContext?.find((part) => part.id === componentId);

    if (!issuePart) {
      throw new Error("Issue metadata for this component is unavailable");
    }

    const issueType = issuePart.issueTypeOptions.find((option) => option.id === input.issueTypeId);

    if (!issueType) {
      throw new Error("Choose an issue type before creating the issue");
    }

    const result = await createFault({
      title: `${issuePart.name}: ${issueType.label}`,
      description: `${issueType.summary}\n\nBus: ${bus.name} (${bus.plateNumber})\nPart marker: ${issuePart.markerCode}`,
      priority: issueType.priority,
      bus_part_id: componentId,
      issue_type_id: issueType.id,
      assigned_user_id: input.assignedUserId || undefined,
      source: "admin_panel",
      initial_note: input.note?.trim() || undefined,
      offline_context: {
        busId: bus.id,
        busName: bus.name,
      },
    });

    refreshBusQueries();
    return {
      offlinePending: Boolean(result.offlinePending),
    };
  };

  const issuePart: ARBusPart | null = issueComponent
    ? modalArContext?.find((part) => part.id === issueComponent.id)
      || arContext?.parts.find((part) => part.id === issueComponent.id)
      || null
    : null;
  const logPart: ARBusPart | null = logComponent
    ? modalArContext?.find((part) => part.id === logComponent.id)
      || arContext?.parts.find((part) => part.id === logComponent.id)
      || null
    : null;
  const maintenanceTechnicians = (arContext?.assignableUsers || []).filter((user) => user.role === "engineer");
  const canUseOfflineTechActions = !isOnline && role === "engineer";
  const canLogMaintenance = hasPermission("create") || canUseOfflineTechActions;
  const canLogIssue = hasPermission("create") || role === "engineer";

  const openLogModal = async (component: BusComponent) => {
    setLogComponent(component);
    void loadArContextForModals();
  };

  const openIssueModal = async (component: BusComponent) => {
    setIssueComponent(component);
    void loadArContextForModals();
  };

  const handleDismissQueueItem = async (operationId: string) => {
    setQueueActionId(operationId);

    try {
      await resolveOperation(operationId, `Dismissed by ${role}`);
      toast.success("Queued item dismissed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to dismiss queued item");
    } finally {
      setQueueActionId(null);
    }
  };

  const handleApproveServerIssue = async (issueId: string) => {
    if (!hasPermission("create")) {
      return;
    }

    setServerApprovalActionId(issueId);

    try {
      await updateFaultStatus(
        issueId,
        { status: "resolved" },
        { busId: bus.id, busName: bus.name }
      );
      refreshBusQueries();
      toast.success("Fix approved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to approve fix");
    } finally {
      setServerApprovalActionId(null);
    }
  };

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

            <Button
              onClick={() => navigate(`/ar?busId=${bus.id}`, { state: { from: `/bus/${bus.id}`, arContext } })}
              disabled={!isOnline}
            >
              <Eye className="h-4 w-4 mr-2" />
              Open AR Mode
            </Button>
          </div>
        </div>

        {!isOnline ? (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-status-service/30 bg-status-service/10 px-4 py-3 text-sm text-status-service">
            <WifiOff className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              AR mode is unavailable offline. Use the issue and maintenance actions on each component card to keep working.
            </p>
          </div>
        ) : null}
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

      {(busQueueState.pending > 0 || busQueueState.review > 0) && (
        <section className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-status-service/10 text-status-service">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Offline workflow status</h2>
                <p className="text-sm text-muted-foreground">
                  {busQueueState.review > 0
                    ? "Some queued changes for this bus could not be uploaded and need sync attention."
                    : "This bus has queued offline changes waiting to upload."}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {busQueueState.pending > 0 && (
                <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  {busQueueState.pending} pending sync
                </span>
              )}
              {busQueueState.review > 0 && (
                <span className="rounded-full border border-status-urgent/30 bg-status-urgent/10 px-3 py-1 text-xs font-semibold text-status-urgent">
                  {busQueueState.review} need sync attention
                </span>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {busOperations.map((operation) => {
              const needsSyncAttention = operation.status === "needs_manager_review";

              return (
                <div
                  key={operation.id}
                  className="rounded-lg border bg-background/60 p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">{operation.summary}</span>
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                            needsSyncAttention
                              ? "border-status-urgent/30 bg-status-urgent/10 text-status-urgent"
                              : "border-primary/30 bg-primary/10 text-primary"
                          }`}
                        >
                          {needsSyncAttention ? "Needs sync attention" : "Pending upload"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Created {new Date(operation.createdAt).toLocaleString()}
                      </p>
                      {operation.lastError && (
                        <p className="text-sm text-status-urgent">{operation.lastError}</p>
                      )}
                    </div>

                    {needsSyncAttention ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void retryOperation(operation.id)}
                          disabled={syncInProgress || queueActionId === operation.id}
                        >
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Retry upload
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void handleDismissQueueItem(operation.id)}
                          disabled={syncInProgress || queueActionId === operation.id}
                        >
                          {queueActionId === operation.id ? "Dismissing..." : "Dismiss"}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {hasPermission("create") && pendingApprovalIssues.length > 0 ? (
        <section className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-status-urgent/10 text-status-urgent">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Manager approvals</h2>
              <p className="text-sm text-muted-foreground">
                Repairs and replacements submitted by technicians stay pending until a manager or admin approves them.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {pendingApprovalIssues.map((issue) => (
              <div key={issue.id} className="rounded-lg border bg-background/60 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{issue.title}</span>
                      <span className="rounded-full border border-status-urgent/30 bg-status-urgent/10 px-2.5 py-1 text-[11px] font-semibold text-status-urgent">
                        Awaiting approval
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {issue.partName} • Logged {new Date(issue.createdAt).toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">{issue.latestComment || issue.description}</p>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => void handleApproveServerIssue(issue.id)}
                    disabled={serverApprovalActionId === issue.id}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    {serverApprovalActionId === issue.id ? "Applying..." : "Approve fix"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

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
              onLogMaintenance={(component) => void openLogModal(component)}
              onLogIssue={(component) => void openIssueModal(component)}
              canLogMaintenance={canLogMaintenance}
              canLogIssue={canLogIssue}
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
        technicians={maintenanceTechnicians}
        activeIssues={logPart?.activeIssues || []}
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