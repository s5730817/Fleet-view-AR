const fleetService = require("./fleet.service");
const jobService = require("./job.service");
const faultService = require("./fault.service");
const {
  buildNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} = require("./notification.shared");

exports.getNotifications = async (user) => {
  const fleet = await fleetService.getAllBuses();
  const jobs = await jobService.getJobsForUser(user);
  const faults = await faultService.getAllFaults({});

  return buildNotifications({ fleet, jobs, faults, user });
};

exports.markOneAsRead = async (notificationId, user) => {
  markNotificationAsRead(notificationId, user);
};

exports.markAllAsRead = async (user) => {
  await markAllNotificationsAsRead(() => exports.getNotifications(user), user);
};