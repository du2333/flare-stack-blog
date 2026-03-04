import { createStart } from "@tanstack/react-start";
import { errorLoggingMiddleware } from "@/lib/middlewares";

export const startInstance = createStart(() => {
  return {
    functionMiddleware: [errorLoggingMiddleware],
  };
});
