import { sql } from 'drizzle-orm';
import { boolean, check, index, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { user } from './auth';
import { timestamps } from './columns';

/* The longest title a todo may have, in characters; the API and the database both hold to it. */
export const TODO_TITLE_MAX = 500;

/* The example table: one person's todos, gone with their account. */
export const todo = pgTable(
    'todo',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        userId: uuid('user_id')
            .notNull()
            .references(() => user.id, { onDelete: 'cascade' }),
        title: text('title').notNull(),
        done: boolean('done').notNull().default(false),
        ...timestamps,
    },
    (table) => [
        index('todo_user_id_created_at_idx').on(table.userId, table.createdAt),
        check(
            'todo_title_length',
            sql`char_length(${table.title}) between 1 and ${sql.raw(String(TODO_TITLE_MAX))}`,
        ),
    ],
);
