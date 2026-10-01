import * as amplitude from "@amplitude/analytics-browser"
import { createAnalytics, pageName } from "./analytics-core"

const env = import.meta.env
const enabled = env.VITE_ANALYTICS_ENABLED === "true"
const debug = env.VITE_ANALYTICS_DEBUG === "true"
const apiKey = env.VITE_AMPLITUDE_API_KEY
const gaId = /^G-[A-Z0-9]+$/.test(env.VITE_GA4_MEASUREMENT_ID || "") ? env.VITE_GA4_MEASUREMENT_ID : null
const gtmId = /^GTM-[A-Z0-9]+$/.test(env.VITE_GTM_CONTAINER_ID || "") ? env.VITE_GTM_CONTAINER_ID : null
let initialized = false
const safe = (fn) => { try { const result = fn(); result?.promise?.catch(() => {}); return result } catch { return undefined } }
const storage = (name) => safe(() => window[name])
const push = (value) => { window.dataLayer ??= []; window.dataLayer.push(value) }
function gtag() { push(arguments) }
function script(src) {
  const element = document.createElement("script")
  element.async = true
  element.src = src
  document.head.appendChild(element)
}
function init() {
  if (initialized || !enabled) return
  initialized = true
  if (apiKey) safe(() => amplitude.init(apiKey, {
    autocapture: false, defaultTracking: false, fetchRemoteConfig: false,
    serverZone: env.VITE_AMPLITUDE_SERVER_ZONE === "EU" ? "EU" : "US",
  }))
  if (gtmId) {
    // GTM owns GA4 when configured. Never load a second direct Google tag.
    push({ "gtm.start": Date.now(), event: "gtm.js" })
    script(`https://www.googletagmanager.com/gtm.js?id=${gtmId}`)
  } else if (gaId) {
    gtag("js", new Date())
    gtag("config", gaId, { send_page_view: false, allow_google_signals: false,
      page_location: `${window.location.origin}/app`, page_referrer: "" })
    script(`https://www.googletagmanager.com/gtag/js?id=${gaId}`)
  }
}
function googlePayload(event) {
  const campaign = event.properties
  const page = campaign.page_name || pageName(window.location.pathname, Boolean(event.userId)) || "app"
  const fields = Object.fromEntries(Object.entries(campaign).filter(([key]) => !key.startsWith("utm_") && !key.startsWith("first_") && key !== "want_id"))
  return { ...fields, event_id: event.id, user_id: event.userId,
    page_location: `${window.location.origin}/${page}`,
    page_title: `있니 | ${page}`, page_referrer: "",
    campaign_source: campaign.utm_source, campaign_medium: campaign.utm_medium,
    campaign_name: campaign.utm_campaign || "", campaign_content: campaign.utm_content || "",
    campaign_term: campaign.utm_term || "", ...(debug ? { debug_mode: true } : {}) }
}
export const analytics = createAnalytics({ enabled, debug,
  environment: env.VITE_ANALYTICS_ENV || env.MODE,
  local: storage("localStorage"), session: storage("sessionStorage"),
  href: () => window.location.href,
  send(event) {
    init()
    if (apiKey) safe(() => amplitude.track(event.name, event.properties, {
      insert_id: event.id, time: event.timestamp, user_id: event.userId || undefined,
    }))
    const name = event.name === "page_viewed" ? "page_view" : event.name
    if (gtmId) safe(() => {
      push({ inni_parameters: null })
      push({ event: "inni_event", inni_event_name: name,
        inni_user_id: event.userId, inni_parameters: googlePayload(event) })
      // GTM loads the Google tag; the app queues the explicit event command.
      // Do not add a second GA4 event tag for inni_event in the container.
      if (gaId) gtag("event", name, { ...googlePayload(event), send_to: gaId })
    })
    else if (gaId) safe(() => gtag("event", name, { ...googlePayload(event), send_to: gaId }))
  },
  identify(id, properties, attribution) {
    if (!enabled) return
    init()
    if (apiKey) safe(() => {
      amplitude.setUserId(id)
      const traits = new amplitude.Identify()
      for (const [key, value] of Object.entries(properties)) traits.set(key, value)
      for (const [key, value] of Object.entries(attribution)) if (key.startsWith("first_")) traits.setOnce(key, value)
      return amplitude.identify(traits)
    })
  },
  reset() {
    // Also clear SDK-persisted identity when an expired session is discovered
    // immediately after a page reload, before the first tracked event.
    init()
    if (initialized && apiKey) safe(() => amplitude.reset())
    if (initialized && gaId && !gtmId) safe(() => gtag("set", { user_id: null }))
    if (initialized && gtmId) safe(() => push({ inni_user_id: null, inni_parameters: null }))
  },
  inspect(event) {
    window.__inniAnalyticsEvents ??= []
    window.__inniAnalyticsEvents.push(event)
    if (window.__inniAnalyticsEvents.length > 200) window.__inniAnalyticsEvents.shift()
  },
})

export function trackFailure(action, error, expectedUser) {
  analytics.track("action_failed", { action, error_code: /^[A-Z0-9_]{1,60}$/.test(error?.code || "") ? error.code : "UNKNOWN_ERROR" }, undefined, expectedUser)
}
