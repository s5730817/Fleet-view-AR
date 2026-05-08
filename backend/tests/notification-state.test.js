describe("Notification read state", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test("tracks read notifications per user instead of globally", async () => {
    const notificationService = require("../src/services/notification.service");
    const firstUser = { id: "user-a", email: "user-a@test.com" };
    const secondUser = { id: "user-b", email: "user-b@test.com" };

    const initialNotifications = await notificationService.getNotifications(firstUser);
    expect(initialNotifications.length).toBeGreaterThan(0);

    const notificationId = initialNotifications[0].id;

    await notificationService.markOneAsRead(notificationId, firstUser);

    const firstUserNotifications = await notificationService.getNotifications(firstUser);
    const secondUserNotifications = await notificationService.getNotifications(secondUser);

    expect(
      firstUserNotifications.find((notification) => notification.id === notificationId)?.unread
    ).toBe(false);
    expect(
      secondUserNotifications.find((notification) => notification.id === notificationId)?.unread
    ).toBe(true);
  });
});