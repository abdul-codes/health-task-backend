
import express from "express";
import { authenticateUser, authorizeRoles } from "../middleware/authMiddleware";
import {
  createTask,
  getAllTasks,
  getTaskById,
  updateTask,
  deleteTask,
  assignTask,
  unassignTask,
  completeTask,
  getMyTasks,
  getTasksCreatedByMe,
  UpdateTaskStatus
} from "../controller/taskController";
import { UserRole } from "../generated/prisma";

const router = express.Router();

// All task routes require authentication
router.use(authenticateUser);

// Routes for all authenticated users
router.get("/my-tasks", getMyTasks);
router.get("/created-by-me", getTasksCreatedByMe);

router.get("/", getAllTasks);
router.get("/:id", getTaskById);

// Routes for doctors, nurses, and admins
router.post("/", authorizeRoles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE), createTask);
router.put("/:id", updateTask);
router.delete("/:id", authorizeRoles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE), deleteTask);
router.post("/:id/assign", authorizeRoles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE), assignTask);
router.post("/:id/unassign", authorizeRoles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE), unassignTask);
router.patch("/:id/complete", completeTask);
router.patch("/:id/status", UpdateTaskStatus)


export default router;