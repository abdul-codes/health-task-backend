import { Request, Response, NextFunction } from "express";
import { asyncMiddleware } from "../middleware/asyncMiddleware";
import { prisma } from "../utils/db";
import bcrypt from "bcryptjs"
import { generateAccessToken, generateRefreshToken } from "../utils/generateJwt";
import crypto from "crypto"
import { UserRole } from "@/generated/prisma";


interface RegisterUserBody {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  role?: UserRole;
}

export const registerUser = asyncMiddleware(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      email,
      firstName,
      lastName,
      password,
      role = 'DOCTOR'
    } = req.body as RegisterUserBody;

    // Check existing user
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with isApproved set to false by default
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: role as UserRole,
        isApproved: false, // Requires admin approval
      },
      select: { 
        id: true, 
        email: true, 
        firstName: true, 
        lastName: true, 
        role: true,
        isApproved: true
      }
    });

    // Find admin emails to notify about new registration
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { email: true }
    });

    // Here you could add code to notify admins about the new registration
    // For example, sending emails to all admin users

    res.status(201).json({ 
      message: 'Registration successful. Your account is pending approval by an administrator.',
      user: newUser
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      message: 'Error registering user',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});


// Login Controller
export const loginUser = asyncMiddleware(async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email },
      include: {
        approvedBy: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (!user) {
      return res.status(400).json({
        message: 'Invalid credentials'
      });
    }

    // Check if account is approved
    if (!user.isApproved) {
      return res.status(403).json({
        message: 'Your account is pending approval by an administrator. Please try again later.'
      });
    }
    
    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        message: 'Invalid credentials'
      });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id);

    // Set refresh token in HttpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
      sameSite: 'strict', // Prevent CSRF
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days (match refresh token expiry if possible)
    });

    // Send response with user details and access token
    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isApproved: user.isApproved,
        approvedBy: user.approvedBy,
        approvedAt: user.approvedAt
      },
      accessToken // Send only access token in the body
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      message: 'Error logging in',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
})

// Logout Controller
export const logoutUser = asyncMiddleware(async (req: Request, res: Response) => {
  try {
    // Clear the refresh token cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    res.json({
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      message: 'Error logging out',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});