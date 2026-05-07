const express = require("express");
const router = express.Router();

const notificationController = require("../controllers/notification.controller");

router.get("/", notificationController.getNotifications);

router.post("/read-all", notificationController.markAllAsRead);

router.post("/:id/read", notificationController.markOneAsRead);

module.exports = router;