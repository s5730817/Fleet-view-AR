import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ShieldAlert } from "lucide-react";
import ARInterface from "@/ar/ARInterface.jsx";
import { buildTrackedDepotTools } from "@/ar/toolTrackingCatalog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePermission } from "@/context/PermissionContext";
import { getBusARContext, getFleet } from "@/lib/api";
import type { Bus } from "@/types/fleet";

type DepotGroup = {
  depotId: string;
  depotName: string;
  buses: Bus[];
};

export default function ToolTracker() {
  const navigate = useNavigate();
  const { role } = usePermission();
  const [selectedDepotId, setSelectedDepotId] = useState<string | null>(null);

  const isManager = role === "manager";

  const { data: fleet = [], isLoading, error } = useQuery<Bus[]>({
    queryKey: ["fleet"],
    queryFn: getFleet,
    enabled: isManager,
  });

  const depots = useMemo<DepotGroup[]>(() => Array.from(
    fleet
      .reduce((groups, bus) => {
        const depotId = bus.depotId || "unassigned";
        const existing = groups.get(depotId);

        if (existing) {
          existing.buses.push(bus);
          return groups;
        }

        groups.set(depotId, {
          depotId,
          depotName: bus.depotName || "Unassigned Depot",
          buses: [bus],
        });

        return groups;
      }, new Map<string, DepotGroup>())
      .values(),
  ).sort((left, right) => left.depotName.localeCompare(right.depotName)), [fleet]);

  useEffect(() => {
    if (depots.length === 0) {
      setSelectedDepotId(null);
      return;
    }

    if (!selectedDepotId || !depots.some((depot) => depot.depotId === selectedDepotId)) {
      setSelectedDepotId(depots[0].depotId);
    }
  }, [depots, selectedDepotId]);

  const selectedDepot = useMemo(
    () => depots.find((depot) => depot.depotId === selectedDepotId) || null,
    [depots, selectedDepotId],
  );

  const representativeBusId = selectedDepot?.buses[0]?.id || null;

  const {
    data: arContext,
    isLoading: isArContextLoading,
    error: arContextError,
    refetch,
  } = useQuery({
    queryKey: ["tool-tracker-ar-context", representativeBusId],
    queryFn: () => getBusARContext(representativeBusId!),
    enabled: isManager && Boolean(representativeBusId),
  });

  const trackedDepotTools = useMemo(
    () => buildTrackedDepotTools(arContext?.tools || [], selectedDepot?.depotName || arContext?.bus?.depotName),
    [arContext?.tools, arContext?.bus?.depotName, selectedDepot?.depotName],
  );

  if (!isManager) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-lg border border-white/15 bg-card/90 shadow-2xl backdrop-blur-xl">
          <CardHeader>
            <div className="flex items-center gap-3 text-orange-600">
              <ShieldAlert className="h-6 w-6" />
              <CardTitle className="text-xl">Tool Tracking is manager-only</CardTitle>
            </div>
            <CardDescription>
              This AR workflow is restricted to manager sessions because it tracks depot-wide tool availability.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/dashboard")}>Return to dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (arContext && trackedDepotTools.length > 0) {
    return (
      <div className="fixed inset-0 z-50 overflow-hidden bg-black">
        <ARInterface
          arContext={arContext}
          mode="tool-tracker"
          onExit={() => navigate("/dashboard")}
          onIssueCreated={() => refetch()}
        />
      </div>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-lg border border-white/15 bg-card/90 shadow-2xl backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-xl">Opening Tool Tracker</CardTitle>
          <CardDescription>
            {isLoading || isArContextLoading
              ? "Preparing the depot AR context..."
              : error instanceof Error
                ? error.message
                : arContextError instanceof Error
                  ? arContextError.message
                  : depots.length === 0
                    ? "No depot data is available for this manager session."
                    : trackedDepotTools.length === 0
                      ? "This depot does not have tracked tools assigned yet."
                      : "The AR view could not be opened."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Button variant="outline" onClick={() => navigate("/dashboard")}>Return to dashboard</Button>
          {depots.length > 1 && !isLoading && !isArContextLoading ? (
            <Button onClick={() => {
              const currentIndex = depots.findIndex((depot) => depot.depotId === selectedDepotId);
              const nextDepot = depots[(currentIndex + 1) % depots.length];
              setSelectedDepotId(nextDepot?.depotId || null);
            }}>
              Try next depot
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}