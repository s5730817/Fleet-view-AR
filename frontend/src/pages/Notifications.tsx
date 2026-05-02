import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Wrench,
  Bell,
  Clock,
} from "lucide-react";

type NotificationType =
  | "fault"
  | "maintenance_completed"
  | "maintenance_due"
  | "job_assigned"
  | "overdue"
  | "system";

interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  time: string;
  unread: boolean;
}

const notifications: Notification[] = [
  {
    id: 1,
    type: "fault",
    title: "Fault Reported",
    message: "Bus TL-204 has reported a brake pressure warning.",
    time: "10 minutes ago",
    unread: true,
  },
  {
    id: 2,
    type: "maintenance_completed",
    title: "Maintenance Completed",
    message: "Battery inspection completed for Bus TL-118.",
    time: "35 minutes ago",
    unread: true,
  },
  {
    id: 3,
    type: "job_assigned",
    title: "New Job Assigned",
    message: "You have been assigned a tyre replacement task at North Depot.",
    time: "1 hour ago",
    unread: false,
  },
  {
    id: 4,
    type: "maintenance_due",
    title: "Maintenance Due Soon",
    message: "Bus TL-091 is due for scheduled servicing within 3 days.",
    time: "3 hours ago",
    unread: false,
  },
  {
    id: 5,
    type: "overdue",
    title: "Job Overdue",
    message: "HVAC inspection for Bus TL-077 is now overdue.",
    time: "Yesterday",
    unread: false,
  },
  {
    id: 6,
    type: "system",
    title: "System Update",
    message: "Fleet health data has been refreshed successfully.",
    time: "Yesterday",
    unread: false,
  },
];

const getNotificationStyle = (type: NotificationType) => {
  switch (type) {
    case "fault":
      return {
        icon: <AlertTriangle className="h-5 w-5" />,
        className: "bg-red-500/10 text-red-500",
      };
    case "maintenance_completed":
      return {
        icon: <CheckCircle2 className="h-5 w-5" />,
        className: "bg-green-500/10 text-green-500",
      };
    case "maintenance_due":
      return {
        icon: <Clock className="h-5 w-5" />,
        className: "bg-yellow-500/10 text-yellow-500",
      };
    case "job_assigned":
      return {
        icon: <ClipboardList className="h-5 w-5" />,
        className: "bg-primary/10 text-primary",
      };
    case "overdue":
      return {
        icon: <Wrench className="h-5 w-5" />,
        className: "bg-red-500/10 text-red-500",
      };
    default:
      return {
        icon: <Bell className="h-5 w-5" />,
        className: "bg-primary/10 text-primary",
      };
  }
};

const Notifications = () => {
  const unreadCount = notifications.filter((item) => item.unread).length;

  return (
    <main className="container max-w-6xl px-4 py-6 space-y-6">
      <section className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Bell className="h-6 w-6" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Notifications
            </h1>
            <p className="text-sm text-muted-foreground">
              {unreadCount} unread updates across fleet maintenance activity
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border bg-card">
        <div className="border-b px-5 py-4">
          <h2 className="text-lg font-bold text-foreground">Recent Updates</h2>
          <p className="text-sm text-muted-foreground">
            Faults, job updates, maintenance alerts and system messages
          </p>
        </div>

        <div className="divide-y">
          {notifications.map((notification) => {
            const style = getNotificationStyle(notification.type);

            return (
              <div
                key={notification.id}
                className={`flex gap-4 px-5 py-4 ${
                  notification.unread ? "bg-primary/5" : "bg-card"
                }`}
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${style.className}`}
                >
                  {style.icon}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">
                          {notification.title}
                        </h3>

                        {notification.unread && (
                          <span className="h-2 w-2 rounded-full bg-primary" />
                        )}
                      </div>

                      <p className="mt-1 text-sm text-muted-foreground">
                        {notification.message}
                      </p>
                    </div>

                    <p className="shrink-0 text-xs text-muted-foreground">
                      {notification.time}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
};

export default Notifications;