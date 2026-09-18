import { membership } from "./membership.js"

export const publicUserSelect = {
  id: true,
  email: true,
  createdAt: true,
  updatedAt: true,
  plan: true,
  trialSaveCount: true,
}

export function serializeUser(user) {
  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    membership: membership(user),
  }
}
