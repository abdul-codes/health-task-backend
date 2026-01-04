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
import { sendPushNotifications } from "../utils/pushNotification";
import { AppError } from "../utils/AppError";

/**
 * Create a new task
 * POST /api/tasks
 */
export const createTask = asyncMiddleware(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;

    // Fixed: Validate user authentication
    if (!userId) {
      throw new AppError('Authentication required', 401, 'taskController');
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
            role: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
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

    // Push Notification
    const notificationRecipients = new Set<string>();
    if (assignedToId) {
      notificationRecipients.add(assignedToId);
    }
    // Also notify the creator of the task
    if (task.createdById) {
      notificationRecipients.add(task.createdById);
    }

    if (notificationRecipients.size > 0) {
      const notificationTitle = `New Task: ${task.title}`;
      const notificationBody = `A new ${priority.toLocaleLowerCase()} priority task has been created for patient ${
        task.patient?.name
      } in room number ${task.patient?.roomNumber}`;

      await sendPushNotifications(
        Array.from(notificationRecipients),
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
  },
);

/**
 * Get all tasks
 * GET /api/tasks
 */
export const getAllTasks = asyncMiddleware(
  async (req: Request, res: Response) => {
    const { id: userId, role: userRole } = req.user!;
    const { status, priority, patientId } = req.query;

    const where: any = {};

    // 1. Build base filter from query params
    if (status) where.status = status as string;
    if (priority) where.priority = priority as string;
    if (patientId) where.patientId = patientId as string;

    // 2. Apply role-based visibility rules
    if (userRole === "ADMIN") {
      // Admins see all tasks. No extra filter needed.
    } else if (userRole === "DOCTOR") {
      // Doctors see tasks they created OR are assigned to.
      where.OR = [{ createdById: userId }, { assignedToId: userId }];
    } else {
      // Nurses and Labtechs only see tasks assigned to them.
      where.assignedToId = userId;
    }

    const tasks = await prisma.task.findMany({
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
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
      ...({
        cacheStrategy: {
          swr: 60,
          ttl: 30,
        },
      } as any),
    });

    res.json(tasks);
  },
);

/**
 * Get task by ID
 * GET /api/tasks/:id
 */
export const getTaskById = asyncMiddleware(
  async (req: Request, res: Response) => {
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
            role: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
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
      ...({
        cacheStrategy: {
          swr: 60,
          ttl: 30,
        },
      } as any),
    });

    if (!task) {
      throw new AppError('Task not found', 404, 'taskController');
    }

    res.json(task);
  },
);

/**
 * Update task
 * PUT /api/tasks/:id
 */
export const updateTask = asyncMiddleware(
  async (req: Request, res: Response) => {
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
      throw new AppError('Task not found', 404, 'taskController');
    }

    // Only allow the creator or admin to update the task
    if (existingTask.createdById !== userId && req.user?.role !== "ADMIN") {
      throw new AppError('You do not have permission to update this task', 403, 'taskController');
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
        throw new AppError('Assigned user not found', 404, 'taskController');
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
        throw new AppError('Patient not found', 404, 'taskController');
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
            role: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
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
      const notificationRecipients = new Set<string>();
      notificationRecipients.add(assignedToId); // a new user is assigned to the task

      // If the task is being reassigned from one user to another
      if (existingTask.assignedToId) {
        notificationRecipients.add(existingTask.assignedToId); // the old user that was assigned
      }

      // Also notify the creator of the task about the change
      if (existingTask.createdById) {
        notificationRecipients.add(existingTask.createdById);
      }

      const notificationTitle = "Task Assignment Updated";
      const notificationBody = `Task "${updatedTask.title}" has been reassigned.`;

      await sendPushNotifications(
        Array.from(notificationRecipients),
        notificationTitle,
        notificationBody,
        { taskId: updatedTask.id },
      );
    }
  },
);

/**
 * Delete task
 * DELETE /api/tasks/:id
 */
export const deleteTask = asyncMiddleware(
  async (req: Request, res: Response) => {
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
      throw new AppError('Task not found', 404, 'taskController');
    }

    // Only allow the creator or admin to delete the task
    if (existingTask.createdById !== userId && req.user?.role !== "ADMIN") {
      throw new AppError('You do not have permission to delete this task', 403, 'taskController');
    }

    // Delete task
    await prisma.task.delete({
      where: { id },
    });

    res.json({ message: "Task deleted successfully" });
  },
);

/**
 * Assign task to a user
 * POST /api/tasks/:id/assign
 */
export const assignTask = asyncMiddleware(
  async (req: Request, res: Response) => {
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
      throw new AppError('Task not found', 404, 'taskController');
    }

    // Only allow the creator or admin to assign the task
    if (existingTask.createdById !== userId && req.user?.role !== "ADMIN") {
      throw new AppError('You do not have permission to assign this task', 403, 'taskController');
    }

    // Verify that the assigned user exists
    const assignedUser = await prisma.user.findUnique({
      where: { id: assignedToId },
    });

    if (!assignedUser) {
      throw new AppError('Assigned user not found', 404, 'taskController');
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
            role: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
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

    //  Trigger Notification 
    const notificationTitle = `Task Assigned: ${existingTask.title}`;
    const notificationBody = `You have been assigned an existing task.`;
    await sendPushNotifications(
      [assignedToId],
      notificationTitle,
      notificationBody,
      { taskId: updatedTask.id },
    );

    res.json({
      message: "Task assigned successfully",
      task: updatedTask,
    });
  },
);

/**
 * Unassign task from a user
 * POST /api/tasks/:id/unassign
 */
export const unassignTask = asyncMiddleware(
  async (req: Request, res: Response) => {
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
      throw new AppError('Task not found', 404, 'taskController');
    }

    // Only allow the creator, admin, or the assigned user to unassign the task
    if (
      existingTask.createdById !== userId &&
      req.user?.role !== "ADMIN" &&
      existingTask.assignedToId !== userId
    ) {
      throw new AppError('You do not have permission to unassign this task', 403, 'taskController');
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
            role: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
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
  },
);

/**
 * Update the Task Status
 */
export const UpdateTaskStatus = asyncMiddleware(
  async (req: Request, res: Response) => {
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
      throw new AppError('Task not found', 404, 'taskController');
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
            role: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
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
    //  Notification  
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

    res.json(updatedTask);
  },
);
/**
 * Mark task as completed
 * POST /api/tasks/:id/complete
 */
export const completeTask = asyncMiddleware(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id;

    // Check if task exists
    const existingTask = await prisma.task.findUnique({
      where: { id },
    });

    if (!existingTask) {
      throw new AppError('Task not found', 404, 'taskController');
    }

    // Only allow the assigned user to mark as completed
    if (existingTask.assignedToId !== userId && req.user?.role !== "ADMIN") {
      throw new AppError('Only the assigned user or an admin can mark this task as completed', 403, 'taskController');
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
            role: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
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
  },
);

/**
 * Get tasks assigned to the current user
 * GET /api/tasks/my-tasks
 */
export const getMyTasks = asyncMiddleware(
  async (req: Request, res: Response) => {
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
            role: true,
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
      ...({
        cacheStrategy: {
          swr: 60,
          ttl: 30,
        },
      } as any),
    });

    res.json(tasks);
  },
);

/**
 * Get tasks created by the current user
 * GET /api/tasks/created-by-me
 */
export const getTasksCreatedByMe = asyncMiddleware(
  async (req: Request, res: Response) => {
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
            role: true,
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
  },
);
