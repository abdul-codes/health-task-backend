import { z } from "zod";
import { TaskPriority, TaskStatus } from "../generated/prisma";

// Schema for creating a task
export const createTaskSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(100, "Title cannot exceed 100 characters"),
  description: z.string().min(5, "Description must be at least 5 characters"),
  status: z.nativeEnum(TaskStatus).optional().default(TaskStatus.PENDING),
  priority: z.nativeEnum(TaskPriority).optional().default(TaskPriority.MEDIUM),
  dueDate: z.string().refine((val) => {
    const date = new Date(val);
    return !isNaN(date.getTime());
  }, "Invalid date format for due date"),
  assignedToId: z.string().optional(),
  patientId: z.string().optional(),
});

// Schema for updating a task
export const updateTaskSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(100, "Title cannot exceed 100 characters").optional(),
  description: z.string().min(5, "Description must be at least 5 characters").optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  dueDate: z.string().refine((val) => {
    const date = new Date(val);
    return !isNaN(date.getTime());
  }, "Invalid date format for due date").optional(),
  assignedToId: z.string().optional().nullable(),
  patientId: z.string().optional().nullable(),
}).refine((data) => Object.keys(data).length > 0, {
  message: "At least one field must be provided for update",
});

// Schema for assigning a task
export const assignTaskSchema = z.object({
  assignedToId: z.string({
    required_error: "User ID is required to assign the task",
  }),
});

// Types derived from schemas
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type AssignTaskInput = z.infer<typeof assignTaskSchema>;