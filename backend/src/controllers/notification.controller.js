const notificationService = require("../services/notification.service");

exports.getNotifications = async (req, res) => {
  try {
    const notifications = await notificationService.getNotifications(req.user);

    res.status(200).json({
      success: true,
      data: notifications,
    });
  } catch (err) {
    console.error("Error fetching notifications:", err);

    res.status(500).json({
      success: false,
      error: "Failed to fetch notifications",
    });
  }
};

exports.markOneAsRead = async (req, res) => {
  try {
    await notificationService.markOneAsRead(req.params.id);

    res.status(200).json({
      success: true,
    });
  } catch (err) {
    console.error("Error marking notification as read:", err);

    res.status(400).json({
      success: false,
      error: err.message || "Failed to update notification",
    });
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    await notificationService.markAllAsRead(req.user);

    res.status(200).json({
      success: true,
    });
  } catch (err) {
    console.error("Error marking notifications as read:", err);

    res.status(500).json({
      success: false,
      error: "Failed to update notifications",
    });
  }
};