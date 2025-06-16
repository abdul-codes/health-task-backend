import { Request, Response } from "express";
import { asyncMiddleware } from "../middleware/asyncMiddleware";
import { prisma } from "../utils/db";
import bcrypt from "bcryptjs";
import { UserRole } from "../generated/prisma";

// Get user profile
export const getUserProfile = asyncMiddleware(async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
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
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("Get user profile error:", error);
    res.status(500).json({
      message: "Error fetching user profile",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Update user profile
export const updateUserProfile = asyncMiddleware(async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const {
      firstName,
      lastName,
      department,
      profilePicture,
      phoneNumber,
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !department) {
      return res.status(400).json({
        message: "First name, last name, and department are required",
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName,
        lastName,
        department,
        profilePicture,
        phoneNumber,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        department: true,
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
  } catch (error) {
    console.error("Update user profile error:", error);
    res.status(500).json({
      message: "Error updating user profile",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Update user password
export const updateUserPassword = asyncMiddleware(async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
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
      return res.status(404).json({ message: "User not found" });
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
  } catch (error) {
    console.error("Update password error:", error);
    res.status(500).json({
      message: "Error updating password",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Delete user account
export const deleteUserAccount = asyncMiddleware(async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
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
  } catch (error) {
    console.error("Delete account error:", error);
    res.status(500).json({
      message: "Error deleting account",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Get pending user registrations (Admin only)
export const getPendingUsers = asyncMiddleware(async (req: Request, res: Response) => {
  try {
    const adminId = req.user?.id;
    const adminRole = req.user?.role;

    if (!adminId || adminRole !== UserRole.ADMIN) {
      return res.status(403).json({ message: "Forbidden: Admin access required" });
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
  } catch (error) {
    console.error("Get pending users error:", error);
    res.status(500).json({
      message: "Error fetching pending users",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Approve a user registration (Admin only)
export const approveUser = asyncMiddleware(async (req: Request, res: Response) => {
  try {
    const adminId = req.user?.id;
    const adminRole = req.user?.role;
    const { userId } = req.params;

    if (!adminId || adminRole !== UserRole.ADMIN) {
      return res.status(403).json({ message: "Forbidden: Admin access required" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
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

    // Here you could add code to notify the user that their account was approved
    // For example, sending an email to the user

    res.json({
      message: "User approved successfully",
      user: updatedUser
    });
  } catch (error) {
    console.error("Approve user error:", error);
    res.status(500).json({
      message: "Error approving user",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Reject a user registration (Admin only)
export const rejectUser = asyncMiddleware(async (req: Request, res: Response) => {
  try {
    const adminId = req.user?.id;
    const adminRole = req.user?.role;
    const { userId } = req.params;
    const { reason } = req.body;

    if (!adminId || adminRole !== UserRole.ADMIN) {
      return res.status(403).json({ message: "Forbidden: Admin access required" });
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
      return res.status(404).json({ message: "User not found" });
    }

    // Delete the user and all related data
    await prisma.$transaction([
      prisma.user.delete({ where: { id: userId } })
    ]);

    // Here you could add code to notify the user that their registration was rejected
    // For example, sending an email with the rejection reason

    res.json({
      message: "User registration rejected",
      user: {
        id: user.id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`
      },
      reason: reason || "No reason provided"
    });
  } catch (error) {
    console.error("Reject user error:", error);
    res.status(500).json({
      message: "Error rejecting user",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});
