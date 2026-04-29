import { z } from "zod";

export const USER_ROLES = ["user", "admin", "superadmin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const UserItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  image: z.string().nullable(),
  role: z.string().nullable(),
  createdAt: z.union([z.date(), z.string().pipe(z.coerce.date())]),
});

export const GetUsersInputSchema = z.object({
  offset: z.number().optional(),
  limit: z.number().optional(),
  search: z.string().optional(),
  role: z.enum(["user", "admin", "all"]).optional(),
});

export const UpdateUserRoleInputSchema = z.object({
  userId: z.string(),
  role: z.enum(["user", "admin"]),
});

export type UserItem = z.infer<typeof UserItemSchema>;
export type GetUsersInput = z.infer<typeof GetUsersInputSchema>;
export type UpdateUserRoleInput = z.infer<typeof UpdateUserRoleInputSchema>;

export const UsersListResponseSchema = z.object({
  items: z.array(UserItemSchema),
  total: z.number(),
});

export type UsersListResponse = z.infer<typeof UsersListResponseSchema>;
