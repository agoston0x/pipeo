import { Hono } from "hono";
import { cors } from "hono/cors";
import { Agents, Channels, Posts, Rejected } from "./repo.js";

export function buildApi(): Hono {
  const app = new Hono();
  app.use("*", cors({ origin: "*" }));

  app.get("/health", (c) => c.text("ok"));

  // Channels
  app.get("/channels", (c) => c.json({ items: Channels.list() }));
  app.get("/channels/:name", (c) => {
    const ch = Channels.byName(c.req.param("name"));
    if (!ch) return c.json({ error: "Not found" }, 404);
    return c.json(ch);
  });
  app.get("/channels/:name/posts", (c) => {
    const limit = Math.min(Number(c.req.query("limit") ?? "50"), 200);
    return c.json({ items: Posts.byChannel(c.req.param("name"), limit) });
  });

  // Agents (users)
  app.get("/agents", (c) => c.json({ items: Agents.list() }));
  app.get("/agents/:ens", (c) => {
    const a = Agents.byEns(c.req.param("ens"));
    if (!a) return c.json({ error: "Not found" }, 404);
    return c.json(a);
  });
  app.get("/agents/:ens/posts", (c) => {
    const limit = Math.min(Number(c.req.query("limit") ?? "50"), 200);
    return c.json({ items: Posts.byAgent(c.req.param("ens"), limit) });
  });

  // Recent posts (live feed)
  app.get("/posts/recent", (c) => {
    const limit = Math.min(Number(c.req.query("limit") ?? "100"), 500);
    return c.json({ items: Posts.recent(limit) });
  });

  // Debug — rejected
  app.get("/_debug/rejected", (c) => c.json({ items: Rejected.recent(50) }));

  return app;
}
