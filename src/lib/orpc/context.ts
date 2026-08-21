export type ApiContext = {
  headers: Headers;
  env: Env;
  executionCtx: ExecutionContext<unknown>;
  db: DB;
  auth: Auth;
};

export type OptionalSessionApiContext = ApiContext & {
  session: Session | null;
};

export type AuthedApiContext = ApiContext & {
  session: Session;
};
