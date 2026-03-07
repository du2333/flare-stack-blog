import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { baseMiddleware } from "@/lib/hono/middlewares";
import { setCacheHeaders } from "@/lib/hono/helper";
import { SearchQuerySchema } from "@/features/search/search.schema";
import * as SearchService from "@/features/search/service/search.service";

const app = new Hono<{ Bindings: Env }>();

app.use("*", baseMiddleware);

const route = app.get(
  "/",
  zValidator(
    "query",
    SearchQuerySchema.extend({
      limit: z.coerce.number().optional().default(10),
    }),
  ),
  async (c) => {
    const data = c.req.valid("query");
    const result = await SearchService.search(
      { db: c.get("db"), env: c.env },
      data,
    );
    setCacheHeaders(c.res.headers, "immutable");
    return c.json(result);
  },
);

export default route;
