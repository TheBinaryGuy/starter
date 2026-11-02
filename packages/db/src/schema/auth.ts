import { boolean, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { timestamps } from './columns';

/*
 * Better Auth's core tables (better-auth.com/docs/concepts/database). Ids are
 * UUIDs Postgres generates (`advanced.database.generateId: 'uuid'` in
 * @repo/auth). A plugin that adds tables or columns needs them here too, then
 * `bun run db:generate`.
 */

export const user = pgTable('user', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    emailVerified: boolean('email_verified').notNull().default(false),
    image: text('image'),
    ...timestamps,
});

export const session = pgTable(
    'session',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        token: text('token').notNull().unique(),
        expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
        ipAddress: text('ip_address'),
        userAgent: text('user_agent'),
        userId: uuid('user_id')
            .notNull()
            .references(() => user.id, { onDelete: 'cascade' }),
        ...timestamps,
    },
    (table) => [index('session_user_id_idx').on(table.userId)],
);

export const account = pgTable(
    'account',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        accountId: text('account_id').notNull(),
        providerId: text('provider_id').notNull(),
        userId: uuid('user_id')
            .notNull()
            .references(() => user.id, { onDelete: 'cascade' }),
        accessToken: text('access_token'),
        refreshToken: text('refresh_token'),
        idToken: text('id_token'),
        accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
        refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
        scope: text('scope'),
        password: text('password'),
        ...timestamps,
    },
    (table) => [index('account_user_id_idx').on(table.userId)],
);

export const verification = pgTable(
    'verification',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        identifier: text('identifier').notNull(),
        value: text('value').notNull(),
        expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
        ...timestamps,
    },
    (table) => [index('verification_identifier_idx').on(table.identifier)],
);
