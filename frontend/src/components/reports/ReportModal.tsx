import { Download, X } from "lucide-react";
import type { Bus } from "@/types/fleet";
import { Button } from "@/components/ui/button";
import { downloadMaintenanceReportPdf } from "@/lib/reportPdf";

interface ReportModalProps {
  title: string;
  buses: Bus[];
  onClose: () => void;
}

export function ReportModal({ title, buses, onClose }: ReportModalProps) {
  const handleDownload = () => {
    downloadMaintenanceReportPdf({
      title,
      buses,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="max-h-[85vh] w-full max-w-5xl overflow-y-auto rounded-xl border bg-card p-6 shadow-xl">
        <div className="mb-5 flex items-start justify-between gap-4 border-b pb-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">{title}</h2>
            <p className="text-sm text-muted-foreground">
              {buses.length} {buses.length === 1 ? "bus" : "buses"} included
            </p>
          </div>

          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-6">
          {buses.map((bus) => (
            <section key={bus.id} className="rounded-xl border bg-background p-4">
              <div className="mb-4">
                <h3 className="text-lg font-bold text-foreground">
                  {bus.name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {bus.plateNumber} · {bus.year} {bus.model}
                </p>
              </div>

              <div className="mb-5 grid gap-3 md:grid-cols-4">
                <div className="rounded-lg border bg-card p-3">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="font-semibold text-foreground">{bus.status}</p>
                </div>

                <div className="rounded-lg border bg-card p-3">
                  <p className="text-xs text-muted-foreground">Mileage</p>
                  <p className="font-semibold text-foreground">
                    {bus.mileage.toLocaleString()}
                  </p>
                </div>

                <div className="rounded-lg border bg-card p-3">
                  <p className="text-xs text-muted-foreground">Last Service</p>
                  <p className="font-semibold text-foreground">
                    {new Date(bus.lastServiceDate).toLocaleDateString()}
                  </p>
                </div>

                <div className="rounded-lg border bg-card p-3">
                  <p className="text-xs text-muted-foreground">Next Service</p>
                  <p className="font-semibold text-foreground">
                    {new Date(bus.nextServiceDate).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {bus.components.map((component) => (
                  <div key={component.id} className="rounded-lg border bg-card p-4">
                    <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h4 className="font-bold text-foreground">
                          {component.name}
                        </h4>

                        <p className="text-sm text-muted-foreground">
                          Status: {component.status} · Health:{" "}
                          {component.healthPercent}%
                        </p>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        Last service:{" "}
                        {new Date(component.lastService).toLocaleDateString()}
                      </p>
                    </div>

                    {component.history.length > 0 ? (
                      <div className="space-y-2">
                        {component.history.map((entry) => (
                          <div
                            key={entry.id}
                            className="rounded-md border bg-background p-3 text-sm"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="font-medium text-foreground">
                                {entry.description}
                              </p>

                              <span className="rounded-full border px-2 py-0.5 text-xs capitalize text-muted-foreground">
                                {entry.type}
                              </span>
                            </div>

                            <p className="mt-1 text-xs text-muted-foreground">
                              {new Date(entry.date).toLocaleDateString()} ·{" "}
                              {entry.technician}
                            </p>

                            {entry.notes && (
                              <p className="mt-2 text-xs text-muted-foreground">
                                Notes: {entry.notes}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No maintenance history available.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-6 flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>

          <Button onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </div>
    </div>
  );
}