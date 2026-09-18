import { apiRequest } from "./api"

// Keep the same key after an uncertain network/server failure. Concurrent clicks
// share one promise. A successful save ends the operation so a later deliberate
// save (including after deletion) uses a fresh key and consumes a new trial use.
export function createItemSaver(request = apiRequest, newKey = () => crypto.randomUUID()) {
  const pending = new Map()
  return function saveItem(userId, path, payload) {
    const identity = JSON.stringify([userId, path, Object.keys(payload).sort().map((key) => [key, payload[key]])])
    let operation = pending.get(identity)
    if (operation?.promise) return operation.promise
    if (!operation) {
      operation = { key: newKey(), promise: null }
      pending.set(identity, operation)
    }
    operation.promise = request(path, {
      method: "POST", body: payload, headers: { "Idempotency-Key": operation.key },
    }).then((result) => {
      pending.delete(identity)
      return result
    }).catch((error) => {
      operation.promise = null
      if (error.status >= 400 && error.status < 500) pending.delete(identity)
      throw error
    })
    return operation.promise
  }
}
