
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
  getTasksCreatedByMe
} from "../controller/taskController";
import { UserRole } from "../generated/prisma";

const router = express.Router();

// All task routes require authentication
router.use(authenticateUser);

// Routes for all authenticated users
router.get("/my-tasks", getMyTasks);
router.get("/created-by-me", getTasksCreatedByMe);
router.get("/:id", getTaskById);

// Routes for doctors, nurses, and admins
router.post("/", authorizeRoles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE), createTask);
router.put("/:id", authorizeRoles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE), updateTask);
router.delete("/:id", authorizeRoles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE), deleteTask);
router.post("/:id/assign", authorizeRoles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE), assignTask);
router.post("/:id/unassign", authorizeRoles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE), unassignTask);
router.post("/:id/complete", authorizeRoles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE, UserRole.LABTECH), completeTask);

// Admin and doctor can view all tasks
router.get("/", authorizeRoles(UserRole.ADMIN, UserRole.DOCTOR), getAllTasks);

export default router;