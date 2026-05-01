import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { BusComponent } from "@/types/fleet";
import { Wrench, RefreshCw, Replace } from "lucide-react";
import { cn } from "@/lib/utils";

interface HistoryModalProps {
  open: boolean;
  onClose: () => void;
  component: BusComponent | null;
}

const typeIcon: Record<string, React.ElementType> = {
  repair: Wrench,
  service: RefreshCw,
  replacement: Replace,
};

const typeColor: Record<string, string> = {
  repair: "text-status-urgent bg-status-urgent/10 border-status-urgent/30",
  service: "text-primary bg-primary/10 border-primary/30",
  replacement: "text-status-service bg-status-service/10 border-status-service/30",
};

export function HistoryModal({ open, onClose, component }: HistoryModalProps) {
  if (!component) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Maintenance History — {component.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2 max-h-80 overflow-y-auto">
          {component.history.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No maintenance history</p>
          ) : (
            component.history.map((entry) => {
              const Icon = typeIcon[entry.type] || Wrench;
              return (
                <div key={entry.id} className="flex gap-3 items-start">
                  <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-md border", typeColor[entry.type])}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium capitalize text-foreground">{entry.type}</span>
                      <span className="text-xs text-muted-foreground font-mono">{entry.date}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{entry.description}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">By {entry.technician}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
