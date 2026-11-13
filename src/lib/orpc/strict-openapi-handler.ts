import { ORPCError } from "@orpc/client";
import { JsonSchemaCoercer } from "@orpc/json-schema";
import type { ConditionalSchemaConverter, JSONSchema } from "@orpc/openapi";
import type { OpenAPIHandlerOptions } from "@orpc/openapi/fetch";
import {
  StandardOpenAPICodec,
  type StandardOpenAPICodecOptions,
  StandardOpenAPIMatcher,
} from "@orpc/openapi/standard";
import {
  StandardBracketNotationSerializer,
  StandardOpenAPIJsonSerializer,
  StandardOpenAPISerializer,
} from "@orpc/openapi-client/standard";
import type { AnyContractRouter } from "@orpc/contract";
import type { AnyProcedure, Context, Router } from "@orpc/server";
import { FetchHandler } from "@orpc/server/fetch";
import { StandardHandler, type StandardParams } from "@orpc/server/standard";
import type { StandardLazyRequest } from "@orpc/standard-server";
import { isCanonicalId } from "./path-id-format";

type Issue = { path: Array<string>; message: string };

type InputShape = {
  schema: JSONSchema | undefined;
  /** The input's top-level fields, across every alternative it allows. */
  fields: Map<string, JSONSchema>;
};

const NO_INPUT: InputShape = { schema: undefined, fields: new Map() };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/** Whether a body arrived as text fields: form data or a URL-encoded form. */
function isFormBody(body: unknown) {
  return body instanceof FormData || body instanceof URLSearchParams;
}

