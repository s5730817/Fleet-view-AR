import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, X, Smartphone } from "lucide-react";
import type { Bus } from "@/types/fleet";
import { usePermission } from "@/context/PermissionContext";

interface ARViewProps {
  open: boolean;
  onClose: () => void;
  bus: Bus | null;
}

export function ARView({ open, onClose, bus }: ARViewProps) {
  const { hasPermission } = usePermission();

  if (!bus) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
        <div className="relative bg-foreground/95 aspect-[4/3] flex items-center justify-center">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-4 border-2 border-dashed border-primary/50 rounded-lg" />
            <div className="absolute top-6 left-6 w-16 h-16 border-l-2 border-t-2 border-primary/70" />
            <div className="absolute top-6 right-6 w-16 h-16 border-r-2 border-t-2 border-primary/70" />
            <div className="absolute bottom-6 left-6 w-16 h-16 border-l-2 border-b-2 border-primary/70" />
            <div className="absolute bottom-6 right-6 w-16 h-16 border-r-2 border-b-2 border-primary/70" />
          </div>

          <div className="text-center z-10 space-y-3">
            <div className="flex items-center justify-center">
              <div className="h-16 w-16 rounded-full border-2 border-primary/50 flex items-center justify-center animate-pulse-slow">
                <Camera className="h-8 w-8 text-primary" />
              </div>
            </div>
            <div>
              <p className="text-primary font-bold text-lg">{bus.name}</p>
              <p className="text-primary/70 text-sm font-mono">{bus.plateNumber}</p>
              <p className="text-primary/60 text-xs mt-1">AR Bus Overlay</p>
            </div>
            <div className="flex items-center justify-center gap-1.5 text-primary/50 text-xs">
              <Smartphone className="h-3 w-3" />
              <span>Point camera at bus to detect</span>
            </div>
          </div>

          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-primary/20 backdrop-blur-sm px-2 py-1 rounded text-xs text-primary font-medium">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse-slow" />
            AR Active
          </div>

          <div className="absolute bottom-4 left-4 right-4 z-20 flex gap-3">
            {hasPermission("inspect") && (
              <Button className="flex-1" variant="secondary">
                Inspect
              </Button>
            )}
            {hasPermission("create") && (
              <Button className="flex-1">
                Create
              </Button>
            )}
          </div>

          <button onClick={onClose} className="absolute top-3 right-3 text-primary/60 hover:text-primary">
            <X className="h-5 w-5" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
