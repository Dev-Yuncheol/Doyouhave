// Disposable QA environment. No .env database, real accounts, or provider writes.
import { readFile, readdir } from "node:fs/promises"
import express from "express"
import { PGlite } from "@electric-sql/pglite"
import { PGLiteSocketServer } from "@electric-sql/pglite-socket"
import { PrismaClient } from "@prisma/client"
import { createServer } from "vite"
import { createApp } from "./app.js"

process.env.VITE_ANALYTICS_ENABLED = "false"
process.env.VITE_ANALYTICS_DEBUG = "true"
process.env.VITE_ANALYTICS_ENV = "qa"
const pg = await PGlite.create()
await pg.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE TABLE "_prisma_migrations" (id text);')
const migrations = new URL("../prisma/migrations/", import.meta.url)
for (const name of (await readdir(migrations)).filter((name) => /^\d/.test(name)).sort()) {
  await pg.exec(await readFile(new URL(`${name}/migration.sql`, migrations), "utf8"))
}
const socket = new PGLiteSocketServer({ db: pg, host: "127.0.0.1", port: 0, maxConnections: 4 })
let dbPort
socket.addEventListener("listening", (event) => { dbPort = event.detail.port })
await socket.start()
const database = new PrismaClient({ datasources: { db: { url: `postgresql://postgres:postgres@127.0.0.1:${dbPort}/postgres?connection_limit=3&pgbouncer=true` } } })
const api = createApp({ database, jwtSecret: "analytics-local-qa-only-secret-at-least-32-characters" })
const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: "spa" })
const app = express()
app.use((req, res, next) => req.path.startsWith("/api/") ? api(req, res, next) : next())
app.use(vite.middlewares)
const http = app.listen(5179, "127.0.0.1", () => console.log("Analytics QA: http://127.0.0.1:5179 (temporary database, local events only)"))
let closing = false
async function close() {
  if (closing) return
  closing = true
  http.closeAllConnections()
  http.close()
  await vite.close()
  await database.$disconnect()
  await socket.stop()
  await pg.close()
  process.exit(0)
}
process.on("SIGINT", close)
process.on("SIGTERM", close)
