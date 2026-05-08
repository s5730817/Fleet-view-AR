import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";

import { getSummary, type SummaryPeriod } from "@/lib/api";

import { StatCard } from "@/components/StatCard";
import { DashboardCard } from "@/components/DashboardCard";
import { CreatedCompletedChart } from "@/components/CompletedChart";
import { FleetConditionChart } from "@/components/FleetConditionChart";
import { OnTimeOverdueChart } from "@/components/OnTimeChart";
import { JobsByStatusChart } from "@/components/JobsStatusChart";

import {
  ClipboardList,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  MapPinned,
  ChevronDown,
} from "lucide-react";

const periodOptions: {
  label: string;
  value: SummaryPeriod;
}[] = [
  { label: "This Week", value: "week" },
  { label: "This Month", value: "month" },
  { label: "Last 3 Months", value: "3months" },
  { label: "Last 6 Months", value: "6months" },
  { label: "This Year", value: "year" },
];

const Summary = () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const canViewSummary =
    user?.role === "admin" || user?.role === "manager";

  const [period, setPeriod] = useState<SummaryPeriod>("week");

  const { data, isLoading, error } = useQuery({
    queryKey: ["summary", period],
    queryFn: () => getSummary(period),
    enabled: canViewSummary,
  });

  if (!canViewSummary) {
    return <Navigate to="/dashboard" replace />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg font-bold">Loading summary...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg font-bold text-red-500">
          Error loading summary
        </p>
      </div>
    );
  }

  const {
    periodLabel,
    summaryStats,
    createdCompletedData,
    fleetConditionData,
    onTimeOverdueData,
    jobsByStatusData,
  } = data;

  return (
    <div className="container max-w-6xl p-4 space-y-6">
      {/* HEADER */}
      <section className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
              <MapPinned className="h-6 w-6" />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Maintenance Performance Summary
              </h1>

              <p className="text-sm text-muted-foreground">
                Overview of maintenance workload, fleet condition and job
                completion performance across all depots.
              </p>

              <p className="mt-2 text-xs font-medium text-primary">
                Current reporting period: {periodLabel}
              </p>
            </div>
          </div>

          {/* PERIOD SELECT */}
          <div className="relative w-full md:w-52">
            <select
              value={period}
              onChange={(event) =>
                setPeriod(event.target.value as SummaryPeriod)
              }
              className="w-full appearance-none rounded-md border bg-background px-3 py-2 pr-9 text-sm text-foreground"
            >
              {periodOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>
      </section>

      {/* TOP STATS */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Jobs Raised"
          value={summaryStats.created}
          description={`Total maintenance jobs created during ${periodLabel.toLowerCase()}`}
          icon={<ClipboardList className="h-5 w-5" />}
          iconClassName="bg-primary/10 text-primary"
        />

        <StatCard
          title="Jobs Completed"
          value={summaryStats.completed}
          description={`Completed maintenance jobs during ${periodLabel.toLowerCase()}`}
          icon={<CheckCircle2 className="h-5 w-5" />}
          iconClassName="bg-green-500/10 text-green-500"
        />

        <StatCard
          title="Completion Rate"
          value={summaryStats.completionRate}
          description="Percentage of raised jobs completed"
          icon={<TrendingUp className="h-5 w-5" />}
          iconClassName="bg-cyan-500/10 text-cyan-500"
        />

        <StatCard
          title="Overdue Jobs"
          value={summaryStats.overdue}
          description={`Jobs past due date during ${periodLabel.toLowerCase()}`}
          icon={<AlertTriangle className="h-5 w-5" />}
          iconClassName="bg-red-500/10 text-red-500"
        />
      </div>

      {/* CHARTS ROW 1 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <DashboardCard title="Jobs Raised vs Completed">
          <p className="mb-4 text-sm text-muted-foreground">
            Compares maintenance jobs created against jobs completed for{" "}
            {periodLabel.toLowerCase()}.
          </p>

          <CreatedCompletedChart data={createdCompletedData} />
        </DashboardCard>

        <DashboardCard title="Fleet Condition Breakdown">
          <p className="mb-4 text-sm text-muted-foreground">
            Shows the current live operational state of the fleet using
            dashboard data.
          </p>

          <FleetConditionChart data={fleetConditionData} />
        </DashboardCard>
      </div>

      {/* CHARTS ROW 2 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <DashboardCard title="On-Time vs Overdue Jobs">
          <p className="mb-4 text-sm text-muted-foreground">
            Displays how many maintenance jobs stayed on schedule compared with
            jobs that became overdue.
          </p>

          <OnTimeOverdueChart data={onTimeOverdueData} />
        </DashboardCard>

        <DashboardCard title="Jobs by Current Status">
          <p className="mb-4 text-sm text-muted-foreground">
            Breaks down the maintenance workload by current job state for{" "}
            {periodLabel.toLowerCase()}.
          </p>

          <JobsByStatusChart data={jobsByStatusData} />
        </DashboardCard>
      </div>
    </div>
  );
};

export default Summary;