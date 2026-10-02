import { getCurrentUser } from "@/lib/auth-helpers";
import { canManageTodos } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import AddTodoForm from "@/components/todo/AddTodoForm";
import TodoCheckbox from "@/components/todo/TodoCheckbox";
import DeleteTodoButton from "@/components/todo/DeleteTodoButton";

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-NG", { year: "numeric", month: "short", day: "numeric" });
}

export default async function TodoPage() {
  const user = await getCurrentUser();
  const canManage = user ? canManageTodos(user.role) : false;
  const canDelete = user?.role === "SUPER_ADMIN";

  const items = canManage
    ? await prisma.todoItem.findMany({
        include: { createdBy: true, doneBy: true },
        orderBy: [{ done: "asc" }, { createdAt: "desc" }],
      })
    : [];

  const open = items.filter((i) => !i.done);
  const done = items.filter((i) => i.done);

  function row(item: (typeof items)[number]) {
    return (
      <div
        key={item.id}
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
          padding: "10px 0",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <TodoCheckbox id={item.id} done={item.done} />
        <div style={{ flex: 1 }}>
          <div style={{ textDecoration: item.done ? "line-through" : "none", color: item.done ? "var(--text-faint)" : "var(--text)" }}>
            {item.description}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--text-faint)", marginTop: 2 }}>
            Added {fmtDate(item.createdAt)} by {item.createdBy.name}
            {item.done && item.doneAt && (
              <> · Fixed/bought {fmtDate(item.doneAt)}{item.doneBy ? ` by ${item.doneBy.name}` : ""}</>
            )}
          </div>
        </div>
        {canDelete && <DeleteTodoButton id={item.id} description={item.description} />}
      </div>
    );
  }

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>Factory To-Do List</h1>
          <div className="sub">Things to fix or buy for the factory — tick an item once it&apos;s done.</div>
        </div>
      </div>
      <div className="card">
        {canManage ? (
          <>
            <AddTodoForm />
            {open.length === 0 && done.length === 0 && (
              <div className="empty">Nothing on the list yet — add the first thing that needs fixing or buying.</div>
            )}
            {open.length > 0 && (
              <div style={{ marginBottom: done.length > 0 ? 20 : 0 }}>
                <div style={{ color: "var(--text-faint)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 4 }}>
                  Outstanding ({open.length})
                </div>
                {open.map(row)}
              </div>
            )}
            {done.length > 0 && (
              <div>
                <div style={{ color: "var(--text-faint)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 4 }}>
                  Fixed / bought ({done.length})
                </div>
                {done.map(row)}
              </div>
            )}
          </>
        ) : (
          <div className="empty">You don&apos;t have access to the factory to-do list.</div>
        )}
      </div>
    </div>
  );
}
