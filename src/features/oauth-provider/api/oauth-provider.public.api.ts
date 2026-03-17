import { createServerFn } from "@tanstack/react-start";
import { dbMiddleware } from "@/lib/middlewares";
import { GetOAuthClientMetadataInputSchema } from "../../oauth-clients/schema/oauth-client.schema";
import * as OAuthClientService from "../../oauth-clients/service/oauth-client.service";

export const getOAuthClientMetadataFn = createServerFn({
  method: "POST",
})
  .middleware([dbMiddleware])
  .inputValidator(GetOAuthClientMetadataInputSchema)
  .handler(({ context, data }) =>
    OAuthClientService.getOAuthClientMetadata(context, data.clientId),
  );
