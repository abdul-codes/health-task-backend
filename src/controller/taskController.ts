import { Request, Response } from "express";
import { asyncMiddleware } from "../middleware/asyncMiddleware";
import { prisma } from "../utils/db";
import {
  createTaskSchema,
  updateTaskSchema,
  assignTaskSchema,
  statusUpdateSchema,
} from "../validation/taskValidation";
import { TaskStatus } from "../generated/prisma";
import { getIO } from "@/utils/socket";
import { sendPushNotifications } from "../utils/pushNotification";

/**
 * Create a new task
 * POST /api/tasks
 */
export const createTask = asyncMiddleware(
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;

      // Fixed: Validate user authentication
      if (!userId) {
        return res.status(401).json({
          message: "Authentication required",
        });
      }

      // Validate input using Zod schema
      const validationResult = createTaskSchema.safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({
          message: "Validation error",
          errors: validationResult.error.format(),
        });
      }

      const {
        title,
        description,
        status,
        priority,
        dueDate,
        assignedToId,
        patientId,
      } = validationResult.data;

      // Convert date string to Date object
      const dueDateObj = new Date(dueDate);

      // Create task data object
      const taskData: any = {
        title,
        description,
        status,
        priority,
        dueDate: dueDateObj,
        createdBy: {
          connect: { id: userId },
        },
        assignedTo: assignedToId
          ? {
              connect: { id: assignedToId },
            }
          : undefined,
        patient: patientId ? { connect: { id: patientId } } : undefined,
      };

      // Add optional fields if provided

      // Create the task
      const task = await prisma.task.create({
        data: taskData,
        include: {
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              expoPushToken: true,
            },
          },
          patient: {
            select: {
              id: true,
              name: true,
              roomNumber: true,
            },
          },
        },
      });

      // Web Socket Event
      // try {
      //   const io = getIO();
      //   // Notify the user who the task is assigned to
      //   // No user will be in the list more than once.
      //   const recipientIds = new Set<string>();

      //   if (task.createdBy?.id) {
      //     recipientIds.add(task.createdBy.id);
      //   }

      //   if (task.assignedTo?.id) {
      //     recipientIds.add(task.assignedTo.id);
      //   }

      //   if (recipientIds.size > 0) {
      //     io.to([...recipientIds]).emit("taskCreated", task);
      //   }
      // } catch (error) {
      //   console.error("Socket.IO emission failed:", error);
      //   // Decide if you want to do anything else if sockets fail.
      //   // The main HTTP response will still succeed.
      // }
      // Websocket ends
      // Push Notification
      if (assignedToId) {
        const notificationTitle = `New Task: ${task.title}`;
        const notificationBody = `You have been a new ${priority.toLocaleLowerCase()} priority task to patient ${
          task.patient?.name
        } room number ${task.patient?.roomNumber}`;

        await sendPushNotifications(
          [assignedToId],
          notificationTitle,
          notificationBody,
          { taskId: task.id },
        );
      }

      // End of push notification

      res.status(201).json({
        message: "Task created successfully",
        task,
      });
    } catch (error) {
      console.error("Create task error:", error);

      if (
        error &&
        typeof error === "object" &&
        (error as any).code === "P2025"
      ) {
        return res.status(404).json({
          message: "The assigned user or patient could not be found.",
          error: (error as any).meta?.cause || "Related record not found.",
        });
      }

      res.status(500).json({
        message: "Error creating task",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

/**
 * Get all tasks
 * GET /api/tasks
 */
export const getAllTasks = asyncMiddleware(
  async (req: Request, res: Response) => {
    try {
      const { status, priority, assignedToId, patientId } = req.query;

      // Build filter object
      const filter: any = {};

      if (status) {
        filter.status = status as string;
      }

      if (priority) {
        filter.priority = priority as string;
      }

      if (assignedToId) {
        filter.assignedToId = assignedToId as string;
      }

      if (patientId) {
        filter.patientId = patientId as string;
      }

      const tasks = await prisma.task.findMany({
        where: filter,
        include: {
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          patient: {
            select: {
              id: true,
              name: true,
              roomNumber: true,
            },
          },
        },
        orderBy: {
          dueDate: "asc",
        },
      });

      res.json(tasks);
    } catch (error) {
      console.error("Get all tasks error:", error);
      res.status(500).json({
        message: "Error fetching tasks",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

/**
 * Get task by ID
 * GET /api/tasks/:id
 */
export const getTaskById = asyncMiddleware(
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const task = await prisma.task.findUnique({
        where: { id },
        include: {
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          patient: {
            select: {
              id: true,
              name: true,
              roomNumber: true,
            },
          },
        },
      });

      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      res.json(task);
    } catch (error) {
      console.error("Get task by ID error:", error);
      res.status(500).json({
        message: "Error fetching task",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

/**
 * Update task
 * PUT /api/tasks/:id
 */
export const updateTask = asyncMiddleware(
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      // Validate input using Zod schema
      const validationResult = updateTaskSchema.safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({
          message: "Validation error",
          errors: validationResult.error.format(),
        });
      }

      // Check if task exists
      const existingTask = await prisma.task.findUnique({
        where: { id },
        include: {
          createdBy: true,
        },
      });

      if (!existingTask) {
        return res.status(404).json({ message: "Task not found" });
      }

      // Only allow the creator or admin to update the task
      // if (existingTask.createdById !== userId && req.user?.role !== "ADMIN") {
      //   return res.status(403).json({
      //     message: "You don't have permission to update this task",
      //   });
      // }

      const {
        title,
        description,
        status,
        priority,
        dueDate,
        assignedToId,
        patientId,
      } = validationResult.data;

      // Create update data object
      const updateData: any = {};

      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (status !== undefined) updateData.status = status;
      if (priority !== undefined) updateData.priority = priority;

      if (dueDate !== undefined) {
        const dueDateObj = new Date(dueDate);
        updateData.dueDate = dueDateObj;
      }

      // Handle assignedToId
      if (assignedToId === null) {
        // Remove assignment
        updateData.assignedTo = { disconnect: true };
      } else if (assignedToId !== undefined) {
        // Verify that the assigned user exists
        const assignedUser = await prisma.user.findUnique({
          where: { id: assignedToId },
        });

        if (!assignedUser) {
          return res.status(404).json({
            message: "Assigned user not found",
          });
        }

        updateData.assignedTo = { connect: { id: assignedToId } };
      }

      // Handle patientId
      if (patientId === null) {
        // Remove patient association
        updateData.patient = { disconnect: true };
      } else if (patientId !== undefined) {
        // Verify that the patient exists
        const patient = await prisma.patient.findUnique({
          where: { id: patientId },
        });

        if (!patient) {
          return res.status(404).json({
            message: "Patient not found",
          });
        }

        updateData.patient = { connect: { id: patientId } };
      }

      // Update task
      const updatedTask = await prisma.task.update({
        where: { id },
        data: updateData,
        include: {
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          patient: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      res.json({
        message: "Task updated successfully",
        task: updatedTask,
      });
      // Send notifications for assignment changes
      if (assignedToId && assignedToId !== existingTask.assignedToId) {
        const notificationTitle = "New Task Assignment Updated";
        const notificationBody = `You've been assigned to task: ${updatedTask.title}`;

        await sendPushNotifications(
          [assignedToId],
          notificationTitle,
          notificationBody,
          { taskId: updatedTask.id },
        );
      }

      // In updateTask function, after updating the task
      if (assignedToId && assignedToId !== existingTask.assignedToId) {
        // If task is being reassigned from one user to another
        if (existingTask.assignedToId) {
          const reassignmentTitle = "Task Reassigned";
          const reassignmentBody = `Task "${updatedTask.title}" has been reassigned to another user`;

          await sendPushNotifications(
            [existingTask.assignedToId],
            reassignmentTitle,
            reassignmentBody,
            { taskId: updatedTask.id },
          );
        }
      }
    } catch (error) {
      console.error("Update task error:", error);
      res.status(500).json({
        message: "Error updating task",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

/**
 * Delete task
 * DELETE /api/tasks/:id
 */
export const deleteTask = asyncMiddleware(
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      // Check if task exists
      const existingTask = await prisma.task.findUnique({
        where: { id },
        include: {
          createdBy: true,
        },
      });

      if (!existingTask) {
        return res.status(404).json({ message: "Task not found" });
      }

      // Only allow the creator or admin to delete the task
      if (existingTask.createdById !== userId && req.user?.role !== "ADMIN") {
        return res.status(403).json({
          message: "You don't have permission to delete this task",
        });
      }

      // Delete task
      await prisma.task.delete({
        where: { id },
      });

      res.json({ message: "Task deleted successfully" });
    } catch (error) {
      console.error("Delete task error:", error);
      res.status(500).json({
        message: "Error deleting task",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

/**
 * Assign task to a user
 * POST /api/tasks/:id/assign
 */
export const assignTask = asyncMiddleware(
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      // Validate input using Zod schema
      const validationResult = assignTaskSchema.safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({
          message: "Validation error",
          errors: validationResult.error.format(),
        });
      }

      const { assignedToId } = validationResult.data;

      // Check if task exists
      const existingTask = await prisma.task.findUnique({
        where: { id },
        include: {
          createdBy: true,
        },
      });

      if (!existingTask) {
        return res.status(404).json({ message: "Task not found" });
      }

      // Only allow the creator or admin to assign the task
      if (existingTask.createdById !== userId && req.user?.role !== "ADMIN") {
        return res.status(403).json({
          message: "You don't have permission to assign this task",
        });
      }

      // Verify that the assigned user exists
      const assignedUser = await prisma.user.findUnique({
        where: { id: assignedToId },
      });

      if (!assignedUser) {
        return res.status(404).json({
          message: "Assigned user not found",
        });
      }

      // Update task with assigned user
      const updatedTask = await prisma.task.update({
        where: { id },
        data: {
          assignedTo: {
            connect: { id: assignedToId },
          },
          // Automatically set status to IN_PROGRESS when assigned
          status: TaskStatus.IN_PROGRESS,
        },
        include: {
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          patient: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // --- Trigger Notification ---
      const notificationTitle = `Task Assigned: ${existingTask.title}`;
      const notificationBody = `You have been assigned an existing task.`;
      await sendPushNotifications(
        [assignedToId],
        notificationTitle,
        notificationBody,
        { taskId: updatedTask.id },
      );
      // --- End Notification ---

      res.json({
        message: "Task assigned successfully",
        task: updatedTask,
      });
    } catch (error) {
      console.error("Assign task error:", error);
      res.status(500).json({
        message: "Error assigning task",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

/**
 * Unassign task from a user
 * POST /api/tasks/:id/unassign
 */
export const unassignTask = asyncMiddleware(
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      // Check if task exists
      const existingTask = await prisma.task.findUnique({
        where: { id },
        include: {
          createdBy: true,
        },
      });

      if (!existingTask) {
        return res.status(404).json({ message: "Task not found" });
      }

      // Only allow the creator, admin, or the assigned user to unassign the task
      if (
        existingTask.createdById !== userId &&
        req.user?.role !== "ADMIN" &&
        existingTask.assignedToId !== userId
      ) {
        return res.status(403).json({
          message: "You don't have permission to unassign this task",
        });
      }

      // Update task to remove assigned user
      const updatedTask = await prisma.task.update({
        where: { id },
        data: {
          assignedTo: {
            disconnect: true,
          },
          // Reset status to PENDING when unassigned
          status: TaskStatus.PENDING,
        },
        include: {
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          patient: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      res.json({
        message: "Task unassigned successfully",
        task: updatedTask,
      });
    } catch (error) {
      console.error("Unassign task error:", error);
      res.status(500).json({
        message: "Error unassigning task",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

/**
 * Update the Task Status
 */
export const UpdateTaskStatus = asyncMiddleware(
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const parse = statusUpdateSchema.safeParse(req.body);
      if (!parse.success) {
        return res
          .status(400)
          .json({ message: "Invalid status", errors: parse.error.format() });
      }
      const { status } = parse.data;

      // Check if task exists
      const existingTask = await prisma.task.findUnique({
        where: { id },
      });

      if (!existingTask) {
        return res.status(404).json({ message: "Task not found" });
      }

      // Only allow the assigned user to mark as completed
      // if (existingTask.assignedToId !== userId && req.user?.role !== "ADMIN") {
      //   return res.status(403).json({
      //     message:
      //       "Only the assigned user or an admin can mark this task as completed",
      //   });
      // }

      // Update task status to completed
      const updatedTask = await prisma.task.update({
        where: { id },
        data: {
          status,
        },
        include: {
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              expoPushToken: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          patient: {
            select: {
              id: true,
              name: true,
              roomNumber: true,
            },
          },
        },
      });
      // After successful status update:
      // --- Comprehensive Notification Logic ---
      if (updatedTask.createdById) {
        let notificationTitle = "";
        let notificationBody = "";

        switch (updatedTask.status) {
          case TaskStatus.IN_PROGRESS:
            notificationTitle = "Task Started";
            notificationBody = `The task "${updatedTask.title}" has been started.`;
            break;
          case TaskStatus.COMPLETED:
            notificationTitle = "Task Completed";
            notificationBody = `Your task "${updatedTask.title}" has been marked as completed.`;
            break;
          case TaskStatus.CANCELLED:
            // This is ready for when you implement a "Cancel" action
            notificationTitle = "Task Cancelled";
            notificationBody = `The task "${updatedTask.title}" has been cancelled.`;
            break;
        }
        // Determine who needs to be notified
        const recipientIds = new Set<string>();

        //  notify the creator? Yes, if they aren't the one who updated the task.
        if (updatedTask.createdById && updatedTask.createdById !== userId) {
          recipientIds.add(updatedTask.createdById);
        }

        // Should we notify the assignee? Yes, if they exist and aren't the one who updated the task.
        if (updatedTask.assignedToId && updatedTask.assignedToId !== userId) {
          recipientIds.add(updatedTask.assignedToId);
        }

        // Only send a notification if a relevant status change occurred
        if (notificationTitle && notificationBody) {
          await sendPushNotifications(
            Array.from(recipientIds), // Send to the user who created the task
            notificationTitle,
            notificationBody,
            { taskId: updatedTask.id }, // Navigate to the task on tap
          );
        }
      }
      // --- End Notification Logic ---

      res.json(updatedTask);
    } catch (error) {
      console.error("Complete task error:", error);
      res.status(500).json({
        message: "Error completing task",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);
/**
 * Mark task as completed
 * POST /api/tasks/:id/complete
 */
export const completeTask = asyncMiddleware(
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      // Check if task exists
      const existingTask = await prisma.task.findUnique({
        where: { id },
      });

      if (!existingTask) {
        return res.status(404).json({ message: "Task not found" });
      }

      // Only allow the assigned user to mark as completed
      if (existingTask.assignedToId !== userId && req.user?.role !== "ADMIN") {
        return res.status(403).json({
          message:
            "Only the assigned user or an admin can mark this task as completed",
        });
      }

      // Update task status to completed
      const updatedTask = await prisma.task.update({
        where: { id },
        data: {
          status: TaskStatus.COMPLETED,
        },
        include: {
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          patient: {
            select: {
              id: true,
              name: true,
              roomNumber: true,
            },
          },
        },
      });

      res.json({
        message: "Task marked as completed",
        task: updatedTask,
      });
    } catch (error) {
      console.error("Complete task error:", error);
      res.status(500).json({
        message: "Error completing task",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

/**
 * Get tasks assigned to the current user
 * GET /api/tasks/my-tasks
 */
export const getMyTasks = asyncMiddleware(
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { status, priority } = req.query;

      // Build filter object
      const filter: any = {
        assignedToId: userId,
        //    createdById: userId,
      };

      if (status) {
        filter.status = status as string;
      }
      
      if (priority) {
        filter.priority = priority as string;
      }

      const tasks = await prisma.task.findMany({
        where: filter,
        include: {
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          patient: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          dueDate: "asc",
        },
      });

      res.json(tasks);
    } catch (error) {
      console.error("Get my tasks error:", error);
      res.status(500).json({
        message: "Error fetching your tasks",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

/**
 * Get tasks created by the current user
 * GET /api/tasks/created-by-me
 */
export const getTasksCreatedByMe = asyncMiddleware(
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { status, priority } = req.query;

      // Build filter object
      const filter: any = {
        createdById: userId,
      };

      if (status) {
        filter.status = status as string;
      }

      if (priority) {
        filter.priority = priority as string;
      }

      const tasks = await prisma.task.findMany({
        where: filter,
        include: {
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          patient: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      res.json(tasks);
    } catch (error) {
      console.error("Get tasks created by me error:", error);
      res.status(500).json({
        message: "Error fetching tasks created by you",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);
