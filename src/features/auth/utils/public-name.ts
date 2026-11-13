import { z } from "zod";
import { m } from "@/paraglide/messages";

/** The public name a User shows beside their Comments. */
export const createPublicNameSchema = () =>
  z
    .string()
    .min(2, m.profile_validation_name_min())
    .max(20, m.profile_validation_name_max());
