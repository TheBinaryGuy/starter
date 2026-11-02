import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';
import type { TestProject } from 'vitest/node';

/*
 * A Vitest global setup for packages whose tests touch Postgres. Points them at
 * a throwaway database beside the configured one (`<name>_test_<package>`, or
 * TEST_DATABASE_URL as the base), creates it if missing, and applies the
 * checked-in migrations with drizzle-kit, so tests run against the same schema
 * as production and never touch dev data. Each package gets its own database
 * because Turbo runs package suites in parallel.
 *
 *   // vitest.config.ts
 *   globalSetup: ['./test/setup-db.ts'],   // export default databaseSetup('auth')
 *   setupFiles: ['@repo/db/test/setup'],
 *   fileParallelism: false,
 */
const root = fileURLToPath(new URL('../../../', import.meta.url));

/* Vitest started directly (not through `bun run`) has no .env loaded, so read it here too. */
function readEnv(key: string) {
    try {
        const line = readFileSync(join(root, '.env'), 'utf8')
            .split(/\r?\n/)
            .find((entry) => entry.startsWith(`${key}=`));
        return (
            line
                ?.slice(key.length + 1)
                .trim()
                .replace(/^["']|["']$/g, '') || undefined
        );
    } catch {
        return undefined;
    }
}

/* Whether the test database's ledger names a migration that is not on disk here. */
async function foreignMigrations(url: string) {
    const onDisk = new Set(
        readdirSync(join(root, 'packages/db/drizzle')).filter((entry) => /^\d{14}_/.test(entry)),
    );
    const client = new Client({ connectionString: url });
    await client.connect();
    try {
        const ledger = await client.query<{ name: string }>(
            'select name from drizzle.__drizzle_migrations',
        );
        return ledger.rows.some((row) => !onDisk.has(row.name));
    } catch {
        return false;
    } finally {
        await client.end();
    }
}

export function databaseSetup(suffix: string) {
    return async function setup(project: TestProject) {
        const source =
            process.env.TEST_DATABASE_URL ||
            readEnv('TEST_DATABASE_URL') ||
            process.env.DATABASE_URL ||
            readEnv('DATABASE_URL');
        if (!source) throw new Error('Set DATABASE_URL (or put it in .env) to run database tests.');
        const testUrl = new URL(source);
        testUrl.pathname = `${testUrl.pathname.replace(/\/$/, '')}_test_${suffix}`;
        const name = testUrl.pathname.slice(1);
        if (!/^[a-z0-9_]+$/.test(name)) throw new Error(`Refusing to create database "${name}".`);

        const admin = new Client({ connectionString: source });
        await admin.connect();
        const exists = await admin.query('select 1 from pg_database where datname = $1', [name]);
        if (exists.rowCount === 0) await admin.query(`create database "${name}"`);
        // Migrated by another branch: drizzle-kit would fail on migrations this checkout lacks.
        // The database is a throwaway, so start it again.
        else if (await foreignMigrations(testUrl.toString())) {
            await admin.query(`drop database "${name}" with (force)`);
            await admin.query(`create database "${name}"`);
        }
        await admin.end();

        const migrate = spawnSync('bun', ['x', 'drizzle-kit', 'migrate'], {
            cwd: join(root, 'packages/db'),
            env: { ...process.env, DATABASE_URL: testUrl.toString(), MIGRATION_DATABASE_URL: '' },
            encoding: 'utf8',
        });
        if (migrate.status !== 0)
            throw new Error(`Test database migration failed:\n${migrate.stderr}`);

        project.provide('databaseUrl', testUrl.toString());
    };
}

declare module 'vitest' {
    export interface ProvidedContext {
        databaseUrl: string;
    }
}
