import { Router } from "express";
import { authenticateUser } from "../middleware/authMiddleware";
import {
  getNotifications,
  markAllAsRead,
  markAsRead,
} from "../controller/notificationController";

const router = Router();

router.use(authenticateUser);

router.get("/", getNotifications);
router.patch("/:id/read", markAsRead);
router.patch("/read/all", markAllAsRead);

export default router;
