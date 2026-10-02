"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRoleSafe } from "@/lib/auth-helpers";
import { logActivity } from "@/lib/activity";
import { todoItemSchema } from "@/lib/validation/todo";

export interface TodoActionResult {
  ok: boolean;
  error?: string;
}

export async function createTodoItem(input: unknown): Promise<TodoActionResult> {
  const guard = await requireRoleSafe(["ADMIN_STAFF", "ADMIN", "SUPER_ADMIN"]);
  if (!guard.ok) return { ok: false, error: guard.error };
  const user = guard.user;

  const parsed = todoItemSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const item = await prisma.todoItem.create({
    data: { description: parsed.data.description, createdById: user.id },
  });
  await logActivity(`${user.name} added a to-do: "${item.description}".`, user.id);
  revalidatePath("/todo");
  return { ok: true };
}

/** Ticks an item as fixed/bought, or un-ticks it if it was marked by mistake. */
export async function toggleTodoItem(id: string): Promise<TodoActionResult> {
  const guard = await requireRoleSafe(["ADMIN_STAFF", "ADMIN", "SUPER_ADMIN"]);
  if (!guard.ok) return { ok: false, error: guard.error };
  const user = guard.user;

  const item = await prisma.todoItem.findUnique({ where: { id } });
  if (!item) return { ok: false, error: "To-do not found." };

  const nowDone = !item.done;
  await prisma.todoItem.update({
    where: { id },
    data: nowDone
      ? { done: true, doneAt: new Date(), doneById: user.id }
      : { done: false, doneAt: null, doneById: null },
  });
  await logActivity(
    nowDone
      ? `${user.name} marked "${item.description}" as done.`
      : `${user.name} reopened "${item.description}".`,
    user.id
  );
  revalidatePath("/todo");
  return { ok: true };
}

export async function deleteTodoItem(id: string): Promise<TodoActionResult> {
  const guard = await requireRoleSafe(["SUPER_ADMIN"]);
  if (!guard.ok) return { ok: false, error: guard.error };
  const user = guard.user;

  const item = await prisma.todoItem.findUnique({ where: { id } });
  if (!item) return { ok: false, error: "To-do not found." };

  await prisma.todoItem.delete({ where: { id } });
  await logActivity(`${user.name} deleted the to-do "${item.description}".`, user.id);
  revalidatePath("/todo");
  return { ok: true };
}
