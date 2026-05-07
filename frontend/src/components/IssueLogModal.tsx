import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ARAssignableUser, ARBusPart, BusComponent } from "@/types/fleet";
import { AlertTriangle } from "lucide-react";
import { usePermission } from "@/context/PermissionContext";
import { toast } from "sonner";

type IssueSubmitResult = {
  offlinePending?: boolean;
};

interface IssueLogModalProps {
  open: boolean;
  onClose: () => void;
  component: BusComponent | null;
  busName: string;
  issuePart: ARBusPart | null;
  assignableUsers: ARAssignableUser[];
  onIssueSubmit: (componentId: string, input: { issueTypeId: string; assignedUserId?: string; note?: string }) => Promise<IssueSubmitResult>;
}

export function IssueLogModal({
  open,
  onClose,
  component,
  busName,
  issuePart,
  assignableUsers,
  onIssueSubmit,
}: IssueLogModalProps) {
  const { role } = usePermission();
  const engineerAssignees = useMemo(
    () => assignableUsers.filter((user) => user.role === "engineer"),
    [assignableUsers]
  );
  const currentUser = useMemo(() => {
    try {
      const storedUser = JSON.parse(window.localStorage.getItem("user") || "{}");
      return {
        id: typeof storedUser?.id === "string" ? storedUser.id : "",
        name: typeof storedUser?.name === "string" ? storedUser.name : "You",
      };
    } catch {
      return {
        id: "",
        name: "You",
      };
    }
  }, []);
  const isEngineer = role === "engineer";
  const defaultIssueTypeId = issuePart?.issueTypeOptions[0]?.id || "";
  const [issueTypeId, setIssueTypeId] = useState(defaultIssueTypeId);
  const [assignedUserId, setAssignedUserId] = useState<string>("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setIssueTypeId(issuePart?.issueTypeOptions[0]?.id || "");
    setAssignedUserId(isEngineer ? currentUser.id : engineerAssignees[0]?.id || "");
    setNote("");
  }, [currentUser.id, engineerAssignees, isEngineer, issuePart, open]);

  const selectedIssueType = useMemo(
    () => issuePart?.issueTypeOptions.find((option) => option.id === issueTypeId) || null,
    [issuePart, issueTypeId]
  );

  const handleSubmit = async () => {
    if (!component || !issueTypeId) {
      toast.error("Choose an issue type before creating the issue");
      return;
    }

    if (!assignedUserId) {
      toast.error("Choose who the issue should be assigned to");
      return;
    }

    try {
      setSubmitting(true);
      const result = await onIssueSubmit(component.id, {
        issueTypeId,
        assignedUserId,
        note: note.trim() || undefined,
      });
      if (result.offlinePending) {
        toast.success("Issue queued until sync", {
          description: "System is offline. This ticket will sync once the device reconnects.",
        });
      } else {
        toast.success(`Issue logged for ${component.name}`);
      }
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to log issue");
    } finally {
      setSubmitting(false);
    }
  };

  if (!component) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">Log Issue - {component.name}</DialogTitle>
          <p className="text-xs text-muted-foreground">{busName}</p>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div>
            <Label className="text-xs">Issue Type</Label>
            <Select value={issueTypeId} onValueChange={setIssueTypeId} disabled={!issuePart || issuePart.issueTypeOptions.length === 0}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Choose issue type" />
              </SelectTrigger>
              <SelectContent>
                {(issuePart?.issueTypeOptions || []).map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label} - {option.recommendedAction} - {option.priority}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!issuePart || issuePart.issueTypeOptions.length === 0 ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Issue options are not available for this component yet. Open this bus online once to cache issue metadata for offline logging.
              </p>
            ) : null}
          </div>

          <div>
            <Label className="text-xs">Assign To</Label>
            {isEngineer ? (
              <div className="mt-1 rounded-md border bg-background/60 px-3 py-2 text-sm text-foreground">
                {currentUser.name}
              </div>
            ) : (
              <>
                <Select value={assignedUserId} onValueChange={setAssignedUserId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Choose assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    {engineerAssignees.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} - {user.role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {engineerAssignees.length === 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">No depot engineers are available for assignment.</p>
                )}
              </>
            )}
          </div>

          {selectedIssueType && (
            <div className="rounded-md border bg-background/60 p-3 text-xs text-muted-foreground space-y-1.5">
              <div className="flex items-start gap-2 text-foreground">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-status-service" />
                <div>
                  <p className="font-medium">{selectedIssueType.label}</p>
                  <p className="text-muted-foreground">{selectedIssueType.summary}</p>
                </div>
              </div>
              <p>
                Recommended action: <span className="font-medium text-foreground">{selectedIssueType.recommendedAction}</span>
              </p>
              <p>
                Guide: <span className="font-medium text-foreground">{selectedIssueType.guide.title}</span>
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="issue-note" className="text-xs">Initial Note (optional)</Label>
            <Textarea
              id="issue-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Add context for mechanics or supervisors..."
              className="mt-1"
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1" disabled={submitting}>Cancel</Button>
            <Button onClick={handleSubmit} className="flex-1" disabled={submitting || !issueTypeId || !assignedUserId}>
              {submitting ? "Saving..." : "Create Issue"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}