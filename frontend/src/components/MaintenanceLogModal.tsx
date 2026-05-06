import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ARAssignableUser, ARIssue, BusComponent, MaintenanceEntry } from "@/types/fleet";
import { Wrench, RefreshCw, Replace } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type MaintenanceEntryDraft = Omit<MaintenanceEntry, "id"> & {
  user_id: string;
  resolved_issue_ids?: string[];
};

interface MaintenanceLogModalProps {
  open: boolean;
  onClose: () => void;
  component: BusComponent | null;
  busName: string;
  technicians: ARAssignableUser[];
  activeIssues: ARIssue[];
  onLogSubmit: (componentId: string, entry: MaintenanceEntryDraft) => Promise<void>;
}

type MaintenanceType = "repair" | "service" | "replacement";

const typeConfig: Record<MaintenanceType, { label: string; icon: React.ElementType; color: string }> = {
  repair: { label: "Repair", icon: Wrench, color: "border-status-urgent text-status-urgent bg-status-urgent/10" },
  service: { label: "Service", icon: RefreshCw, color: "border-primary text-primary bg-primary/10" },
  replacement: { label: "Replacement", icon: Replace, color: "border-status-service text-status-service bg-status-service/10" },
};

export function MaintenanceLogModal({ open, onClose, component, busName, technicians, activeIssues, onLogSubmit }: MaintenanceLogModalProps) {
  const [type, setType] = useState<MaintenanceType>("service");
  const [description, setDescription] = useState("");
  const [technicianUserId, setTechnicianUserId] = useState("");
  const [selectedIssueId, setSelectedIssueId] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const requiresIssueSelection = type !== "service" && activeIssues.length > 0;
  const selectedIssue = activeIssues.find((issue) => issue.id === selectedIssueId) || null;

  useEffect(() => {
    if (!open) {
      return;
    }

    setType("service");
    setDescription("");
    setTechnicianUserId(technicians[0]?.id || "");
    setSelectedIssueId("");
    setNotes("");
  }, [open, technicians]);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (type === "service" || activeIssues.length === 0) {
      setSelectedIssueId("");
      return;
    }

    setSelectedIssueId((currentIssueId) => {
      if (activeIssues.some((issue) => issue.id === currentIssueId)) {
        return currentIssueId;
      }

      return activeIssues[0]?.id || "";
    });
  }, [activeIssues, open, type]);

  const handleSubmit = async () => {
    if (!description || !technicianUserId) {
      toast.error("Please fill in required fields");
      return;
    }

    if (requiresIssueSelection && !selectedIssueId) {
      toast.error("Choose which active issue this work resolves");
      return;
    }

    const selectedTechnician = technicians.find((technician) => technician.id === technicianUserId);

    if (!selectedTechnician) {
      toast.error("Choose a technician from the depot list");
      return;
    }

    const newEntry: MaintenanceEntryDraft = {
      date: new Date().toISOString().split("T")[0],
      type,
      description,
      technician: selectedTechnician.name,
      user_id: selectedTechnician.id,
      notes: notes || undefined,
      resolved_issue_ids: requiresIssueSelection ? [selectedIssueId] : undefined,
    };

    try {
      setSubmitting(true);
      await onLogSubmit(component!.id, newEntry);
      toast.success(`${typeConfig[type].label} logged for ${component?.name}`, {
        description: `Technician: ${selectedTechnician.name}`,
      });
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to log maintenance");
    } finally {
      setSubmitting(false);
    }
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

          {type !== "service" && (
            <div>
              <Label className="text-xs">Resolve Issue</Label>
              {activeIssues.length > 0 ? (
                <>
                  <Select value={selectedIssueId} onValueChange={setSelectedIssueId}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Choose active issue" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeIssues.map((issue) => (
                        <SelectItem key={issue.id} value={issue.id}>
                          {issue.title} - {issue.recommendedAction} - {issue.status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedIssue && (
                    <div className="mt-2 rounded-md border bg-background/60 p-3 text-xs text-muted-foreground space-y-1.5">
                      <p className="font-medium text-foreground">{selectedIssue.title}</p>
                      <p>{selectedIssue.description || selectedIssue.issueTypeLabel}</p>
                      <p>
                        Guide: <span className="font-medium text-foreground">{selectedIssue.guide.title}</span>
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">
                  No active issues are open on this component. This log will record the work without resolving a ticket.
                </p>
              )}
            </div>
          )}

          <div>
            <Label className="text-xs">Technician *</Label>
            <Select value={technicianUserId} onValueChange={setTechnicianUserId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Choose technician" />
              </SelectTrigger>
              <SelectContent>
                {technicians.map((technician) => (
                  <SelectItem key={technician.id} value={technician.id}>
                    {technician.name} - {technician.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {technicians.length === 0 && (
              <p className="mt-1 text-xs text-muted-foreground">No technicians are assigned to this depot.</p>
            )}
          </div>
          <div>
            <Label htmlFor="notes" className="text-xs">Notes (optional)</Label>
            <Textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional notes..." className="mt-1" rows={3} />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1" disabled={submitting}>Cancel</Button>
            <Button onClick={handleSubmit} className="flex-1" disabled={submitting || !technicianUserId}>
              {submitting ? "Saving..." : "Submit Log"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
