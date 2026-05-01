import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { BusComponent, MaintenanceEntry } from "@/types/fleet";
import { Wrench, RefreshCw, Replace } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface MaintenanceLogModalProps {
  open: boolean;
  onClose: () => void;
  component: BusComponent | null;
  busName: string;
  onLogSubmit: (componentId: string, entry: MaintenanceEntry) => void;
}

type MaintenanceType = "repair" | "service" | "replacement";

const typeConfig: Record<MaintenanceType, { label: string; icon: React.ElementType; color: string }> = {
  repair: { label: "Repair", icon: Wrench, color: "border-status-urgent text-status-urgent bg-status-urgent/10" },
  service: { label: "Service", icon: RefreshCw, color: "border-primary text-primary bg-primary/10" },
  replacement: { label: "Replacement", icon: Replace, color: "border-status-service text-status-service bg-status-service/10" },
};

export function MaintenanceLogModal({ open, onClose, component, busName, onLogSubmit }: MaintenanceLogModalProps) {
  const [type, setType] = useState<MaintenanceType>("service");
  const [description, setDescription] = useState("");
  const [technician, setTechnician] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = () => {
    if (!description || !technician) {
      toast.error("Please fill in required fields");
      return;
    }

    const newEntry: MaintenanceEntry = {
      id: `${component!.id}-${Date.now()}`,
      date: new Date().toISOString().split("T")[0],
      type,
      description,
      technician,
      notes: notes || undefined,
    };

    onLogSubmit(component!.id, newEntry);

    toast.success(`${typeConfig[type].label} logged for ${component?.name}`, {
      description: `Technician: ${technician}`,
    });
    setDescription("");
    setTechnician("");
    setNotes("");
    onClose();
  };

  if (!component) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">Log Maintenance — {component.name}</DialogTitle>
          <p className="text-xs text-muted-foreground">{busName}</p>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Type</Label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(typeConfig) as [MaintenanceType, typeof typeConfig[MaintenanceType]][]).map(([key, config]) => {
                const Icon = config.icon;
                return (
                  <button
                    key={key}
                    onClick={() => setType(key)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 text-xs font-medium transition-all",
                      type === key ? config.color : "border-border text-muted-foreground hover:border-primary/30"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {config.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label htmlFor="desc" className="text-xs">Description *</Label>
            <Input id="desc" value={description} onChange={e => setDescription(e.target.value)} placeholder="What was done..." className="mt-1" />
          </div>
          <div>
            <Label htmlFor="tech" className="text-xs">Technician *</Label>
            <Input id="tech" value={technician} onChange={e => setTechnician(e.target.value)} placeholder="Name" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="notes" className="text-xs">Notes (optional)</Label>
            <Textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional notes..." className="mt-1" rows={3} />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button onClick={handleSubmit} className="flex-1">Submit Log</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
