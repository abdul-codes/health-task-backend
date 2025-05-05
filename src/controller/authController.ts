import { Request, Response } from "express";
import { asyncMiddleware } from "../middleware/asyncMiddleware";
import { prisma } from "../utils/db";
import bcrypt from "bcryptjs"
import { UserRole } from "../generated/prisma";
import { generateUniqueAccountId } from "../utils/generateAccountId";
import { generateOtp } from "../utils/generateOtp";
import { sendOTP } from "../utils/Mail";

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
      const userAccountId = await generateUniqueAccountId()
  
      const newUser = await prisma.user.create({
  
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          role,
          userAccountId
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