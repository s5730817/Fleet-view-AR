import { useQuery } from "@tanstack/react-query";
import { getSummary } from "@/lib/api";

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
} from "lucide-react";

const Summary = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["summary"],
    queryFn: getSummary,
  });

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
        <div className="flex items-start gap-4">

          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
            <MapPinned className="h-6 w-6" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Maintenance Performance Summary
            </h1>

            <p className="text-sm text-muted-foreground">
              Overview of maintenance workload, fleet condition and job completion performance across all depots.
            </p>
          </div>

        </div>
      </section>

      {/* TOP STATS */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

        <StatCard
          title="Jobs Raised"
          value={summaryStats.created}
          description="Total maintenance jobs created"
          icon={<ClipboardList className="h-5 w-5" />}
          iconClassName="bg-primary/10 text-primary"
        />

        <StatCard
          title="Jobs Completed"
          value={summaryStats.completed}
          description="Successfully completed maintenance jobs"
          icon={<CheckCircle2 className="h-5 w-5" />}
          iconClassName="bg-green-500/10 text-green-500"
        />

        <StatCard
          title="Completion Rate"
          value={summaryStats.completionRate}
          description="Percentage of jobs completed"
          icon={<TrendingUp className="h-5 w-5" />}
          iconClassName="bg-cyan-500/10 text-cyan-500"
        />

        <StatCard
          title="Overdue Jobs"
          value={summaryStats.overdue}
          description="Maintenance jobs past due date"
          icon={<AlertTriangle className="h-5 w-5" />}
          iconClassName="bg-red-500/10 text-red-500"
        />

      </div>

      {/* CHARTS ROW 1 */}
      <div className="grid gap-4 lg:grid-cols-2">

        <DashboardCard title="Jobs Raised vs Completed">

          <p className="mb-4 text-sm text-muted-foreground">
            Compares how many maintenance jobs were created against how many were completed during the reporting period.
          </p>

          <CreatedCompletedChart data={createdCompletedData} />

        </DashboardCard>

        <DashboardCard title="Fleet Condition Breakdown">

          <p className="mb-4 text-sm text-muted-foreground">
            Shows the current operational state of the fleet, including buses requiring attention or currently out of operation.
          </p>

          <FleetConditionChart data={fleetConditionData} />

        </DashboardCard>

      </div>

      {/* CHARTS ROW 2 */}
      <div className="grid gap-4 lg:grid-cols-2">

        <DashboardCard title="On-Time vs Overdue Jobs">

          <p className="mb-4 text-sm text-muted-foreground">
            Displays how many maintenance jobs were completed within schedule versus jobs that became overdue.
          </p>

          <OnTimeOverdueChart data={onTimeOverdueData} />

        </DashboardCard>

        <DashboardCard title="Jobs by Current Status">

          <p className="mb-4 text-sm text-muted-foreground">
            Breaks down the active maintenance workload by current job state across the network.
          </p>

          <JobsByStatusChart data={jobsByStatusData} />

        </DashboardCard>

      </div>

    </div>
  );
};

export default Summary;