import { PrismaClient } from "@prisma/client"

const globalDatabase = globalThis

export const prisma = globalDatabase.__inniPrisma ?? new PrismaClient()

if (process.env.NODE_ENV !== "production") {
  globalDatabase.__inniPrisma = prisma
}
