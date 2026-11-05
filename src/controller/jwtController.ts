import { Request, Response } from "express";
import { generateAccessToken } from "../utils/generateJwt";
import { rotateRefreshToken } from "../utils/refreshToken";
import { prisma } from "../utils/db";

export const refreshToken = async (req: Request, res: Response) => {
  try {
    // Read refreshToken from the request body
    const { refreshToken } = req.body;

    if (typeof refreshToken !== "string" || !refreshToken) {
      res.status(401).json({
        message: "Refresh token not found in body",
      });
      return;
    }

    // Validate, revoke the old token and issue a new one
    const result = await rotateRefreshToken(refreshToken);
    if (!result.ok) {
      res.status(401).json({
        message: "Invalid or expired refresh token",
      });
      return;
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: result.userId },
      select: { id: true, role: true, isApproved: true },
    });

    if (!user || !user.isApproved) {
      res.status(401).json({
        message: "Invalid refresh token",
      });
      return;
    }

    res.json({
      message: "Token refreshed successfully",
      accessToken: generateAccessToken(user.id, user.role),
      refreshToken: result.refreshToken,
    });
  } catch (error) {
    console.error("Token refresh error:", error);
    res.status(500).json({
      message: "Could not refresh session",
    });
  }
};
