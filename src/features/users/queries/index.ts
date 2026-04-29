import { queryOptions } from "@tanstack/react-query";
import { getUsersFn } from "../api/users.admin.api";
import type { GetUsersInput } from "../users.schema";

export const USERS_KEYS = {
  all: ["users"] as const,
  lists: ["users", "list"] as const,
  list: (params: GetUsersInput) => ["users", "list", params] as const,
};

export function usersListQuery(params: GetUsersInput) {
  return queryOptions({
    queryKey: USERS_KEYS.list(params),
    queryFn: () => getUsersFn({ data: params }),
  });
}
