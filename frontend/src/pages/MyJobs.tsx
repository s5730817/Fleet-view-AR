import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getCachedFleetSnapshot, getCachedJobsSnapshot, getJobs } from "@/lib/api";
import type { Bus } from "@/types/fleet";
import { getDaysUntil, isPastDate } from "@/lib/dateUtils";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";

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

const getUrgencyBadgeClass = (urgency: string) => {
  switch (urgency) {
    case "Critical":
    case "High":
      return "bg-red-500/10 text-red-500 border border-red-500/20";
    case "Medium":
      return "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20";
    case "Low":
      return "bg-green-500/10 text-green-500 border border-green-500/20";
    default:
      return "bg-primary/10 text-primary border border-primary/20";
  }
};

export default function MyJobs() {
  const navigate = useNavigate();
  const [cachedJobs, setCachedJobs] = useState<Array<{
    id: string;
    busId: string;
    busName: string;
    componentId: string;
    componentName: string;
    title: string;
    status: string;
    urgency: string;
    assignedTo: string;
    assignedToName: string | null;
    dueDate: string;
    createdAt: string;
  }>>([]);
  const [cachedFleet, setCachedFleet] = useState<Bus[]>([]);

  const [jobView, setJobView] = useState<
    "all" | "urgency" | "dueSoonest" | "newest"
  >("all");

  const { data: jobs = [], isLoading, error } = useQuery({
    queryKey: ["jobs"],
    queryFn: getJobs,
  });

  useEffect(() => {
    void getCachedJobsSnapshot().then((snapshot) => {
      setCachedJobs(snapshot);
    });

    void getCachedFleetSnapshot().then((snapshot) => {
      setCachedFleet(snapshot);
    });
  }, []);

  const visibleJobs = jobs.length > 0 ? jobs : cachedJobs;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-lg font-bold text-foreground">Loading jobs...</p>
      </div>
    );
  }

  if (error && visibleJobs.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-lg font-bold text-red-500">Error loading jobs</p>
      </div>
    );
  }

  const sortedJobs = [...visibleJobs].sort((a, b) => {
    if (jobView === "urgency") {
      return urgencyRank[b.urgency] - urgencyRank[a.urgency];
    }

    if (jobView === "dueSoonest") {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }

    if (jobView === "newest") {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }

    return 0; // "all" keeps backend order
  });

  return (
    <main className="container max-w-6xl px-4 py-6 space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Jobs</h1>
          <p className="text-sm text-muted-foreground">
            View and manage your assigned maintenance tasks.
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

      {/* JOBS */}
      <section className="rounded-lg border bg-card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Assigned Jobs</h2>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm">
                View:{" "}
                {jobView === "all"
                  ? "All Jobs"
                  : jobView === "urgency"
                  ? "Urgency"
                  : jobView === "dueSoonest"
                  ? "Due Soon"
                  : "Newest"}
                <ChevronDown className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setJobView("all")}>
                All Jobs
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setJobView("urgency")}>
                Urgency
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setJobView("dueSoonest")}>
                Due Soon
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setJobView("newest")}>
                Newest
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-3">
          {sortedJobs.length > 0 ? (
            sortedJobs.map((job) => {
              const isOverdue = isPastDate(job.dueDate);
              const daysUntilDue = getDaysUntil(job.dueDate);

              return (
                <div
                  key={job.id}
                  className={`flex items-center justify-between rounded-lg border px-4 py-3 ${
                    isOverdue
                      ? "bg-red-500/5 border-red-500/40"
                      : "bg-background"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-foreground">
                        {job.busName} — {job.title}
                      </p>

                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${getUrgencyBadgeClass(
                          job.urgency
                        )}`}
                      >
                        {job.urgency}
                      </span>

                      {isOverdue && (
                        <span className="text-xs font-medium text-red-500">
                          Overdue
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground">
                      Assigned to:{" "}
                      <span className="font-medium text-foreground">
                        {job.assignedToName || "Unassigned"}
                      </span>
                    </p>

                    <p className="text-sm text-muted-foreground">
                      Status: {" "}
                      <span className="font-medium text-foreground">{job.status}</span>
                    </p>

                    <p className="text-sm text-muted-foreground">
                      Due:{" "}
                      <span className="font-medium text-foreground">
                        {daysUntilDue < 0
                          ? `${new Date(job.dueDate).toLocaleDateString()} (${Math.abs(daysUntilDue)}d overdue)`
                          : daysUntilDue === 0
                          ? `${new Date(job.dueDate).toLocaleDateString()} (due today)`
                          : `${new Date(job.dueDate).toLocaleDateString()} (in ${daysUntilDue}d)`}
                      </span>
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      const cachedBus = cachedFleet.find((bus) => bus.id === job.busId) || null;

                      if (!cachedBus && !window.navigator.onLine) {
                        toast.error("Bus details are not available offline for this job yet");
                        return;
                      }

                      navigate(`/bus/${job.busId}`, {
                        state: { from: "/jobs", bus: cachedBus || undefined },
                      });
                    }}
                    className="shrink-0 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"
                  >
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