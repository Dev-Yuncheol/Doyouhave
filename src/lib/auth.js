import {
  getSession as readSession,
  getUsers,
  saveSession,
  saveUsers,
} from "./storage"

export function getSession() {
  return readSession()
}

export function signUp({ email, password }) {
  const normalized = email.trim().toLowerCase()
  const users = getUsers()
  if (users.some((user) => user.email === normalized)) {
    throw new Error("EMAIL_TAKEN")
  }
  const user = {
    id: crypto.randomUUID(),
    email: normalized,
    password,
    createdAt: new Date().toISOString(),
  }
  saveUsers([...users, user])
  const session = { userId: user.id }
  saveSession(session)
  return session
}

export function login({ email, password }) {
  const normalized = email.trim().toLowerCase()
  const user = getUsers().find(
    (item) => item.email === normalized && item.password === password,
  )
  if (!user) throw new Error("INVALID_CREDENTIALS")
  const session = { userId: user.id }
  saveSession(session)
  return session
}

export function logout() {
  saveSession(null)
}
