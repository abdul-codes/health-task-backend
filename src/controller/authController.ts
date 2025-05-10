import { Request, Response, NextFunction } from "express";
import { asyncMiddleware } from "../middleware/asyncMiddleware";
import { prisma } from "../utils/db";
import bcrypt from "bcryptjs"
import { generatePasswordResetToken } from "../utils/generateOtp";
import { sendOTP } from "../utils/Mail";
import { generateAccessToken, generateRefreshToken } from "../utils/generateJwt";
import crypto from "crypto"
import { UserRole } from "@/generated/prisma";

const MAX_ATTEMPTS = 5;

interface RegisterUserBody {
  email: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
}

export const registerUser = asyncMiddleware(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      email,
      firstName,
      lastName,
      role = 'USER'
    } = req.body as RegisterUserBody;

    // Check existing user
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Generate temporary password
    const tempPassword = crypto.randomBytes(10).toString('hex');
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Generate verification token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const sha256Hash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const bcryptHash = await bcrypt.hash(rawToken, 10);
    const tokenExpires = new Date(Date.now() + 3600000); // 1 hour

    // Create user and token in transaction
    const [newUser] = await prisma.$transaction([
      prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          role: role as UserRole,
        },
        select: { id: true, email: true, firstName: true, lastName: true, role: true }
      }),
      prisma.loginToken.create({
        data: {
          tokenHashSHA256: sha256Hash,
          tokenHashBcrypt: bcryptHash,
          expiresAt: tokenExpires,
          user: { connect: { email } } // Assuming email is unique
        }
      })
    ]);

    try {
      // Send the RAW token to user (not the hashed one)
      await sendOTP(email, rawToken);
    } catch (error) {
      // Rollback user and token if email fails
      await prisma.$transaction([
        prisma.user.delete({ where: { id: newUser.id } }),
        prisma.loginToken.deleteMany({ where: { userId: newUser.id } })
      ]);
      return res.status(500).json({ message: 'Email could not be sent' });
    }

    res.status(201).json({ message: 'User registered successfully. Verification email sent.' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      message: 'Error registering user',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Initial login with temporary token
export const initialLogin = async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(404).json({ message: "Details not found" });
    }

    // Hash token from parameters
    const lookupHash = crypto.createHash('sha256')
      .update(token)
      .digest('hex');

    const tokenRecord = await prisma.loginToken.findFirst({
      where: {
        tokenHashSHA256: lookupHash,
        expiresAt: { gte: new Date() },
        used: false
      }
    });

    // Step 3: Validate with bcrypt
    if (tokenRecord && await bcrypt.compare(token, tokenRecord.tokenHashBcrypt)) {
      // Transaction for critical updates
      const [updatedUser] = await prisma.$transaction([
        prisma.user.update({
          where: { id: tokenRecord.userId },
          data: {
            password: await bcrypt.hash(password, 10), // Auto-salt the new password
            emailVerified: new Date() // Mark email as verified
          }
        }),
        prisma.loginToken.update({
          where: { id: tokenRecord.id },
          data: { used: true } // Prevent token reuse
        })
      ]);

      // Generate fresh tokens
      const accessToken = generateAccessToken(updatedUser.id, updatedUser.role);
      const refreshToken = generateRefreshToken(updatedUser.id);

      // Secure cookie setup
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/auth/refresh' // Limit to refresh endpoint
      });

      // Return response without sensitive data
      return res.status(200).json({
        message: 'Password set successfully',
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          role: updatedUser.role
        },
        accessToken
      });
    } else {
      // Security: Generic error message to prevent enumeration
      return res.status(401).json({
        message: 'Invalid or expired token'
      }); // Valid token
    }

  } catch (error) {
    console.error('Update Login Details error:', error);
    res.status(500).json({
      message: 'Error Updating Login Details user',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

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
      where: { email: email }
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
        data: { loginAttempts: { increment: 1 }, lastLogin: new Date() }
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