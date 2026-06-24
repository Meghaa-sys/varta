import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { asyncHandler } from "../../utils/async-handler";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead
} from "./notification.service";

export const notificationRouter = Router();

notificationRouter.use(requireAuth);

notificationRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json({ notifications: await listNotifications(req.user!.id) });
  })
);

notificationRouter.patch(
  "/read-all",
  asyncHandler(async (req, res) => {
    const result = await markAllNotificationsRead(req.user!.id);
    res.json({ updated: result.count });
  })
);

notificationRouter.patch(
  "/:notificationId/read",
  asyncHandler(async (req, res) => {
    const result = await markNotificationRead(req.user!.id, req.params.notificationId);
    res.json({ updated: result.count });
  })
);
