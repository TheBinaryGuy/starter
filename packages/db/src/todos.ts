import { and, asc, count, eq } from 'drizzle-orm';
import { db } from './client';
import { todo, user } from './schema';

/*
 * The example repository. Every function takes the owner's id and touches only
 * that person's rows: a todo id from someone else reads as not found, never as
 * forbidden, so ids can't be probed. Callers validate titles first; the table's
 * check constraint is the backstop.
 */

/* The most todos one person may keep. */
export const TODO_LIMIT = 1000;

export class TodoLimitError extends Error {
    constructor() {
        super(`You can keep up to ${TODO_LIMIT} todos.`);
        this.name = 'TodoLimitError';
    }
}

export type Todo = typeof todo.$inferSelect;

export function listTodos(userId: string) {
    return db
        .select()
        .from(todo)
        .where(eq(todo.userId, userId))
        .orderBy(asc(todo.createdAt), asc(todo.id));
}

/*
 * Holds the owner's row while it counts, so two adds at once can't both see
 * room for one more and pass the limit together.
 */
export async function createTodo(userId: string, title: string) {
    return db.transaction(async (tx) => {
        const [owner] = await tx
            .select({ id: user.id })
            .from(user)
            .where(eq(user.id, userId))
            .for('update');
        if (!owner) throw new Error('No such user.');
        const [held] = await tx
            .select({ total: count() })
            .from(todo)
            .where(eq(todo.userId, userId));
        if ((held?.total ?? 0) >= TODO_LIMIT) throw new TodoLimitError();
        const [created] = await tx.insert(todo).values({ userId, title }).returning();
        return created!;
    });
}

/* The updated todo, or null when the owner has none with this id. */
export async function updateTodo(
    userId: string,
    id: string,
    changes: { title?: string; done?: boolean },
) {
    const [updated] = await db
        .update(todo)
        .set(changes)
        .where(and(eq(todo.id, id), eq(todo.userId, userId)))
        .returning();
    return updated ?? null;
}

/* Whether the owner had a todo with this id to delete. */
export async function deleteTodo(userId: string, id: string) {
    const deleted = await db
        .delete(todo)
        .where(and(eq(todo.id, id), eq(todo.userId, userId)))
        .returning({ id: todo.id });
    return deleted.length > 0;
}
