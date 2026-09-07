import { SmartCoercionPlugin } from "@orpc/json-schema";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { router } from "./router";

const schemaConverter = new ZodToJsonSchemaConverter();

export const openAPIHandler = new OpenAPIHandler(router, {
  interceptors: [
    onError((error) => {
      console.error(
        JSON.stringify({
          message: "API error",
          error:
            error instanceof Error
              ? {
                  name: error.name,
                  message: error.message,
                  stack: error.stack,
                }
              : String(error),
          timestamp: new Date().toISOString(),
        }),
      );
    }),
  ],
  plugins: [
    new SmartCoercionPlugin({
      schemaConverters: [schemaConverter],
    }),
    new OpenAPIReferencePlugin({
      schemaConverters: [schemaConverter],
      docsPath: "/docs",
      specPath: "/spec.json",
      specGenerateOptions: {
        info: {
          title: "Flare Stack Blog API",
          version: "1.0.0",
          description:
            "Admin routes require a browser session cookie or an Admin API Key in the x-api-key header.",
        },
        components: {
          securitySchemes: {
            apiKey: {
              type: "apiKey",
              in: "header",
              name: "x-api-key",
            },
          },
        },
      },
    }),
  ],
});
