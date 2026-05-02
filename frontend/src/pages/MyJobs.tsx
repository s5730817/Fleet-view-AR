import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getFleet } from "@/lib/api";
import { ChevronDown } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

const urgencyRank: Record<string, number> = {
  Critical: 4,
  High: 3,
  Medium: 2,
  Low: 1,
};

export default function MyJobs() {
  const navigate = useNavigate();
  const [jobSort, setJobSort] = useState<"urgency" | "dueSoonest" | "newest">("urgency");

  const { data: fleet = [], isLoading, error } = useQuery({
    queryKey: ["fleet"],
    queryFn: getFleet,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-lg font-bold text-foreground">Loading jobs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-lg font-bold text-status-urgent">Error loading jobs</p>
      </div>
    );
  }

  const jobs = fleet
    .filter((bus) => bus.status !== "Operational")
    .map((bus, index) => ({
      ...bus,
      urgency:
        bus.status === "Under Repair"
          ? "Critical"
          : bus.status === "Needs Service"
          ? "High"
          : "Low",
      dueDate: new Date(Date.now() + (index + 1) * 86400000).toISOString(),
      createdAt: new Date(Date.now() - (index + 1) * 43200000).toISOString(),
    }))
    .sort((a, b) => {
      if (jobSort === "urgency") {
        return urgencyRank[b.urgency] - urgencyRank[a.urgency];
      }

      if (jobSort === "dueSoonest") {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  return (
    <main className="container max-w-6xl px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Jobs</h1>
          <p className="text-sm text-muted-foreground">
            Assigned maintenance tasks pulled from the current fleet data.
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm">
              My Jobs
              <ChevronDown className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate("/dashboard")}>
              Overview
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/jobs")}>
              My Jobs
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <section className="rounded-lg border bg-card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Assigned Jobs</h2>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm">
                Sort:{" "}
                {jobSort === "urgency"
                  ? "Urgency"
                  : jobSort === "dueSoonest"
                  ? "Soonest"
                  : "Newest"}
                <ChevronDown className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setJobSort("urgency")}>
                Urgency
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setJobSort("dueSoonest")}>
                Date: Soonest
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setJobSort("newest")}>
                Newly Created
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-3">
          {jobs.length > 0 ? (
            jobs.map((bus) => {
              const isOverdue = new Date(bus.dueDate) < new Date();

              return (
                <div
                  key={bus.id}
                  className={`flex items-center justify-between rounded-lg border px-4 py-3 ${
                    isOverdue
                      ? "bg-status-urgent/5 border-status-urgent/40"
                      : "bg-background"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground">{bus.name}</p>

                      <span
                        className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
                          bus.urgency === "Critical"
                            ? "bg-status-urgent/20 text-status-urgent"
                            : bus.urgency === "High"
                            ? "bg-status-service/10 text-status-service"
                            : "bg-primary/10 text-primary"
                        }`}
                      >
                        {bus.urgency === "Critical" && "⚠️"}
                        {bus.urgency === "High" && "🛠️"}
                        {bus.urgency === "Low" && "🔹"}
                        {bus.urgency}
                      </span>

                      {isOverdue && (
                        <span className="text-xs font-medium text-status-urgent">
                          Overdue
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground">
                      {bus.status} · Due {new Date(bus.dueDate).toLocaleDateString()} · Created{" "}
                      {new Date(bus.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <button className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground">
                    View
                  </button>
                </div>
              );
            })
          ) : (
            <div className="rounded-lg border border-dashed bg-background p-6 text-sm text-muted-foreground">
              No assigned jobs.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}