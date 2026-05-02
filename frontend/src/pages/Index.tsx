import { useNavigate } from "react-router-dom";
import { BusCard } from "@/components/BusCard";
import { useQuery } from "@tanstack/react-query";
import { getFleet } from "@/lib/api";
import { Bus, Wrench, AlertTriangle, CheckCircle2, ChevronDown } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

const DEPOT_COUNT = 6;

const Index = () => {
  const navigate = useNavigate();

  const { data: fleet = [], isLoading, error } = useQuery({
    queryKey: ["fleet"],
    queryFn: getFleet,
  });

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

  const operational = fleet.filter(b => b.status === "Operational").length;
  const needsService = fleet.filter(b => b.status === "Needs Service").length;
  const underRepair = fleet.filter(b => b.status === "Under Repair").length;

  const depots = Array.from({ length: DEPOT_COUNT }, (_, index) => ({
    depotNumber: index + 1,
    buses: fleet.filter((_, busIndex) => busIndex % DEPOT_COUNT === index),
  }));

  const stats = [
    { label: "Total Fleet", value: fleet.length, icon: Bus, color: "text-primary bg-primary/10" },
    { label: "Operational", value: operational, icon: CheckCircle2, color: "text-status-operational bg-status-operational/10" },
    { label: "Needs Service", value: needsService, icon: AlertTriangle, color: "text-status-service bg-status-service/10" },
    { label: "Under Repair", value: underRepair, icon: Wrench, color: "text-status-repair bg-status-repair/10" },
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
              Fleet-wide overview across all depots.
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
            <section key={depot.depotNumber} className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
                <div>
                  <h3 className="text-lg font-bold text-foreground">
                    Depot {depot.depotNumber}
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