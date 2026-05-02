import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { BusComponent } from "@/types/fleet";
import { Wrench, RefreshCw, Replace, TriangleAlert, MessageSquareText, ArrowRightLeft, ClipboardCheck, Activity } from "lucide-react";
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
  issue: TriangleAlert,
  comment: MessageSquareText,
  status_change: ArrowRightLeft,
  sign_off: ClipboardCheck,
  progress: Activity,
};

const typeColor: Record<string, string> = {
  repair: "text-status-urgent bg-status-urgent/10 border-status-urgent/30",
  service: "text-primary bg-primary/10 border-primary/30",
  replacement: "text-status-service bg-status-service/10 border-status-service/30",
  issue: "text-red-300 bg-red-500/10 border-red-400/30",
  comment: "text-sky-300 bg-sky-500/10 border-sky-400/30",
  status_change: "text-amber-300 bg-amber-500/10 border-amber-400/30",
  sign_off: "text-emerald-300 bg-emerald-500/10 border-emerald-400/30",
  progress: "text-violet-300 bg-violet-500/10 border-violet-400/30",
};

const typeLabel: Record<string, string> = {
  repair: "Repair",
  service: "Service",
  replacement: "Replacement",
  issue: "Issue logged",
  comment: "Comment",
  status_change: "Status update",
  sign_off: "Sign off",
  progress: "Progress",
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
                      <span className="text-sm font-medium text-foreground">{typeLabel[entry.type] || entry.type.replaceAll("_", " ")}</span>
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