/** The top-level names a query or body gives: `tags[0]=…` gives `tags`. */
function namesIn(data: unknown) {
  if (isFormBody(data)) {
    const keys = [...(data as FormData | URLSearchParams).keys()];
    return [...new Set(keys.map((key) => key.replace(/\[.*$/s, "") || key))];
  }
  return isPlainObject(data) ? Object.keys(data) : [];
}

function collectFields(schema: JSONSchema, fields: Map<string, JSONSchema>) {
  if (typeof schema !== "object") return fields;
  for (const [name, field] of Object.entries(schema.properties ?? {})) {
    if (!fields.has(name)) fields.set(name, field);
  }
  const alternatives = [
    ...(schema.anyOf ?? []),
    ...(schema.oneOf ?? []),
    ...(schema.allOf ?? []),
  ];
  for (const alternative of alternatives) collectFields(alternative, fields);
  return fields;
}

function isNumeric(field: JSONSchema | undefined) {
  return (
    typeof field === "object" &&
    (field.type === "integer" || field.type === "number")
  );
}

/**
 * Decodes an operation's input from where the operation reads it, and only
 * from there, before the input schema validates it:
 *
 * - A path parameter comes from the path. oRPC merges the path parameters
 *   with the body (the query, for GET) so that a body field of the same name
 *   wins, which sent `DELETE /admin/posts/97` with `{"id":98}` to post 98.
 *   Such a field answers 400 instead.
 * - A path id is written as plain digits (see `isCanonicalId`).
 * - Only GET reads the query. Elsewhere a query parameter answers 400 rather
 *   than being dropped, and on GET so does one the operation does not take,
 *   public or admin.
 * - Text is read as the type the schema declares: path and query parameters
 *   and form fields, which are text on the wire. A JSON body carries its own
 *   types, so `"95"` where a number is declared is refused, not coerced.
 *
 * Every refusal is a 400 BAD_REQUEST whose `data.issues` name the field, as
 * a schema refusal does.
 */
export class StrictOpenAPICodec extends StandardOpenAPICodec {
  readonly #converter: ConditionalSchemaConverter;
  readonly #coercer = new JsonSchemaCoercer();
  readonly #shapes = new WeakMap<object, Promise<InputShape>>();

  constructor(
    serializer: StandardOpenAPISerializer,
    options: StandardOpenAPICodecOptions & {
      schemaConverter: ConditionalSchemaConverter;
    },
  ) {
    super(serializer, options);
    this.#converter = options.schemaConverter;
  }

  override async decode(
    request: StandardLazyRequest,
    params: StandardParams | undefined,
    procedure: AnyProcedure,
  ): Promise<unknown> {
    const { route, inputSchema } = procedure["~orpc"];
    if ((route.inputStructure ?? "compact") !== "compact") {
      return super.decode(request, params, procedure);
    }
    const pathParams = params ?? {};
    const shape = await this.#shapeOf(inputSchema);
    const isGet = request.method === "GET";
    const query = request.url.searchParams;
    const body = isGet ? undefined : await request.body();

    const issues: Array<Issue> = [];
    for (const [name, value] of Object.entries(pathParams)) {
      if (isNumeric(shape.fields.get(name)) && !isCanonicalId(value)) {
        issues.push({
          path: [name],
          message: `${name} must be a positive whole number written in decimal digits, such as 74.`,
        });
      }
    }
    for (const name of namesIn(isGet ? query : body)) {
      if (Object.hasOwn(pathParams, name)) {
        issues.push({
          path: [name],
          message: `${name} is given by the path only. Leave it out of the ${isGet ? "query" : "request body"}.`,
        });
      }
    }
    if (isGet) {
      const taken = [...shape.fields.keys()].filter(
        (name) => !Object.hasOwn(pathParams, name),
      );
      for (const name of namesIn(query)) {
        if (Object.hasOwn(pathParams, name) || taken.includes(name)) continue;
        issues.push({
          path: [name],
          message:
            taken.length > 0
              ? `Unknown query parameter. This operation takes ${taken.join(", ")}.`
              : "Unknown query parameter. This operation takes none.",
        });
      }
    } else {
      for (const name of namesIn(query)) {
        issues.push({
          path: [name],
          message: `Only GET reads query parameters. Send the fields a ${request.method} takes in the request body.`,
        });
      }
      // An input schema refuses the fields it does not declare; an operation
      // with none has no schema to do so.
      if (!shape.schema) {
        for (const name of namesIn(body)) {
          if (Object.hasOwn(pathParams, name)) continue;
          issues.push({
            path: [name],
            message: "Unknown field. This operation takes no request body.",
          });
        }
      }
    }
    if (issues.length > 0) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Input validation failed",
        data: { issues },
      });
    }

    const input = await super.decode(request, params, procedure);
    if (!shape.schema) return input;
    if (isGet || isFormBody(body)) {
      return this.#coercer.coerce(shape.schema, input);
    }
    if (!isPlainObject(input)) return input;
    const typedParams = Object.entries(pathParams).map(([name, value]) => [
      name,
      this.#coercer.coerce(shape.fields.get(name) ?? true, value),
    ]);
    return { ...input, ...Object.fromEntries(typedParams) };
  }

  #shapeOf(inputSchema: unknown) {
    if (typeof inputSchema !== "object" || inputSchema === null) {
      return Promise.resolve(NO_INPUT);
    }
    let shape = this.#shapes.get(inputSchema);
    if (!shape) {
      shape = Promise.resolve(
        this.#converter.convert(inputSchema as never, { strategy: "input" }),
      ).then(([, schema]) => ({
        schema,
        fields: collectFields(schema, new Map()),
      }));
      this.#shapes.set(inputSchema, shape);
    }
    return shape;
  }
}

/** oRPC's `OpenAPIHandler`, decoding input with `StrictOpenAPICodec`. */
export class StrictOpenAPIHandler<T extends Context> extends FetchHandler<T> {
  constructor(
    router: Router<AnyContractRouter, T>,
    options: OpenAPIHandlerOptions<T> & {
      schemaConverter: ConditionalSchemaConverter;
    },
  ) {
    const serializer = new StandardOpenAPISerializer(
      new StandardOpenAPIJsonSerializer(options),
      new StandardBracketNotationSerializer(options),
    );
    super(
      new StandardHandler(
        router,
        new StandardOpenAPIMatcher(options),
        new StrictOpenAPICodec(serializer, options),
        options,
      ),
      options,
    );
  }
}
