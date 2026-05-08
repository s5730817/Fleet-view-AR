const readNotificationsByUser = new Map();

const getNotificationScopeKey = (user) => {
  if (user?.id) {
    return `user:${user.id}`;
  }

  if (user?.email) {
    return `email:${String(user.email).trim().toLowerCase()}`;
  }

  return "anonymous";
};

const getReadNotifications = (user) => {
  const scopeKey = getNotificationScopeKey(user);

  if (!readNotificationsByUser.has(scopeKey)) {
    readNotificationsByUser.set(scopeKey, new Set());
  }

  return readNotificationsByUser.get(scopeKey);
};

const timeAgo = (dateValue) => {
  const date = new Date(dateValue);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return "Yesterday";
  return `${diffDays} days ago`;
};

const getTimeWeight = (time) => {
  if (time === "Just now") return 999999;
  if (time.includes("minutes")) return 100000 - parseInt(time, 10);
  if (time.includes("hours")) return 50000 - parseInt(time, 10);
  if (time === "Yesterday") return 1000;
  if (time.includes("days")) return 500 - parseInt(time, 10);
  return 0;
};

const buildNotifications = ({ fleet, jobs, faults, user }) => {
  const readNotifications = getReadNotifications(user);
  const notifications = [];

  fleet.forEach((bus) => {
    if (bus.serviceIndicator?.isOverdue) {
      const id = `service-overdue-${bus.id}`;

      notifications.push({
        id,
        type: "overdue",
        title: "Routine Service Overdue",
        message: `${bus.name} is overdue for routine servicing.`,
        time: bus.serviceIndicator.dueDate
          ? timeAgo(bus.serviceIndicator.dueDate)
          : "Recently",
        unread: !readNotifications.has(id),
      });
    }

    if (bus.serviceIndicator?.isDueSoon && !bus.serviceIndicator?.isOverdue) {
      const id = `service-due-${bus.id}`;

      notifications.push({
        id,
        type: "maintenance_due",
        title: "Maintenance Due Soon",
        message: `${bus.name} has routine maintenance due soon.`,
        time: bus.serviceIndicator.dueDate
          ? timeAgo(bus.serviceIndicator.dueDate)
          : "Recently",
        unread: !readNotifications.has(id),
      });
    }

    bus.components.forEach((component) => {
      if (component.maintenanceIndicator?.isOverdue) {
        const id = `component-overdue-${bus.id}-${component.id}`;

        notifications.push({
          id,
          type: "overdue",
          title: "Component Inspection Overdue",
          message: `${component.name} on ${bus.name} requires maintenance attention.`,
          time: component.maintenanceIndicator.dueDate
            ? timeAgo(component.maintenanceIndicator.dueDate)
            : "Recently",
          unread: !readNotifications.has(id),
        });
      }
    });
  });

  jobs.forEach((job) => {
    const id = `job-${job.id}`;

    notifications.push({
      id,
      type: "job_assigned",
      title: "Job Assigned",
      message: `${job.title} has been assigned to ${
        job.assignedToName || "a technician"
      } for ${job.busName}.`,
      time: timeAgo(job.createdAt),
      unread: !readNotifications.has(id),
    });
  });

  faults.slice(0, 6).forEach((fault) => {
    const id = `fault-${fault.id}`;

    notifications.push({
      id,
      type: "fault",
      title: "Fault Reported",
      message: `${fault.title} has been reported.`,
      time: timeAgo(fault.created_at),
      unread: !readNotifications.has(id),
    });
  });

  const systemId = "system-software-update";

  notifications.push({
    id: systemId,
    type: "system",
    title: "Software Update",
    message:
      "TransitLens offline support and report PDF generation are now available.",
    time: "Yesterday",
    unread: !readNotifications.has(systemId),
  });

  return notifications
    .sort((left, right) => getTimeWeight(right.time) - getTimeWeight(left.time))
    .slice(0, 12);
};

const markNotificationAsRead = (notificationId, user) => {
  if (!notificationId) {
    throw new Error("Notification ID is required");
  }

  getReadNotifications(user).add(notificationId);
};

const markAllNotificationsAsRead = async (loadNotifications, user) => {
  const notifications = typeof loadNotifications === "function"
    ? await loadNotifications()
    : loadNotifications;
  const readNotifications = getReadNotifications(user);

  notifications.forEach((notification) => {
    readNotifications.add(notification.id);
  });
};

module.exports = {
  buildNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
};