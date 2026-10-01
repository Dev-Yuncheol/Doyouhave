export const EVENT_FIELDS = {
  page_viewed: ["page_name", "is_logged_in"],
  signup_cta_clicked: ["cta_location"],
  signup_completed: ["auth_method"],
  login_completed: ["auth_method"],
  want_form_viewed: ["entry_point"],
  want_created: ["want_id", "category"],
  comparison_viewed: ["want_id", "similar_count", "own_count"],
  own_created: ["category", "entry_point"],
  decision_recorded: ["want_id", "decision", "similar_count"],
  action_failed: ["action", "error_code"],
}

const UTM_FIELDS = ["source", "medium", "campaign", "content", "term"]
const CAMPAIGN_VALUE = /^[a-zA-Z0-9_-]{1,80}$/
const safe = (fn) => { try { return fn() } catch { return undefined } }
const read = (storage, key) => safe(() => JSON.parse(storage.getItem(key)))
const write = (storage, key, value) => safe(() => storage.setItem(key, JSON.stringify(value)))

export function readCampaign(href) {
  const url = new URL(href)
  return Object.fromEntries(UTM_FIELDS.flatMap((field) => {
    const value = url.searchParams.get(`utm_${field}`)
    return value && CAMPAIGN_VALUE.test(value) ? [[`utm_${field}`, value]] : []
  }))
}

export function pageName(path, loggedIn) {
  if (path === "/") return loggedIn ? "home" : "landing"
  if (path === "/v1") return "landing_v1"
  if (path === "/login") return loggedIn ? null : "login"
  if (path === "/wants/new") return "want_form"
  if (/^\/wants\/[^/]+$/.test(path)) return "want_detail"
  if (path === "/owns") return "owns"
  return null // OAuth codes and unknown URLs must never enter analytics.
}

export function createAnalytics({ enabled = false, debug = false, environment = "development",
  local, session, href = () => "http://localhost/", now = Date.now,
  uuid = () => crypto.randomUUID(), send = () => {}, identify = () => {}, reset = () => {},
  inspect = () => {} } = {}) {
  let currentUser = null
  let first = read(local, "inni_analytics_first:v1")
  let visit = read(session, "inni_analytics_visit:v1")
  let previousAccount = read(local, "inni_analytics_account:v1")
  const storedSeen = read(session, "inni_analytics_seen:v1")
  const seen = new Set(Array.isArray(storedSeen) ? storedSeen : [])
  const active = enabled || debug

  function attribution() {
    const timestamp = now()
    const campaign = readCampaign(href())
    // A new explicit campaign starts a new attribution visit; internal navigation
    // and OAuth returns retain it. An inactive visit expires after 30 minutes.
    if (!visit || timestamp - visit.last > 30 * 60 * 1000 ||
      (Object.keys(campaign).length && JSON.stringify(campaign) !== JSON.stringify(visit.campaign))) {
      visit = { campaign: Object.keys(campaign).length ? campaign : { utm_source: "direct", utm_medium: "none" }, last: timestamp }
    }
    visit.last = timestamp
    first ??= visit.campaign
    write(local, "inni_analytics_first:v1", first)
    write(session, "inni_analytics_visit:v1", visit)
    return { ...visit.campaign, ...Object.fromEntries(Object.entries(first).map(([k, v]) => [`first_${k}`, v])) }
  }

  function setUser(user) {
    if (!active) return
    safe(() => {
      const next = user?.id || null
      if ((previousAccount && previousAccount !== next) || (currentUser && currentUser !== next)) {
        safe(reset)
        first = null
        visit = null
        write(local, "inni_analytics_first:v1", null)
        write(session, "inni_analytics_visit:v1", null)
        seen.clear()
        write(session, "inni_analytics_seen:v1", [])
      }
      currentUser = next
      previousAccount = next
      write(local, "inni_analytics_account:v1", next)
      if (next) safe(() => identify(next, { membership_plan: user.membership?.plan || user.membershipPlan || "FREE" }, attribution()))
    })
  }

  function track(name, fields = {}, dedupeKey, expectedUser) {
    if (!active || !Object.hasOwn(EVENT_FIELDS, name) || (expectedUser && expectedUser !== currentUser)) return
    safe(() => {
      const key = dedupeKey ? `${currentUser || "anonymous"}:${name}:${dedupeKey}` : null
      if (key && seen.has(key)) return
      const properties = Object.fromEntries(EVENT_FIELDS[name].flatMap((field) => {
        const value = fields[field]
        return typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value)) ||
          (typeof value === "string" && value.length <= 100) ? [[field, value]] : []
      }))
      const event = { name, id: uuid(), userId: currentUser, timestamp: now(),
        properties: { ...properties, ...attribution(), environment, schema_version: 1 } }
      if (key) {
        seen.add(key)
        if (seen.size > 500) seen.delete(seen.values().next().value)
        write(session, "inni_analytics_seen:v1", [...seen])
      }
      if (debug) safe(() => inspect(event))
      if (enabled) safe(() => send(event))
    })
  }
  return { track, setUser }
}
