import { z } from "zod";

export const createContactRequestSchema = z.object({
  userId: z.string().uuid()
});
