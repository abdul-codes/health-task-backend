import { Request, Response } from "express";
import { asyncMiddleware } from "../middleware/asyncMiddleware";
import { prisma } from "../utils/db";
import bcrypt from "bcryptjs";
import { UserRole } from "../generated/prisma";
import { AppError } from "../utils/AppError";
// Get user profile
export const getUserProfile = asyncMiddleware(async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError('Unauthorized', 401, 'userController');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        department: true,
        profilePicture: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      ...( {cacheStrategy: {
        swr: 60,
        ttl: 30,
      } }as any)
    });

    if (!user) {
      throw new AppError('User not found', 404, 'userController');
    }

    res.json(user);
})
// Update user profile
export const updateUserProfile = asyncMiddleware(async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError('Unauthorized', 401, 'userController');
  }

  const {
    firstName,
    lastName,
   // department,
    profilePicture,
  //  phoneNumber,
  } = req.body;

  // Validate required fields
  if (!firstName || !lastName ) { // || !department
    return res.status(400).json({
      message: "First name, last name, are required",
    });
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      firstName,
      lastName,
   //   department,
      profilePicture,
   //   phoneNumber,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
   //   department: true,
      profilePicture: true,
      phoneNumber: true,
      role: true,
      updatedAt: true,
    },
  });

  res.json({
    message: "Profile updated successfully",
    user: updatedUser,
  });
});

// Update user password
export const updateUserPassword = asyncMiddleware(async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError('Unauthorized', 401, 'userController');
  }

  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      message: "Current password and new password are required",
    });
  }

  // Get user with current password
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { password: true },
  });

  if (!user) {
    throw new AppError('User not found', 404, 'userController');
  }

  // Verify current password
  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    return res.status(400).json({ message: "Current password is incorrect" });
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Update password
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });

  res.json({ message: "Password updated successfully" });
});

// Delete user account
export const deleteUserAccount = asyncMiddleware(async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError('Unauthorized', 401, 'userController');
  }

  // Delete user and all related data in a transaction
  await prisma.$transaction([
    // Finally delete the user
    prisma.user.delete({ where: { id: userId } }),
  ]);

  // Clear any existing cookies
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  res.json({ message: "Account deleted successfully" });
});

// Get pending user registrations (Admin only)
export const getPendingUsers = asyncMiddleware(async (req: Request, res: Response) => {
  const adminId = req.user?.id;
  const adminRole = req.user?.role;

  if (!adminId || adminRole !== UserRole.ADMIN) {
    throw new AppError('Forbidden: Admin access required', 403, 'userController');
  }

  const pendingUsers = await prisma.user.findMany({
    where: { 
      isApproved: false 
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      createdAt: true,
      department: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  res.json({
    count: pendingUsers.length,
    users: pendingUsers
  });
});

// Approve a user registration (Admin only)
export const approveUser = asyncMiddleware(async (req: Request, res: Response) => {
  const adminId = req.user?.id;
  const adminRole = req.user?.role;
  const { userId } = req.params;

  if (!adminId || adminRole !== UserRole.ADMIN) {
    throw new AppError('Forbidden: Admin access required', 403, 'userController');
  }

  const user = await prisma.user.findUnique({
    where: { id: userId }
});

  if (!user) {
    throw new AppError('User not found', 404, 'userController');
  }

  if (user.isApproved) {
    return res.status(400).json({ message: "User is already approved" });
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      isApproved: true,
      approvedById: adminId,
      approvedAt: new Date()
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isApproved: true,
      approvedAt: true
    }
  });

  // Here you could add code to notify user that their account was approved
  // For example, sending an email to user

  res.json({
    message: "User approved successfully",
    user: updatedUser
  });
});

// Reject a user registration (Admin only)
export const rejectUser = asyncMiddleware(async (req: Request, res: Response) => {
  const adminId = req.user?.id;
  const adminRole = req.user?.role;
  const { userId } = req.params;
  const { reason } = req.body;

  if (!adminId || adminRole !== UserRole.ADMIN) {
    throw new AppError('Forbidden: Admin access required', 403, 'userController');
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true
    }
  });

  if (!user) {
    throw new AppError('User not found', 404, 'userController');
  }

  // Delete the user and all related data
  await prisma.$transaction([
    prisma.user.delete({ where: { id: userId } })
  ]);

  // Here you could add code to notify user that their registration was rejected
  // For example, sending an email with rejection reason

  res.json({
    message: "User registration rejected",
    user: {
      id: user.id,
      email: user.email,
      name: `${user.firstName} ${user.lastName}`
    },
    reason: reason || "No reason provided"
  });
});


