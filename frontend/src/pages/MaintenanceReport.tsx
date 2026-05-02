import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Download,
  Eye,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type ReportStatus = "Completed" | "In Progress" | "Fault Found";

interface MaintenanceReport {
  id: number;
  busName: string;
  depot: string;
  task: string;
  technician: string;
  date: string;
  status: ReportStatus;
}

const reports: MaintenanceReport[] = [
  {
    id: 1,
    busName: "Bus TL-204",
    depot: "Depot 1",
    task: "Brake pressure inspection",
    technician: "Alex Morgan",
    date: "2026-05-02",
    status: "Fault Found",
  },
  {
    id: 2,
    busName: "Bus TL-118",
    depot: "Depot 3",
    task: "Battery inspection",
    technician: "Jamie Carter",
    date: "2026-05-01",
    status: "Completed",
  },
  {
    id: 3,
    busName: "Bus TL-091",
    depot: "Depot 2",
    task: "Scheduled service check",
    technician: "Taylor Singh",
    date: "2026-04-30",
    status: "In Progress",
  },
  {
    id: 4,
    busName: "Bus TL-077",
    depot: "Depot 6",
    task: "HVAC inspection",
    technician: "Morgan Lee",
    date: "2026-04-29",
    status: "Completed",
  },
];

const getStatusStyle = (status: ReportStatus) => {
  switch (status) {
    case "Completed":
      return {
        icon: <CheckCircle2 className="h-4 w-4" />,
        className: "bg-green-500/10 text-green-500 border-green-500/20",
      };
    case "In Progress":
      return {
        icon: <Clock className="h-4 w-4" />,
        className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      };
    case "Fault Found":
      return {
        icon: <AlertTriangle className="h-4 w-4" />,
        className: "bg-red-500/10 text-red-500 border-red-500/20",
      };
  }
};

const MaintenanceReports = () => {
  const completedCount = reports.filter(
    (report) => report.status === "Completed"
  ).length;

  const inProgressCount = reports.filter(
    (report) => report.status === "In Progress"
  ).length;

  const faultCount = reports.filter(
    (report) => report.status === "Fault Found"
  ).length;

  return (
    <main className="container max-w-6xl px-4 py-6 space-y-6">
      <section className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FileText className="h-6 w-6" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Maintenance Reports
            </h1>
            <p className="text-sm text-muted-foreground">
              View completed work, active inspections and reported faults
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-500">
              {completedCount}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              In Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-500">
              {inProgressCount}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Faults Found
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-500">{faultCount}</p>
          </CardContent>
        </Card>
      </section>

      <section className="rounded-xl border bg-card">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              Recent Reports
            </h2>
            <p className="text-sm text-muted-foreground">
              Latest maintenance activity across depots
            </p>
          </div>

          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>

        <div className="divide-y">
          {reports.map((report) => {
            const statusStyle = getStatusStyle(report.status);

            return (
              <div
                key={report.id}
                className="flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-foreground">
                      {report.task}
                    </h3>

                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium ${statusStyle.className}`}
                    >
                      {statusStyle.icon}
                      {report.status}
                    </span>
                  </div>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {report.busName} · {report.depot} · {report.technician}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    {new Date(report.date).toLocaleDateString()}
                  </p>
                </div>

                <Button variant="outline" size="sm">
                  <Eye className="h-4 w-4 mr-2" />
                  View Report
                </Button>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
};

export default MaintenanceReports;