import { BusCard } from "@/components/BusCard";
import { useQuery } from "@tanstack/react-query";
import { getFleet } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Bus, Wrench, AlertTriangle, CheckCircle2 } from "lucide-react";
import { AccessibilityToggle } from "@/components/AccessibilityToggle";

const DEPOT_COUNT = 6;
const AR_ALLOWED_ROLES = ["inspector", "manager", "admin"];

const Index = () => {
  const navigate = useNavigate();

  const { data: fleet = [], isLoading, error } = useQuery({
    queryKey: ["fleet"],
    queryFn: getFleet,
  });

  const userRole = (() => {
    try {
      const stored = localStorage.getItem("user");
      if (!stored) return "user";
      return JSON.parse(stored)?.role || "user";
    } catch {
      return "user";
    }
  })();

  const canUseAR = AR_ALLOWED_ROLES.includes(userRole);

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

  const depots = Array.from({ length: DEPOT_COUNT }, (_, index) => {
    const depotNumber = index + 1;

    return {
      depotNumber,
      buses: fleet.filter((_, busIndex) => busIndex % DEPOT_COUNT === index),
    };
  });

  const stats = [
    { label: "Total Fleet", value: fleet.length, icon: Bus, color: "text-primary bg-primary/10" },
    { label: "Operational", value: operational, icon: CheckCircle2, color: "text-status-operational bg-status-operational/10" },
    { label: "Needs Service", value: needsService, icon: AlertTriangle, color: "text-status-service bg-status-service/10" },
    { label: "Under Repair", value: underRepair, icon: Wrench, color: "text-status-repair bg-status-repair/10" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container max-w-6xl flex items-center gap-3 py-4 px-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Bus className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground leading-none">FleetView</h1>
            <p className="text-xs text-muted-foreground">Fleet Maintenance Platform</p>
          </div>
          <div className="ml-auto">
            <div className="flex items-center gap-2">
              {canUseAR && (
                <Button size="sm" onClick={() => navigate("/ar")}>AR Mode</Button>
              )}
              <AccessibilityToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="container max-w-6xl px-4 py-6 space-y-6">
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