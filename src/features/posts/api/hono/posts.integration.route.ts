import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { oauthAccessTokenMiddleware } from "@/features/oauth-provider/api/oauth-provider.middleware";
import * as PostService from "@/features/posts/services/posts.service";
import {
  FindPostByIdInputSchema,
  GetPostsInputSchema,
} from "@/features/posts/schema/posts.schema";
import { getServiceContext } from "@/lib/hono/helper";
import { baseMiddleware } from "@/lib/hono/middlewares";

const app = new Hono<{ Bindings: Env }>();

app.use("*", baseMiddleware);

const getPostsQuerySchema = GetPostsInputSchema.extend({
  limit: z.coerce.number().optional(),
  offset: z.coerce.number().optional(),
});

const findPostByIdParamsSchema = FindPostByIdInputSchema.extend({
  id: z.coerce.number(),
});

const route = app
  .get(
    "/",
    oauthAccessTokenMiddleware({ posts: ["read"] }),
    zValidator("query", getPostsQuerySchema),
    async (c) => {
      const result = await PostService.getPosts(
        getServiceContext(c),
        c.req.valid("query"),
      );
      return c.json(result);
    },
  )
  .get(
    "/:id",
    oauthAccessTokenMiddleware({ posts: ["read"] }),
    zValidator("param", findPostByIdParamsSchema),
    async (c) => {
      const post = await PostService.findPostById(
        getServiceContext(c),
        c.req.valid("param"),
      );

      if (!post) {
        return c.json(
          {
            code: "POST_NOT_FOUND",
            message: "Post not found",
          },
          404,
        );
      }

      return c.json(post);
    },
  )
  .post("/", oauthAccessTokenMiddleware({ posts: ["write"] }), async (c) => {
    const result = await PostService.createEmptyPost(getServiceContext(c));
    return c.json(result, 201);
  });

export default route;
