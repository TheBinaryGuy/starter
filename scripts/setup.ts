import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';

/*
 * Writes .env from .env.example with fresh secrets: the Postgres password (also
 * inside DATABASE_URL) and BETTER_AUTH_SECRET. Refuses to overwrite an existing
 * .env, since a new auth secret signs everyone out and a new database password
 * no longer matches the volume Postgres already initialised.
 */
const target = new URL('../.env', import.meta.url);
if (existsSync(target)) {
    console.error('.env already exists. Delete it first if you really want new secrets.');
    process.exit(1);
}

const password = randomBytes(18).toString('base64url');
const secret = randomBytes(32).toString('base64url');
const example = await Bun.file(new URL('../.env.example', import.meta.url)).text();
const env = example
    .replaceAll('change-me', password)
    .replace(/^BETTER_AUTH_SECRET=.*$/m, `BETTER_AUTH_SECRET=${secret}`);

await Bun.write(target, env);
console.log('Wrote .env. Next: bun run infra:up && bun run db:migrate && bun run dev');
