import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { getNotifications, type AppNotification } from "@/lib/api";
import { toast } from "@/components/ui/sonner";

const SHOWN_NOTIFICATION_IDS_KEY = "transitlens:shown-notification-ids";

const readShownNotificationIds = () => {
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(SHOWN_NOTIFICATION_IDS_KEY) || "[]");
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
};

const persistShownNotificationIds = (shownIds) => {
  window.sessionStorage.setItem(SHOWN_NOTIFICATION_IDS_KEY, JSON.stringify([...shownIds]));
};

const getNotificationTarget = (notification) => {
  if (notification.type === "job_assigned") {
    return "/jobs";
  }

  return "/notifications";
};

export function NotificationPopups() {
  const navigate = useNavigate();
  const location = useLocation();
  const shownIdsRef = useRef(readShownNotificationIds());
  const initializedRef = useRef(false);
  const token = window.localStorage.getItem("token");

  const { data: notifications = [] } = useQuery<AppNotification[]>({
    queryKey: ["notifications"],
    queryFn: getNotifications,
    enabled: Boolean(token) && location.pathname !== "/",
    refetchInterval: 30000,
    staleTime: 10000,
    retry: false,
  });

  useEffect(() => {
    if (!initializedRef.current) {
      notifications.forEach((notification) => shownIdsRef.current.add(notification.id));
      persistShownNotificationIds(shownIdsRef.current);
      initializedRef.current = true;
      return;
    }

    const nextUnread = notifications.filter(
      (notification) => notification.unread && !shownIdsRef.current.has(notification.id)
    );

    if (nextUnread.length === 0) {
      return;
    }

    nextUnread.forEach((notification) => {
      shownIdsRef.current.add(notification.id);

      if (location.pathname === "/notifications") {
        return;
      }

      toast(notification.title, {
        description: notification.message,
        duration: 6000,
        action: {
          label: "Open",
          onClick: () => navigate(getNotificationTarget(notification)),
        },
      });
    });

    persistShownNotificationIds(shownIdsRef.current);
  }, [location.pathname, navigate, notifications]);

  return null;
}