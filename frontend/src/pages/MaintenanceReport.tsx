import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Eye,
  ChevronDown,
  ChevronRight,
  Building2,
  Bus as BusIcon,
} from "lucide-react";

import { getFleet } from "@/lib/api";
import type { Bus, BusComponent } from "@/types/fleet";
import { ReportModal } from "@/components/reports/ReportModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type ReportTarget = {
  title: string;
  buses: Bus[];
};

// Helper function to detect urgent components
const isUrgentComponent = (component: BusComponent) =>
  component.status === "Needs Fix or Replacement" ||
  component.status === "Needs Replacement!" ||
  component.status === "Under Repair";

// Status styling for fleet overview cards
const getStatusStyle = (status: Bus["status"]) => {
  switch (status) {
    case "Good":
      return {
        icon: <CheckCircle2 className="h-4 w-4" />,
        label: "Completed",
        className: "bg-green-500/10 text-green-500 border-green-500/20",
      };

    case "Requires Attention":
      return {
        icon: <Clock className="h-4 w-4" />,
        label: "Requires Attention",
        className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      };

    case "Out Of Operation":
      return {
        icon: <AlertTriangle className="h-4 w-4" />,
        label: "Out Of Operation",
        className: "bg-red-500/10 text-red-500 border-red-500/20",
      };
  }
};

