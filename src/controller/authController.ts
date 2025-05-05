import { Request, Response } from "express";
import { asyncMiddleware } from "../middleware/asyncMiddleware";
import { prisma } from "../utils/db";
import bcrypt from "bcryptjs"
import { UserRole } from "../generated/prisma";
import { generateOtp } from "../utils/generateOtp";
import { sendOTP } from "../utils/Mail";
import { generateAccessToken, generateRefreshToken } from "../utils/generateJwt";

const MAX_ATTEMPTS = 5;
const LOCK_TIME = 15 * 60 * 1000; // 15 minutes

interface RegisterUserBody {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: UserRole;
  }

export const registerUser = asyncMiddleware(async (req: Request, res: Response) => {
    try {
      // Validate input
      // const errors = validationResult(req);
      // if (!errors.isEmpty()) {
      //   return res.status(400).json({ errors: errors.array() });
      // }
  
      const {
        email,
        password,
        firstName,
        lastName,
        role = 'USER'
      } = req.body as RegisterUserBody
  
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: {
          email: email
        }
      });
  
      if (existingUser) {
        return res.status(400).json({
          message: 'User with this email already exists'
        });
      }
  
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
  
      const newUser = await prisma.user.create({
  
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          role,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true
        }
      });
  
      // Verify email
      const otp = generateOtp()
      const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  
      await prisma.otpVerification.create({
        data: { otp, expires, userId: newUser.id }
      })
  
      await sendOTP(email, otp)
  
      res.status(201).json({ message: 'OTP sent to email' });
  
  
      // Generate tokens
      // const accessToken = generateAccessToken(newUser.id, newUser.role);
      // const refreshToken = generateRefreshToken(newUser.id);
  
      // res.status(201).json({
      //   message: 'User registered successfully',
      //   user: newUser,
  
      // });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        message: 'Error registering user',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  })

  // Login Controller
export const loginUser = asyncMiddleware(async (req: Request, res: Response) => {
    try {
      // Validate input
      // const errors = validationResult(req);
      // if (!errors.isEmpty()) {
      //   return res.status(400).json({ errors: errors.array() });
      // }
  
      const { email, password } = req.body;
  
  
      // Find user
      const user = await prisma.user.findUnique({
        where: {email: email}
      });
  
      if (!user) {
        return res.status(400).json({
          message: 'Invalid credentials'
        });
      }
  
  // Add before password check
  if (user.loginAttempts >= MAX_ATTEMPTS) {
    return res.status(429).json({ 
      message: 'Account locked. Please reset your password' 
    });
  }
      // Verify password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        // Increment login attempts
        await prisma.user.update({
          where: { id: user.id },
          data: { loginAttempts: { increment: 1 } , lastLogin: new Date()}
        });
  
        return res.status(400).json({
          message: 'Invalid credentials'
        });
      }
  
      if (!user.emailVerified) {
        // Verify email
        return res.status(403).json({ message: "Email Verification required" })
      }
  
  
      // Reset login attempts
      await prisma.user.update({
        where: { id: user.id },
        data: {
          loginAttempts: 0,
          lastLogin: new Date()
        }
      });
  
  
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
          role: user.role
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
      // If using refresh tokens, you might want to invalidate the token here
      // This would typically involve storing invalidated tokens in a blacklist or database
  
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