import { prisma } from "../server/lib/prisma.js"
import { changeMembership } from "../server/lib/membership.js"

const [email, plan, ...extra] = process.argv.slice(2)
try {
  if (!email || !["FREE", "PAID"].includes(plan) || extra.length) {
    throw new Error("사용법: npm run membership:set -- user@example.com FREE|PAID")
  }
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } })
  if (!user) throw new Error("회원을 찾을 수 없습니다.")
  const result = await changeMembership(prisma, user.id, plan)
  console.log(JSON.stringify({ email: user.email, membership: result }, null, 2))
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
} finally {
  await prisma.$disconnect()
}
