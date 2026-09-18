import { prisma } from "../server/lib/prisma.js"
import { cleanupExpiredBatch } from "../server/lib/cleanup.js"

// Drain all batches; the protected Vercel cron processes one bounded batch.
try {
  let result
  do {
    result = await cleanupExpiredBatch(prisma)
    console.log(JSON.stringify(result))
  } while (result.hasMore)
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
} finally {
  await prisma.$disconnect()
}
