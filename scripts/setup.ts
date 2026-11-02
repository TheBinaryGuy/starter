import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/*
 * Writes .env from .env.example for this project: fresh secrets (the Postgres
 * password, also inside DATABASE_URL, and BETTER_AUTH_SECRET), and the app's
 * name taken from the project's folder, so `my-app` becomes "My App". Each
 * project's Postgres runs in its own containers (Compose names them after the
 * folder), so the standard `postgres` user and database are enough. Refuses to
 * overwrite an existing .env,
 * since a new auth secret signs everyone out and a new database password no
 * longer matches the volume Postgres already initialised.
 */
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const target = `${root}/.env`;
if (existsSync(target)) {
    console.error('.env already exists. Delete it first if you really want new secrets.');
    process.exit(1);
}

const folder = basename(root);
const title =
    folder
        .split(/[^A-Za-z0-9]+/)
        .filter(Boolean)
        .map((word) => word[0]!.toUpperCase() + word.slice(1))
        .join(' ') || 'App';

const password = randomBytes(18).toString('base64url');
const secret = randomBytes(32).toString('base64url');
const example = await Bun.file(`${root}/.env.example`).text();
const env = example
    .replaceAll('change-me', password)
    .replace(/^BETTER_AUTH_SECRET=.*$/m, `BETTER_AUTH_SECRET=${secret}`)
    .replace(/^APP_NAME=.*$/m, `APP_NAME="${title}"`)
    .replace(/^EMAIL_FROM="App /m, `EMAIL_FROM="${title} `);

await Bun.write(target, env);
console.log(
    `Wrote .env for "${title}". Next: bun run infra:up && bun run db:migrate && bun run dev`,
);
