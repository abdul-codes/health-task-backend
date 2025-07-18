// export const prisma = new PrismaClient()
// // use `prisma` in your application to read and write data in your DB

import { withAccelerate } from "@prisma/extension-accelerate"
import { PrismaClient } from "../generated/prisma"


const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma || new PrismaClient().$extends(withAccelerate())

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma