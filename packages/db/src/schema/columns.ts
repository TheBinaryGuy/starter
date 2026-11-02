import { timestamp } from 'drizzle-orm/pg-core';

/* created_at and updated_at, both set by the database; updated_at also on every update through Drizzle. */
export const timestamps = {
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow()
        .$onUpdate(() => new Date()),
};
