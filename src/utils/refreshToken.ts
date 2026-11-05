import crypto from "crypto";
import { prisma } from "./db";

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// If a client sends a token that was rotated within this window, assume the
// response carrying the new token was lost on a bad connection and let the
// client retry, instead of treating it as token theft and signing them out.
const ROTATION_GRACE_MS = 2 * 60 * 1000;

const hashToken = (token: string): string =>
  crypto.createHash("sha256").update(token).digest("hex");

// Refresh tokens are opaque random strings; the server keeps only their hash
const createRefreshToken = async (userId: string): Promise<{ id: string; token: string }> => {
  const token = crypto.randomBytes(48).toString("base64url");
  const { id } = await prisma.refreshToken.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    },
    select: { id: true },
  });
  return { id, token };
};

export const issueRefreshToken = async (userId: string): Promise<string> =>
  (await createRefreshToken(userId)).token;

type RotateResult =
  | { ok: true; userId: string; refreshToken: string }
  | { ok: false };

export const rotateRefreshToken = async (token: string): Promise<RotateResult> => {
  const existing = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });

  if (!existing || existing.expiresAt < new Date()) {
    return { ok: false };
  }

  if (existing.revokedAt) {
    const withinGrace =
      existing.replacedById !== null &&
      Date.now() - existing.revokedAt.getTime() < ROTATION_GRACE_MS;

    if (!withinGrace) {
      // A revoked token was reused well after rotation: possible theft, so end every session
      await revokeAllRefreshTokens(existing.userId);
      return { ok: false };
    }
  }

  const replacement = await createRefreshToken(existing.userId);
  if (!existing.revokedAt) {
    await prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date(), replacedById: replacement.id },
    });
  }

  return { ok: true, userId: existing.userId, refreshToken: replacement.token };
};

export const revokeRefreshToken = async (token: string): Promise<void> => {
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashToken(token), revokedAt: null },
    data: { revokedAt: new Date() },
  });
};

export const revokeAllRefreshTokens = async (userId: string): Promise<void> => {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
};
