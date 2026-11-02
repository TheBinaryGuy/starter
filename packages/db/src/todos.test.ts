import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './client';
import { todo, user } from './schema';
import { createTodo, deleteTodo, listTodos, TODO_LIMIT, TodoLimitError, updateTodo } from './todos';

async function person(email: string) {
    const [row] = await db
        .insert(user)
        .values({ name: email, email, emailVerified: true })
        .returning({ id: user.id });
    return row!.id;
}

let ada: string;
let grace: string;

beforeEach(async () => {
    await db.execute('truncate "user", "session", "account", "verification", "todo" cascade');
    ada = await person('ada@example.com');
    grace = await person('grace@example.com');
});

describe('ownership', () => {
    it('lists only the owner’s todos, oldest first', async () => {
        const first = await createTodo(ada, 'first');
        await createTodo(grace, 'not yours');
        const second = await createTodo(ada, 'second');

        expect((await listTodos(ada)).map((row) => row.id)).toEqual([first.id, second.id]);
    });

    it('will not let one person change another’s todo', async () => {
        const theirs = await createTodo(grace, 'hers');

        expect(await updateTodo(ada, theirs.id, { title: 'mine now', done: true })).toBeNull();
        const [row] = await db.select().from(todo).where(eq(todo.id, theirs.id));
        expect(row).toMatchObject({ title: 'hers', done: false });
    });

    it('will not let one person delete another’s todo', async () => {
        const theirs = await createTodo(grace, 'hers');

        expect(await deleteTodo(ada, theirs.id)).toBe(false);
        expect(await listTodos(grace)).toHaveLength(1);
    });

    it('updates and deletes the owner’s own todo', async () => {
        const mine = await createTodo(ada, 'draft');

        expect(await updateTodo(ada, mine.id, { done: true })).toMatchObject({
            title: 'draft',
            done: true,
        });
        expect(await deleteTodo(ada, mine.id)).toBe(true);
        expect(await deleteTodo(ada, mine.id)).toBe(false);
    });

    it('goes with the account', async () => {
        await createTodo(ada, 'mine');
        await db.delete(user).where(eq(user.id, ada));
        expect(await db.select().from(todo)).toHaveLength(0);
    });
});

describe('limits', () => {
    async function fill(owner: string, total: number) {
        await db
            .insert(todo)
            .values(
                Array.from({ length: total }, (_, index) => ({ userId: owner, title: `${index}` })),
            );
    }

    it('refuses one past the limit', async () => {
        await fill(ada, TODO_LIMIT);
        await expect(createTodo(ada, 'one more')).rejects.toBeInstanceOf(TodoLimitError);
        // Someone else's room is their own.
        await expect(createTodo(grace, 'fine')).resolves.toMatchObject({ title: 'fine' });
    });

    it('lets only one of several simultaneous adds take the last place', async () => {
        await fill(ada, TODO_LIMIT - 1);
        // Open the pool's connections first, so the adds overlap instead of queueing for one.
        await Promise.all(Array.from({ length: 8 }, () => db.execute('select pg_sleep(0.05)')));
        const results = await Promise.allSettled(
            Array.from({ length: 8 }, (_, index) => createTodo(ada, `racer ${index}`)),
        );

        expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
        expect((await listTodos(ada)).length).toBe(TODO_LIMIT);
    });

    it('rejects an empty or overlong title in the database itself', async () => {
        await expect(db.insert(todo).values({ userId: ada, title: '' })).rejects.toThrow();
        await expect(
            db.insert(todo).values({ userId: ada, title: 'x'.repeat(501) }),
        ).rejects.toThrow();
    });
});