const MaintenanceReports = () => {
  const [openDepots, setOpenDepots] = useState<string[]>([]);
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);

  const { data: fleet = [], isLoading, error } = useQuery({
    queryKey: ["fleet"],
    queryFn: getFleet,
  });

  // Toggle depot dropdown
  const toggleDepot = (depotId: string) => {
    setOpenDepots((prev) =>
      prev.includes(depotId)
        ? prev.filter((id) => id !== depotId)
        : [...prev, depotId]
    );
  };

  // Open a single bus report
  const handleViewBusReport = (bus: Bus) => {
    setReportTarget({
      title: `${bus.name} Maintenance Report`,
      buses: [bus],
    });
  };

  // Open a full depot report
  const handleViewDepotReport = (
    depotName: string,
    buses: Bus[]
  ) => {
    setReportTarget({
      title: `${depotName} Maintenance Report`,
      buses,
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-lg font-bold text-foreground">
          Loading reports...
        </p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-lg font-bold text-red-500">
          Error loading reports
        </p>
      </div>
    );
  }

  // Summary statistics
  const completedCount = fleet.filter(
    (bus) => bus.status === "Good"
  ).length;

  const inProgressCount = fleet.filter(
    (bus) => bus.status === "Requires Attention"
  ).length;

  const faultCount = fleet.filter(
    (bus) => bus.status === "Out Of Operation"
  ).length;

  // Group buses by depot
  const depots = Array.from(
    fleet.reduce((groups, bus) => {
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
    }, new Map<
      string,
      {
        depotId: string;
        depotName: string;
        buses: Bus[];
      }
    >()).values()
  ).sort((left, right) =>
    left.depotName.localeCompare(right.depotName)
  );

  return (
    <>
      <main className="container max-w-6xl px-4 py-6 space-y-6">

        {/* PAGE HEADER */}
<section className="rounded-2xl border bg-card p-5 shadow-sm">
  <div className="flex items-start gap-4">

    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
      <FileText className="h-6 w-6" />
    </div>

    <div className="space-y-2">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Fleet Maintenance Status
        </h1>

        <p className="text-sm text-muted-foreground">
          Live overview of operational health across all visible buses and depots.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">

        <div className="rounded-md border border-green-500/20 bg-green-500/10 px-2 py-1 text-green-400">
          Good = fully operational with no critical issues
        </div>

        <div className="rounded-md border border-yellow-500/20 bg-yellow-500/10 px-2 py-1 text-yellow-400">
          Requires Attention = maintenance or inspections due soon
        </div>

        <div className="rounded-md border border-red-500/20 bg-red-500/10 px-2 py-1 text-red-400">
          Out Of Operation = critical faults or active repairs
        </div>

      </div>
    </div>

  </div>
</section>

        {/* SUMMARY CARDS */}
        <section className="grid gap-4 md:grid-cols-3">

          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">
                Good
              </CardTitle>
            </CardHeader>

            <CardContent>
              <p className="text-3xl font-bold text-green-500">
                {completedCount}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">
                Requires Attention
              </CardTitle>
            </CardHeader>

            <CardContent>
              <p className="text-3xl font-bold text-yellow-500">
                {inProgressCount}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">
                Out Of Operation
              </CardTitle>
            </CardHeader>

            <CardContent>
              <p className="text-3xl font-bold text-red-500">
                {faultCount}
              </p>
            </CardContent>
          </Card>

        </section>

        {/* DEPOT REPORTS */}
        <section className="rounded-xl border bg-card">

          <div className="border-b px-5 py-4">
            <h2 className="text-lg font-bold text-foreground">
              Reports by Depot
            </h2>

            <p className="text-sm text-muted-foreground">
              Expand a depot to view buses and reports
            </p>
          </div>

          <div className="divide-y">

            {depots.map((depot) => {
              const isOpen = openDepots.includes(depot.depotId);

              const urgentCount = depot.buses.reduce(
                (total, bus) =>
                  total +
                  bus.components.filter(isUrgentComponent).length,
                0
              );

              return (
                <div key={depot.depotId}>

                  {/* DEPOT HEADER */}
                  <button
                    type="button"
                    onClick={() => toggleDepot(depot.depotId)}
                    className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-muted/40"
                  >

                    <div className="flex items-center gap-3">

                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Building2 className="h-5 w-5" />
                      </div>

                      <div>
                        <h3 className="font-semibold text-foreground">
                          {depot.depotName}
                        </h3>

                        <p className="text-sm text-muted-foreground">
                          {depot.buses.length}{" "}
                          {depot.buses.length === 1 ? "bus" : "buses"}

                          {urgentCount > 0 &&
                            ` · ${urgentCount} urgent components`}
                        </p>
                      </div>

                    </div>

                    {isOpen ? (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    )}

                  </button>

                  {/* DEPOT CONTENT */}
                  {isOpen && (
                    <div className="space-y-3 bg-background/40 px-5 pb-5">

                      {/* DEPOT REPORT BUTTON */}
                      <div className="flex items-center justify-between rounded-lg border bg-card p-4">

                        <div>
                          <h4 className="font-semibold text-foreground">
                            {depot.depotName} Report
                          </h4>

                          <p className="text-sm text-muted-foreground">
                            Combined maintenance history for all depot buses.
                          </p>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleViewDepotReport(
                              depot.depotName,
                              depot.buses
                            )
                          }
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Depot Report
                        </Button>

                      </div>

                      {/* BUS LIST */}
                      {depot.buses.map((bus) => {
                        const statusStyle = getStatusStyle(bus.status);

                        const urgentComponents =
                          bus.components.filter(isUrgentComponent).length;

                        return (
                          <div
                            key={bus.id}
                            className="flex flex-col gap-4 rounded-lg border bg-card px-4 py-3 md:flex-row md:items-center md:justify-between"
                          >

                            <div>

                              <div className="flex flex-wrap items-center gap-2">

                                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                                  <BusIcon className="h-4 w-4" />
                                </div>

                                <h4 className="font-semibold text-foreground">
                                  {bus.name}
                                </h4>

                                <span
                                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium ${statusStyle.className}`}
                                >
                                  {statusStyle.icon}
                                  {statusStyle.label}
                                </span>

                                {urgentComponents > 0 && (
                                  <span className="rounded-full border border-red-500/20 bg-red-500/10 px-2 py-1 text-xs font-medium text-red-500">
                                    {urgentComponents} urgent
                                  </span>
                                )}

                              </div>

                              <p className="mt-1 text-sm text-muted-foreground">
                                {bus.plateNumber} · {bus.year} {bus.model}
                              </p>

                              <p className="text-xs text-muted-foreground">
                                Mileage: {bus.mileage.toLocaleString()}
                              </p>

                            </div>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewBusReport(bus)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Report
                            </Button>

                          </div>
                        );
                      })}

                    </div>
                  )}

                </div>
              );
            })}

          </div>

        </section>

      </main>

      {/* REPORT MODAL */}
      {reportTarget && (
        <ReportModal
          title={reportTarget.title}
          buses={reportTarget.buses}
          onClose={() => setReportTarget(null)}
        />
      )}
    </>
  );
};

export default MaintenanceReports;