import { z } from "zod";

export const todoItemSchema = z.object({
  description: z.string().trim().min(1, "Describe what needs to be done or fixed").max(500),
});

export type TodoItemInput = z.infer<typeof todoItemSchema>;
