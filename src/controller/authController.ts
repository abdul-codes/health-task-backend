import { Request, Response } from "express";
import { asyncMiddleware } from "../middleware/asyncMiddleware";
import { prisma } from "../utils/db";
import bcrypt from "bcryptjs"
import { generateAccessToken, generateRefreshToken } from "../utils/generateJwt";
import crypto from "crypto"
import { UserRole } from "@/generated/prisma";
import { AppError } from "../utils/AppError";


export const getMe = asyncMiddleware(async (req: Request, res: Response) => {

  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
     // isApproved: true,
    }
  });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  res.status(200).json(user);
});



interface RegisterUserBody {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  role?: UserRole;
}



export const registerUser = asyncMiddleware(async (req: Request, res: Response) => {
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

  //notify admins about the new registration
  // sending emails to all admin users

  res.status(201).json({ 
    message: 'Registration successful. Your account is pending approval by an administrator.',
    user: newUser
  });
});


// Login Controller
export const loginUser = asyncMiddleware(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  // Find user
  const user = await prisma.user.findUnique({
    where: { email: email },
  });

  if (!user) {
    return res.status(400).json({
      message: 'Invalid credentials'
    });
  }

  // Check if account is approved
  // if (!user.isApproved) {
  //   return res.status(403).json({
  //     message: 'Your account is pending approval by an administrator. Please try again later.'
  //   });
  // }
  
  // Verify password
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(400).json({
      message: 'Invalid credentials'
    });
  }

  // Generate tokens
  const accessToken = generateAccessToken(user.id, user.role);
  const refreshToken = generateRefreshToken(user.id)

  res.json({
    message: 'Login successful',
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      // isApproved: user.isApproved,
      // approvedBy: user.approvedBy,
      // approvedAt: user.approvedAt
    },
    accessToken: accessToken, // Send only access token in the body
    refreshToken: refreshToken
  });
})

// Logout Controller
export const logoutUser = asyncMiddleware(async (req: Request, res: Response) => {
  // Clear the refresh token cookie
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });

  res.json({
    message: 'Logout successful'
  });
});