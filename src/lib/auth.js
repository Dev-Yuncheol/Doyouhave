import { apiRequest } from "./api"

export function signUp(credentials) {
  return apiRequest("/auth/signup", {
    method: "POST",
    body: credentials,
    auth: false,
  })
}

export function login(credentials) {
  return apiRequest("/auth/login", {
    method: "POST",
    body: credentials,
    auth: false,
  })
}

export function getMe(signal) {
  return apiRequest("/auth/me", { signal })
}
