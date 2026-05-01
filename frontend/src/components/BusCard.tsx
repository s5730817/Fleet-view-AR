import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { BusStatusBadge } from "@/components/StatusBadge";
import { Bus as BusIcon, Gauge, Calendar, Wrench, ChevronRight } from "lucide-react";
import type { Bus } from "@/types/fleet";
import { getDaysAgo, getDaysUntil } from "@/lib/dateUtils";

export function BusCard({ bus }: { bus: Bus }) {
  const navigate = useNavigate();
  const daysUntilService = getDaysUntil(bus.nextServiceDate);
  const urgentComponents = bus.components.filter(c => c.status === "Urgent").length;
  const dueSoonComponents = bus.components.filter(c => c.status === "Due Soon").length;

  return (
    <Card
      className="group cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5"
      onClick={() => navigate(`/bus/${bus.id}`)}
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

        <div className="mb-4">
          <BusStatusBadge status={bus.status} />
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
          <div className="col-span-2 flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <span className={`text-xs font-medium ${daysUntilService <= 7 ? "text-status-urgent" : daysUntilService <= 30 ? "text-status-service" : "text-muted-foreground"}`}>
              Next service: {daysUntilService <= 0 ? "Overdue!" : `in ${daysUntilService} days`}
            </span>
          </div>
        </div>

        {(urgentComponents > 0 || dueSoonComponents > 0) && (
          <div className="mt-3 pt-3 border-t flex items-center gap-2">
            <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
            <div className="flex gap-2 text-xs">
              {urgentComponents > 0 && (
                <span className="text-status-urgent font-medium">{urgentComponents} urgent</span>
              )}
              {dueSoonComponents > 0 && (
                <span className="text-status-service font-medium">{dueSoonComponents} due soon</span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
