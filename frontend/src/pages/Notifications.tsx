import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Wrench,
  Bell,
  Clock,
} from "lucide-react";

import {
  getNotifications,
  markNotificationAsRead,
  markNotificationsAsRead,
  type AppNotification,
  type NotificationType,
} from "@/lib/api";

import { Button } from "@/components/ui/button";

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
  const queryClient = useQueryClient();

  const {
    data: notifications = [],
    isLoading,
    error,
  } = useQuery<AppNotification[]>({
    queryKey: ["notifications"],
    queryFn: getNotifications,
  });

  const unreadCount = notifications.filter((item) => item.unread).length;

  const handleMarkOneAsRead = async (notificationId: string) => {
    await markNotificationAsRead(notificationId);
    await queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const handleMarkAllAsRead = async () => {
    await markNotificationsAsRead();
    await queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-lg font-bold text-foreground">
          Loading notifications...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-lg font-bold text-red-500">
          Error loading notifications
        </p>
      </div>
    );
  }

  return (
    <main className="container max-w-6xl px-4 py-6 space-y-6">
      {/* HEADER */}
      <section className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Bell className="h-6 w-6" />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Notifications
              </h1>

              <p className="text-sm text-muted-foreground">
                {unreadCount} unread updates from fleet activity, maintenance
                jobs and system events
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0}
          >
            Mark all as read
          </Button>
        </div>
      </section>

      {/* NOTIFICATIONS */}
      <section className="rounded-xl border bg-card">
        <div className="border-b px-5 py-4">
          <h2 className="text-lg font-bold text-foreground">
            Recent Updates
          </h2>

          <p className="text-sm text-muted-foreground">
            Fault reports, due maintenance, job assignments and software updates
          </p>
        </div>

        <div className="divide-y">
          {notifications.length > 0 ? (
            notifications.map((notification) => {
              const style = getNotificationStyle(notification.type);

              return (
                <div
                  key={notification.id}
                  className={`flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-start ${
                    notification.unread ? "bg-primary/5" : "bg-card"
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${style.className}`}
                  >
                    {style.icon}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
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

                      <div className="flex shrink-0 items-center gap-2">
                        <p className="text-xs text-muted-foreground">
                          {notification.time}
                        </p>

                        {notification.unread && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleMarkOneAsRead(notification.id)
                            }
                          >
                            Mark as read
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="px-5 py-8 text-sm text-muted-foreground">
              No notifications available.
            </div>
          )}
        </div>
      </section>
    </main>
  );
};

export default Notifications;