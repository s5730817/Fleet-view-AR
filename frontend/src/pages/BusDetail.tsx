import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getBusById, addMaintenanceEntry } from "@/lib/api";
import { getDaysAgo, getDaysUntil } from "@/lib/dateUtils";
import type { BusComponent, MaintenanceEntry } from "@/types/fleet";
import { BusStatusBadge } from "@/components/StatusBadge";
import { ComponentCard } from "@/components/ComponentCard";
import { ARView } from "@/components/ARView";
import { HistoryModal } from "@/components/HistoryModal";
import { MaintenanceLogModal } from "@/components/MaintenanceLogModal";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Bus as BusIcon,
  Gauge,
  Calendar,
  MapPin,
  Eye,
} from "lucide-react";

const BusDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const backPath = location.state?.from || "/dashboard";
  const { data: busData, isLoading, error } = useQuery({
    queryKey: ["bus", id],
    queryFn: () => getBusById(id!),
    enabled: !!id,
  });

  const [arOpen, setArOpen] = useState(false);
  const [historyComponent, setHistoryComponent] =
    useState<BusComponent | null>(null);
  const [logComponent, setLogComponent] = useState<BusComponent | null>(null);
  const [components, setComponents] = useState<BusComponent[]>([]);

  useEffect(() => {
    if (busData) {
      setComponents(busData.components);
    }
  }, [busData]);

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

  const bus = { ...busData, components };
  const daysUntilService = getDaysUntil(bus.nextServiceDate);

  const handleLogSubmit = async (
    componentId: string,
    entry: MaintenanceEntry
  ) => {
    try {
      const savedEntry = await addMaintenanceEntry(bus.id, componentId, entry);

      setComponents((prev) =>
        prev.map((comp) =>
          comp.id === componentId
            ? { ...comp, history: [savedEntry, ...comp.history] }
            : comp
        )
      );

      setHistoryComponent((prev) =>
        prev?.id === componentId
          ? { ...prev, history: [savedEntry, ...prev.history] }
          : prev
      );
    } catch (err) {
      console.error("Failed to save maintenance entry:", err);
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

          <div className="flex items-center gap-3">
            <BusStatusBadge status={bus.status} />

            <Button onClick={() => navigate(`/ar?busId=${bus.id}`)}>
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
            <span className="text-xs">Next Service</span>
          </div>
          <p
            className={`text-lg font-bold font-mono ${
              daysUntilService <= 7 ? "text-red-500" : "text-foreground"
            }`}
          >
            {daysUntilService <= 0 ? "Overdue" : `${daysUntilService}d`}
          </p>
        </div>

        <div className="rounded-lg border bg-card p-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <MapPin className="h-3.5 w-3.5" />
            <span className="text-xs">Model</span>
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
          {components.map((comp) => (
            <ComponentCard
              key={comp.id}
              component={comp}
              onOpenHistory={setHistoryComponent}
              onLogMaintenance={setLogComponent}
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
    </main>
  );
};

export default BusDetail;