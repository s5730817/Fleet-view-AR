import { useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getBusARContext } from "@/lib/api";
import { Button } from "@/components/ui/button";
// @ts-expect-error Migrated JS AR module from myAR package.
import ARInterface from "@/ar/ARInterface.jsx";

const ARMode = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const arContainerRef = useRef<HTMLDivElement | null>(null);
  const busId = useMemo(() => new URLSearchParams(location.search).get("busId"), [location.search]);
  const backPath = location.state?.from || "/dashboard";
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["bus-ar-context", busId],
    queryFn: () => getBusARContext(busId!),
    enabled: Boolean(busId),
  });

  if (!busId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="space-y-4 rounded-2xl border bg-card p-6 text-center shadow-sm">
          <p className="text-lg font-bold text-foreground">Missing bus selection</p>
          <p className="text-sm text-muted-foreground">Open AR mode from a bus detail page so tracking is scoped to that bus.</p>
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
        <div className="space-y-4 rounded-2xl border bg-card p-6 text-center shadow-sm">
          <p className="text-lg font-bold text-foreground">Unable to open AR mode</p>
          <p className="text-sm text-muted-foreground">
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
