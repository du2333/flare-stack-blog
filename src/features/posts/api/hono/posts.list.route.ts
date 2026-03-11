import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { GetPostsCursorInputSchema } from "@/features/posts/posts.schema";
import * as PostService from "@/features/posts/posts.service";
import { getServiceContext, setCacheHeaders } from "@/lib/hono/helper";
import { baseMiddleware } from "@/lib/hono/middlewares";

const app = new Hono<{ Bindings: Env }>();

app.use("*", baseMiddleware);

const route = app.get(
  "/",
  zValidator(
    "query",
    GetPostsCursorInputSchema.extend({
      cursor: z.coerce.number().optional(),
      limit: z.coerce.number().optional(),
    }),
  ),
  async (c) => {
    const data = c.req.valid("query");
    const result = await PostService.getPostsCursor(getServiceContext(c), data);
    setCacheHeaders(c.res.headers, "public");
    return c.json(result);
  },
);

export default route;
