import { useQuery } from "@tanstack/react-query";
import { getSummary } from "@/lib/api";

import { StatCard } from "@/components/StatCard";
import { DashboardCard } from "@/components/DashboardCard";
import { CreatedCompletedChart } from "@/components/CompletedChart";
import { PriorityPieChart } from "@/components/PriorityPieChart";
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
    priorityData,
    onTimeOverdueData,
    jobsByStatusData,
  } = data;

  return (
    <div className="container max-w-6xl p-4 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <MapPinned className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">
              All Depots Overview
            </h1>
          </div>

          <p className="text-sm text-muted-foreground">
            Network-wide maintenance activity and job performance
          </p>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Created"
          value={summaryStats.created}
          description="Total jobs raised"
          icon={<ClipboardList className="h-5 w-5" />}
          iconClassName="bg-primary/10 text-primary"
        />

        <StatCard
          title="Completed"
          value={summaryStats.completed}
          description="Jobs finished"
          icon={<CheckCircle2 className="h-5 w-5" />}
          iconClassName="bg-green-500/10 text-green-500"
        />

        <StatCard
          title="Completion Rate"
          value={summaryStats.completionRate}
          description="Created jobs completed"
          icon={<TrendingUp className="h-5 w-5" />}
          iconClassName="bg-cyan-500/10 text-cyan-500"
        />

        <StatCard
          title="Overdue"
          value={summaryStats.overdue}
          description="Jobs past due date"
          icon={<AlertTriangle className="h-5 w-5" />}
          iconClassName="bg-red-500/10 text-red-500"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <DashboardCard title="Created vs Completed">
          <CreatedCompletedChart data={createdCompletedData} />
        </DashboardCard>

        <DashboardCard title="Priority Breakdown">
          <PriorityPieChart data={priorityData} />
        </DashboardCard>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <DashboardCard title="On Time vs Overdue">
          <OnTimeOverdueChart data={onTimeOverdueData} />
        </DashboardCard>

        <DashboardCard title="Jobs by Status">
          <JobsByStatusChart data={jobsByStatusData} />
        </DashboardCard>
      </div>

    </div>
  );
};

export default Summary;