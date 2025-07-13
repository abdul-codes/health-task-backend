import { z } from "zod";
import { TaskPriority, TaskStatus } from "../generated/prisma";

// Schema for creating a task
export const createTaskSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(100, "Title cannot exceed 100 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"), // Fixed: Match frontend validation
  status: z.nativeEnum(TaskStatus).optional().default(TaskStatus.PENDING),
  priority: z.nativeEnum(TaskPriority).optional().default(TaskPriority.MEDIUM),
  dueDate: z.string().datetime("Invalid date format - must be ISO 8601").refine((val) => {
    const date = new Date(val);
    return !isNaN(date.getTime()) && date > new Date();
  }, "Due date must be in the future"), // Fixed: Better date validation
  assignedToId: z.string().uuid("Invalid user ID format").optional(),
  patientId: z.string().uuid("Invalid patient ID format").optional(),
});

// Schema for updating a task
export const updateTaskSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(100, "Title cannot exceed 100 characters").optional(),
  description: z.string().min(10, "Description must be at least 10 characters").optional(), // Fixed: Match frontend validation
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  dueDate: z.string().datetime("Invalid date format - must be ISO 8601").refine((val) => {
    const date = new Date(val);
    return !isNaN(date.getTime()) && date > new Date();
  }, "Due date must be in the future").optional(), // Fixed: Better date validation
  assignedToId: z.string().uuid("Invalid user ID format").optional().nullable(),
  patientId: z.string().uuid("Invalid patient ID format").optional().nullable(),
}).refine((data) => Object.keys(data).length > 0, {
  message: "At least one field must be provided for update",
});

// Schema for assigning a task
export const assignTaskSchema = z.object({
  assignedToId: z.string({
    required_error: "User ID is required to assign the task",
  }).uuid("Invalid user ID format"), // Fixed: Add UUID validation
});

// Types derived from schemas
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type AssignTaskInput = z.infer<typeof assignTaskSchema>;