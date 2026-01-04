import { Request, Response } from "express";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/generateJwt";
import jwt from "jsonwebtoken";
import { prisma } from "../utils/db";
import { asyncMiddleware } from "../middleware/asyncMiddleware";
import { AppError } from "../utils/AppError";

const REFRESH_TOKEN = process.env.REFRESH_TOKEN_SECRET as string;

export const refreshToken = asyncMiddleware(async (req: Request, res: Response) => {
  const {refreshToken} = req.body;

  if (!refreshToken) {
    throw new AppError('Refresh token not found in body', 401, 'jwtController');
  }

  // Verify refresh token
  const decoded = jwt.verify(refreshToken, REFRESH_TOKEN) as { id: string };

  // Find user
  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
    select: {id: true, role: true}
  });

  if (!user) {
    throw new AppError('Invalid refresh token', 401, 'jwtController');
  }

  // Generate new tokens
  const newAccessToken = generateAccessToken(user.id, user.role);
  const newRefreshToken = generateRefreshToken(user.id);

  // Send only new access token in response body
  res.json({
    message: "Token refreshed successfully",
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  });
});
