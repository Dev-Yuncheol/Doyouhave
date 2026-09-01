import { describe, expect, it } from "vitest"
import { getPriceError, MAX_PRICE } from "./price.js"

describe("price validation", () => {
  it.each(["", "0", String(MAX_PRICE)])("accepts %j", (value) => {
    expect(getPriceError(value)).toBeUndefined()
  })

  it.each(["-1", "1.5", "Infinity", "1e309", String(MAX_PRICE + 1)])(
    "rejects %j",
    (value) => {
      expect(getPriceError(value)).toEqual(expect.any(String))
    },
  )
})
