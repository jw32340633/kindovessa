import { Router } from "express";

import { checkDatabase } from "../db/pool.js";

export function healthRouter(databaseCheck = checkDatabase) {
  const router = Router();
  router.get("/live", (_request, response) => {
    response.json({ status: "ok" });
  });
  router.get("/ready", async (_request, response) => {
    try {
      const ready = await databaseCheck();
      response
        .status(ready ? 200 : 503)
        .json({ status: ready ? "ready" : "not_ready" });
    } catch {
      response.status(503).json({ status: "not_ready" });
    }
  });
  return router;
}
