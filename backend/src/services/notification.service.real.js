const fleetModel = require("../models/fleet.model");
const fleetService = require("./fleet.service.real");
const jobService = require("./job.service.real");
const {
  buildNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} = require("./notification.shared");

const ACTIVE_NOTIFICATION_STATUSES = new Set(["reported", "in_progress", "awaiting_approval"]);

exports.getNotifications = async (user) => {
  const [fleet, jobs] = await Promise.all([
    fleetService.getAllBuses(user),
    jobService.getJobsForUser(user),
  ]);

  const visibleBusIds = fleet.map((bus) => bus.id);
  let faults = [];

  if (visibleBusIds.length > 0) {
    const parts = await fleetModel.getPartsForBusIds(visibleBusIds);
    const issues = await fleetModel.getIssuesForPartIds(parts.map((part) => part.id));
    faults = issues.filter((issue) => ACTIVE_NOTIFICATION_STATUSES.has(issue.status));
  }

  return buildNotifications({ fleet, jobs, faults, user });
};

exports.markOneAsRead = async (notificationId, user) => {
  markNotificationAsRead(notificationId, user);
};

exports.markAllAsRead = async (user) => {
  await markAllNotificationsAsRead(() => exports.getNotifications(user), user);
};