const KEYS = {
  users: "inni_users",
  session: "inni_session",
  wants: "inni_wants",
  owns: "inni_owns",
}

export { KEYS }

export function readList(key) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function writeList(key, list) {
  try {
    localStorage.setItem(key, JSON.stringify(list))
  } catch {
    throw new Error("SAVE_FAILED")
  }
}

export function readJson(key) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function writeJson(key, value) {
  try {
    if (value == null) {
      localStorage.removeItem(key)
      return
    }
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    throw new Error("SAVE_FAILED")
  }
}

export function getUsers() {
  return readList(KEYS.users)
}

export function saveUsers(users) {
  writeList(KEYS.users, users)
}

export function getSession() {
  const session = readJson(KEYS.session)
  if (!session?.userId) return null
  return session
}

export function saveSession(session) {
  writeJson(KEYS.session, session)
}

export function getWants({ userId, status, category } = {}) {
  return readList(KEYS.wants)
    .filter((want) => !userId || want.userId === userId)
    .filter((want) => !status || want.status === status)
    .filter((want) => !category || want.category === category)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function getWant(id, userId) {
  return getWants({ userId }).find((want) => want.id === id) ?? null
}

export function createWant(payload) {
  const wants = readList(KEYS.wants)
  const now = new Date().toISOString()
  const want = {
    id: crypto.randomUUID(),
    userId: payload.userId,
    title: payload.title.trim(),
    url: payload.url?.trim() || undefined,
    category: payload.category,
    categoryDetail:
      payload.category === "etc"
        ? payload.categoryDetail?.trim() || undefined
        : undefined,
    color: payload.color,
    colorDetail:
      payload.color === "other" ? payload.colorDetail?.trim() || undefined : undefined,
    price: payload.price,
    note: payload.note?.trim() || undefined,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  }
  writeList(KEYS.wants, [want, ...wants])
  return want
}

export function updateWant(id, payload, userId) {
  const wants = readList(KEYS.wants)
  const index = wants.findIndex(
    (want) => want.id === id && (!userId || want.userId === userId),
  )
  if (index < 0) throw new Error("NOT_FOUND")
  const next = {
    ...wants[index],
    ...payload,
    updatedAt: new Date().toISOString(),
  }
  wants[index] = next
  writeList(KEYS.wants, wants)
  return next
}

export function deleteWant(id, userId) {
  const wants = readList(KEYS.wants)
  const next = wants.filter(
    (want) => !(want.id === id && (!userId || want.userId === userId)),
  )
  if (next.length === wants.length) throw new Error("NOT_FOUND")
  writeList(KEYS.wants, next)
}

export function getOwns({ userId, category, color } = {}) {
  return readList(KEYS.owns)
    .filter((own) => !userId || own.userId === userId)
    .filter((own) => !category || own.category === category)
    .filter((own) => !color || own.color === color)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function createOwn(payload) {
  const owns = readList(KEYS.owns)
  const own = {
    id: crypto.randomUUID(),
    userId: payload.userId,
    title: payload.title.trim(),
    category: payload.category,
    categoryDetail:
      payload.category === "etc"
        ? payload.categoryDetail?.trim() || undefined
        : undefined,
    color: payload.color,
    colorDetail:
      payload.color === "other" ? payload.colorDetail?.trim() || undefined : undefined,
    source: payload.source,
    fromWantId: payload.fromWantId,
    createdAt: new Date().toISOString(),
  }
  writeList(KEYS.owns, [own, ...owns])
  return own
}

export function updateOwn(id, payload, userId) {
  const owns = readList(KEYS.owns)
  const index = owns.findIndex(
    (own) => own.id === id && (!userId || own.userId === userId),
  )
  if (index < 0) throw new Error("NOT_FOUND")
  const color = payload.color ?? owns[index].color
  const category = payload.category ?? owns[index].category
  const next = {
    ...owns[index],
    title: payload.title.trim(),
    category,
    categoryDetail:
      category === "etc"
        ? payload.categoryDetail?.trim() || undefined
        : undefined,
    color,
    colorDetail:
      color === "other" ? payload.colorDetail?.trim() || undefined : undefined,
  }
  owns[index] = next
  writeList(KEYS.owns, owns)
  return next
}

export function deleteOwn(id, userId) {
  const owns = readList(KEYS.owns)
  const next = owns.filter(
    (own) => !(own.id === id && (!userId || own.userId === userId)),
  )
  if (next.length === owns.length) throw new Error("NOT_FOUND")
  writeList(KEYS.owns, next)
}