// Get all users (Admin only)
export const getAllUsers = asyncMiddleware(async (req: Request, res: Response) => {
    // const adminId = req.user?.id;
    // const adminRole = req.user?.role;

    // if (!adminId || adminRole !== UserRole.ADMIN) {
    //   throw new AppError('Forbidden: Admin access required', 403, 'userController');
    // }

    // Get query parameters for filtering and pagination
    const { 
      page = 1, 
      limit = 10, 
      role, 
      department, 
      isApproved, 
      search 
    } = req.query;

    const pageNumber = parseInt(page as string);
    const limitNumber = parseInt(limit as string);
    const skip = (pageNumber - 1) * limitNumber;

    // Build where clause for filtering
    const where: any = {};

    if (role) {
      where.role = role;
    }

    if (department) {
      where.department = {
        contains: department as string,
        mode: 'insensitive'
      };
    }

    if (isApproved !== undefined) {
      where.isApproved = isApproved === 'true';
    }

    if (search) {
      where.OR = [
        {
          email: {
            contains: search as string,
            mode: 'insensitive'
          }
        },
        {
          firstName: {
            contains: search as string,
            mode: 'insensitive'
          }
        },
        {
          lastName: {
            contains: search as string,
            mode: 'insensitive'
          }
        }
      ];
    }

    // Get total count for pagination
    const totalUsers = await prisma.user.count({ where });

    // Get users with pagination
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        department: true,
        profilePicture: true,
        phoneNumber: true,
        role: true,
      //  isApproved: true,
        createdAt: true,
        updatedAt: true,
        // approvedAt: true,
        // approvedById: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limitNumber
    });

    const totalPages = Math.ceil(totalUsers / limitNumber);

    res.json({
      users,
      pagination: {
        currentPage: pageNumber,
        totalPages,
        totalUsers,
        limit: limitNumber,
        hasNextPage: pageNumber < totalPages,
        hasPrevPage: pageNumber > 1
      }
    });
  });


// Get users for selection dropdowns (supports search)
export const getUsersForSelection = asyncMiddleware(async (req: Request, res: Response) => {
  const { search } = req.query;

  const where: any = {
    // You might want a default filter, e.g., only show approved users
    isApproved: true 
  };

  // If a search term is provided, filter users by it
  if (search) {
    where.OR = [
      {
        firstName: {
          contains: search as string,
          mode: 'insensitive' // Case-insensitive search
        }
      },
      {
        lastName: {
          contains: search as string,
          mode: 'insensitive'
        }
      },
      {
        email: {
          contains: search as string,
          mode: 'insensitive'
        }
      }
    ];
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
    orderBy: {
      firstName: 'asc' // Sort alphabetically for a better user experience
    },
    take: 50 // Optional: Limit results to prevent excessively large responses
  });

  // To make it even easier for the mobile app, you can format the name here
  const formattedUsers = users.map(user => ({
    id: user.id,
    name: `${user.firstName} ${user.lastName}`
  }));

  res.json(formattedUsers);
});

// Simple endpoint for dropdown users
export const getUsersForDropdown = asyncMiddleware(async (req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    // where: {
    //   isApproved: true // Only approved users
    // },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
      // Optionally include email or department if needed for display
    },
    orderBy: {
      firstName: 'asc'
    },
    ...( {cacheStrategy: {
      swr: 60,
      ttl: 30,
    } }as any)
  });

  // Format for dropdown (id, display name)
  const dropdownUsers = users.map(user => ({
    id: user.id,
    name: `${user.firstName} ${user.lastName}`
  }));

  //res.json({ users: dropdownUsers });
  res.json(users)
});

// Add at the end of the file

export const setPushToken = asyncMiddleware(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { token } = req.body;

  if (!userId) {
    throw new AppError('Authentication required', 401, 'userController');
  }

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ message: "A valid push token must be provided." });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { expoPushToken: token },
  });

  res.status(200).json({ message: "Push token saved successfully." });
});

// Get user statistics
export const getUserStatistics = asyncMiddleware(async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError('Unauthorized', 401, 'userController');
  }

  // Get all tasks and patients data in parallel for efficiency
  const [tasks, patients] = await Promise.all([
    prisma.task.findMany({
      where: {
        OR: [
          { createdById: userId },
          { assignedToId: userId }
        ]
      },
      select: {
        id: true,
        status: true,
        createdById: true,
        assignedToId: true,
      }
    }),
    prisma.patient.findMany({
      where: {
        createdById: userId
      },
      select: {
        id: true,
      }
    })
  ]);

  // Calculate statistics
  const stats = {
    tasksCreated: tasks.filter(task => task.createdById === userId).length,
    tasksAssigned: tasks.filter(task => task.assignedToId === userId).length,
    tasksCompleted: tasks.filter(task => 
      task.status === 'COMPLETED' && 
      (task.createdById === userId || task.assignedToId === userId)
    ).length,
    patientsAssigned: patients.length, // For now, this is patients created by user
  };

  res.json(stats);
});
