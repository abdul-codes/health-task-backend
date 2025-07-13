import { Request, Response } from "express";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/generateJwt";
import jwt from "jsonwebtoken";
import { prisma } from "../utils/db";

const REFRESH_TOKEN = process.env.REFRESH_TOKEN_SECRET as string;

export const refreshToken = async (req: Request, res: Response) => {
  try {
    // Read refreshToken from the request body
    const {refreshToken} = req.body;

    if (!refreshToken) {
      res.status(401).json({
        message: "Refresh token not found in body",
      });
      return;
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, REFRESH_TOKEN) as { id: string };

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select:{id: true, role: true}
    });

    if (!user) {
      res.status(401).json({
        message: "Invalid refresh token",
      });
      return;
    }

    // Generate new tokens
    const newAccessToken = generateAccessToken(user.id, user.role);
    const newRefreshToken = generateRefreshToken(user.id);

    // Send only the new access token in the response body
    res.json({
      message: "Token refreshed successfully",
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    console.error("Token refresh error:", error);
    res.status(401).json({
      message: "Invalid or expired refresh token",
    });
  }
};
