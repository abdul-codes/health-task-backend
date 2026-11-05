import { Request } from "express";
import rateLimit from "express-rate-limit";

// Only the auth routes are rate limited. A whole ward often shares one public IP
// behind the hospital NAT, so an app-wide per-IP limit would lock out everyone at once.
// Note: the default store is in memory, so on Vercel each serverless instance counts separately.

const ip = (req: Request): string => req.ip ?? "unknown";

// Login: limit attempts per account (plus IP) so one person's typos don't block colleagues
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Too many login attempts. Please try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = typeof req.body?.email === "string" ? req.body.email.toLowerCase() : "";
    return `${ip(req)}:${email}`;
  },
});

export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { message: "Too many sign-up attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: ip,
});

// Refresh is called by every device on a ward, so allow plenty per IP
export const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { message: "Too many requests. Please try again shortly." },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: ip,
});
