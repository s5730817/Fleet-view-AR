import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BusCard } from "@/components/BusCard";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getBusById, getFleet } from "@/lib/api";
import { Bus, Wrench, AlertTriangle, CheckCircle2, ChevronDown } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

const Index = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: fleet = [], isLoading, error } = useQuery({
    queryKey: ["fleet"],
    queryFn: getFleet,
  });

  useEffect(() => {
    if (!window.navigator.onLine || fleet.length === 0) {
      return;
    }

    void (async () => {
      for (const bus of fleet) {
        await queryClient.prefetchQuery({
          queryKey: ["bus", bus.id],
          queryFn: () => getBusById(bus.id),
        }).catch(() => null);
      }
    })();
  }, [fleet, queryClient]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-lg font-bold text-foreground">Loading fleet...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-lg font-bold text-status-urgent">Error loading fleet</p>
      </div>
    );
  }

  const good = fleet.filter(b => b.status === "Good").length;
  const requiresAttention = fleet.filter(b => b.status === "Requires Attention").length;
  const outOfOperation = fleet.filter(b => b.status === "Out Of Operation").length;
  const openReports = fleet.filter(b => b.issueIndicator.activeCount > 0).length;

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
    }, new Map<string, { depotId: string; depotName: string; buses: typeof fleet }>()).values(),
  ).sort((left, right) => left.depotName.localeCompare(right.depotName));

  const overviewSubtitle = depots.length > 1
    ? "Fleet overview across your visible depots."
    : depots.length === 1
    ? `Fleet overview for ${depots[0].depotName}.`
    : "No buses are available for your current scope.";

  const stats = [
    { label: "Total Fleet", value: fleet.length, icon: Bus, color: "text-primary bg-primary/10" },
    { label: "Good", value: good, icon: CheckCircle2, color: "text-status-operational bg-status-operational/10" },
    { label: "Requires Attention", value: requiresAttention, icon: AlertTriangle, color: "text-status-service bg-status-service/10" },
    { label: "Out Of Operation", value: outOfOperation, icon: Wrench, color: "text-status-urgent bg-status-urgent/10" },
    { label: "With Reports", value: openReports, icon: AlertTriangle, color: "text-primary bg-primary/10" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <main className="container max-w-6xl px-4 py-6 space-y-6">

        {/* HEADER */}
        <div className="flex items-center justify-between">

          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Overview
            </h1>
            <p className="text-sm text-muted-foreground">
              {overviewSubtitle}
            </p>
          </div>

          {/* DROPDOWN NAVIGATION */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm">
                Overview
                <ChevronDown className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                Overview
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/jobs")}>
                My Jobs
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
          {stats.map(stat => (
            <div key={stat.label} className="rounded-lg border bg-card p-4 flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground font-mono">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* DEPOTS */}
        <div className="space-y-6">
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
            Depots
          </h2>

          {depots.map(depot => (
            <section key={depot.depotId} className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
                <div>
                  <h3 className="text-lg font-bold text-foreground">
                    {depot.depotName}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {depot.buses.length} {depot.buses.length === 1 ? "bus" : "buses"}
                  </p>
                </div>
              </div>

              {depot.buses.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {depot.buses.map(bus => (
                    <BusCard key={bus.id} bus={bus} />
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed bg-card p-6 text-sm text-muted-foreground">
                  No buses assigned to this depot.
                </div>
              )}
            </section>
          ))}
        </div>

      </main>
    </div>
  );
};

export default Index;