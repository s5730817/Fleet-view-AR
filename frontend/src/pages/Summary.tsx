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

const summaryStats = {
  created: 469,
  completed: 451,
  completionRate: "96.1%",
  overdue: 138,
};

const createdCompletedData = [
  { date: "Mon", created: 42, completed: 35 },
  { date: "Tue", created: 58, completed: 49 },
  { date: "Wed", created: 74, completed: 68 },
  { date: "Thu", created: 63, completed: 72 },
  { date: "Fri", created: 89, completed: 81 },
  { date: "Sat", created: 54, completed: 61 },
  { date: "Sun", created: 36, completed: 44 },
];

const priorityData = [
  { name: "Low", value: 235 },
  { name: "Medium", value: 408 },
  { name: "High", value: 31 },
  { name: "None", value: 351 },
];

const onTimeOverdueData = [
  { name: "On Time", value: 941 },
  { name: "Overdue", value: 138 },
];

const jobsByStatusData = [
  { status: "Open", value: 72 },
  { status: "In Progress", value: 128 },
  { status: "Completed", value: 451 },
  { status: "Overdue", value: 138 },
];

const Summary = () => {
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