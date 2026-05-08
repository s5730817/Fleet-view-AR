import { useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getBusARContext } from "@/lib/api";
import { Button } from "@/components/ui/button";
import type { BusARContext } from "@/types/fleet";
import ARInterface from "@/ar/ARInterface.jsx";
import { useSyncStatus } from "@/context/SyncStatusContext";

const ARMode = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const location = useLocation();
  const arContainerRef = useRef<HTMLDivElement | null>(null);
  const busId = useMemo(() => new URLSearchParams(location.search).get("busId"), [location.search]);
  const backPath = location.state?.from || "/dashboard";
  const { isOnline } = useSyncStatus();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["bus-ar-context", busId],
    queryFn: () => getBusARContext(busId!),
    enabled: Boolean(busId) && isOnline,
    initialData: () => {
      if (!busId) {
        return undefined;
      }

      return (location.state?.arContext as BusARContext | undefined)
        || queryClient.getQueryData<BusARContext>(["bus-ar-context", busId])
        || undefined;
    },
  });

  if (!isOnline) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="space-y-4 rounded-2xl border border-white/15 bg-black/80 p-6 text-center text-white shadow-xl backdrop-blur">
          <p className="text-lg font-bold text-white">AR mode is unavailable offline</p>
          <p className="text-sm text-white/70">
            Use the component cards on the bus detail page to log an issue or record a fix while the device is offline.
          </p>
          <Button onClick={() => navigate(backPath)}>Return to bus detail</Button>
        </div>
      </div>
    );
  }

  if (!busId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="space-y-4 rounded-2xl border border-white/15 bg-black/80 p-6 text-center text-white shadow-xl backdrop-blur">
          <p className="text-lg font-bold text-white">Missing bus selection</p>
          <p className="text-sm text-white/70">Open AR mode from a bus detail page so tracking is scoped to that bus.</p>
          <Button onClick={() => navigate(backPath)}>Return</Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/80">Loading AR context...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="space-y-4 rounded-2xl border border-white/15 bg-black/80 p-6 text-center text-white shadow-xl backdrop-blur">
          <p className="text-lg font-bold text-white">Unable to open AR mode</p>
          <p className="text-sm text-white/70">
            {error instanceof Error ? error.message : "The AR context for this bus could not be loaded."}
          </p>
          <Button onClick={() => navigate(backPath)}>Return</Button>
        </div>
      </div>
    );
  }

  return (
    <div ref={arContainerRef} className="fixed inset-0 z-50 overflow-hidden bg-black">
      <div className="absolute inset-0">
        <ARInterface
          arContext={data}
          onExit={() => navigate(backPath)}
          onIssueCreated={() => refetch()}
        />
      </div>
    </div>
  );
};

export default ARMode;
