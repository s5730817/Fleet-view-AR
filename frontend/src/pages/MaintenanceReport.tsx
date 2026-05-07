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
import type { Bus } from "@/types/fleet";
import { ReportModal } from "@/components/reports/ReportModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const DEPOT_COUNT = 6;

type ReportTarget = {
  title: string;
  buses: Bus[];
};

const getStatusStyle = (status: Bus["status"]) => {
  switch (status) {
    case "Operational":
      return {
        icon: <CheckCircle2 className="h-4 w-4" />,
        label: "Completed",
        className: "bg-green-500/10 text-green-500 border-green-500/20",
      };

    case "Needs Service":
      return {
        icon: <Clock className="h-4 w-4" />,
        label: "In Progress",
        className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      };

    case "Under Repair":
      return {
        icon: <AlertTriangle className="h-4 w-4" />,
        label: "Fault Found",
        className: "bg-red-500/10 text-red-500 border-red-500/20",
      };
  }
};

const MaintenanceReports = () => {
  const [openDepots, setOpenDepots] = useState<number[]>([1]);
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);

  const { data: fleet = [], isLoading, error } = useQuery({
    queryKey: ["fleet"],
    queryFn: getFleet,
  });

  const toggleDepot = (depotNumber: number) => {
    setOpenDepots((prev) =>
      prev.includes(depotNumber)
        ? prev.filter((depot) => depot !== depotNumber)
        : [...prev, depotNumber]
    );
  };

  const handleViewBusReport = (bus: Bus) => {
    setReportTarget({
      title: `${bus.name} Maintenance Report`,
      buses: [bus],
    });
  };

  const handleViewDepotReport = (depotNumber: number, buses: Bus[]) => {
    setReportTarget({
      title: `Depot ${depotNumber} Maintenance Report`,
      buses,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-lg font-bold text-foreground">
          Loading reports...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-lg font-bold text-red-500">
          Error loading reports
        </p>
      </div>
    );
  }

  const completedCount = fleet.filter(
    (bus) => bus.status === "Operational"
  ).length;

  const inProgressCount = fleet.filter(
    (bus) => bus.status === "Needs Service"
  ).length;

  const faultCount = fleet.filter(
    (bus) => bus.status === "Under Repair"
  ).length;

  const depots = Array.from({ length: DEPOT_COUNT }, (_, index) => ({
    depotNumber: index + 1,
    buses: fleet.filter((_, busIndex) => busIndex % DEPOT_COUNT === index),
  }));

  return (
    <>
      <main className="container max-w-6xl px-4 py-6 space-y-6">
        <section className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileText className="h-6 w-6" />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Maintenance Reports
              </h1>

              <p className="text-sm text-muted-foreground">
                View and download maintenance reports by bus or depot
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">
                Completed
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
                In Progress
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
                Faults Found
              </CardTitle>
            </CardHeader>

            <CardContent>
              <p className="text-3xl font-bold text-red-500">
                {faultCount}
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="rounded-xl border bg-card">
          <div className="border-b px-5 py-4">
            <h2 className="text-lg font-bold text-foreground">
              Reports by Depot
            </h2>

            <p className="text-sm text-muted-foreground">
              Expand a depot to view buses and generate reports
            </p>
          </div>

          <div className="divide-y">
            {depots.map((depot) => {
              const isOpen = openDepots.includes(depot.depotNumber);

              const depotUrgentCount = depot.buses.reduce(
                (total, bus) =>
                  total +
                  bus.components.filter(
                    (component) => component.status === "Urgent"
                  ).length,
                0
              );

              return (
                <div key={depot.depotNumber}>
                  <button
                    type="button"
                    onClick={() => toggleDepot(depot.depotNumber)}
                    className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-muted/40"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Building2 className="h-5 w-5" />
                      </div>

                      <div>
                        <h3 className="font-semibold text-foreground">
                          Depot {depot.depotNumber}
                        </h3>

                        <p className="text-sm text-muted-foreground">
                          {depot.buses.length}{" "}
                          {depot.buses.length === 1 ? "bus" : "buses"}
                          {depotUrgentCount > 0 &&
                            ` · ${depotUrgentCount} urgent components`}
                        </p>
                      </div>
                    </div>

                    {isOpen ? (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="space-y-3 bg-background/40 px-5 pb-5">
                      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h4 className="font-semibold text-foreground">
                            Depot {depot.depotNumber} Report
                          </h4>

                          <p className="text-sm text-muted-foreground">
                            View a combined report covering all buses in this depot.
                          </p>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleViewDepotReport(depot.depotNumber, depot.buses)
                          }
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Depot Report
                        </Button>
                      </div>

                      {depot.buses.length > 0 ? (
                        depot.buses.map((bus) => {
                          const statusStyle = getStatusStyle(bus.status);

                          const urgentComponents = bus.components.filter(
                            (component) => component.status === "Urgent"
                          ).length;

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
                                  Last service:{" "}
                                  {new Date(
                                    bus.lastServiceDate
                                  ).toLocaleDateString()}{" "}
                                  · Next service:{" "}
                                  {new Date(
                                    bus.nextServiceDate
                                  ).toLocaleDateString()}{" "}
                                  · Mileage: {bus.mileage.toLocaleString()}
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
                        })
                      ) : (
                        <div className="rounded-lg border border-dashed bg-card p-6 text-sm text-muted-foreground">
                          No buses assigned to this depot.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>

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