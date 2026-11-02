import { initLogger, type WideEvent } from 'evlog';

/*
 * Leaves that never reach a log by these names, wherever they sit in an event.
 * Add a name here before logging anything new that could hold a secret or a
 * person's details.
 */
export const loggingOptions = {
    env: { service: 'web' },
    routes: { '/api/**': { service: 'api' } },
    redact: {
        paths: [
            '*password*',
            '*Password*',
            '*secret*',
            '*Secret*',
            '*token*',
            '*Token*',
            '*key*',
            '*Key*',
            '*credential*',
            '*Credential*',
            'body',
            'requestBody',
            'responseBody',
            'headers',
            'cookies',
            'cookie',
            'authorization',
            'email',
            'name',
            'query',
            'search',
            'params',
            'error.data',
            'error.cause',
            'error.stack',
        ],
    },
};

export function initProcessLogger(service: string) {
    initLogger({
        ...loggingOptions,
        env: { service },
        redact: { ...loggingOptions.redact, transform: redactEvent },
    });
}

/* What an auth request's event keeps; everything else is dropped, whatever a handler attached. */
const safeAuthFields = new Set([
    'timestamp',
    'level',
    'service',
    'environment',
    'version',
    'commitHash',
    'region',
    'method',
    'path',
    'requestId',
    'status',
    'duration',
    'durationMs',
    'failure',
]);

const FAILURE_TOKEN = /^[A-Za-z0-9_.:-]{1,64}$/;
export type Failure = { kind: string; code?: string; cause?: Failure };

/*
 * Only an error's class name and machine code survive, and the same for what
 * caused it: enough to tell an SMTP refusal from a database outage, never a
 * message or stack that could carry an address.
 */
export function sanitizeFailure(value: unknown, depth = 3): Failure | undefined {
    if (!value || typeof value !== 'object') return undefined;
    const input = value as Record<string, unknown>;
    // `kind`, not `name`: bare `name` is a redacted leaf everywhere else in the event.
    const kind =
        typeof input.name === 'string' && FAILURE_TOKEN.test(input.name) ? input.name : 'unknown';
    const code =
        typeof input.code === 'string' && FAILURE_TOKEN.test(input.code) ? input.code : undefined;
    const cause =
        depth > 1 && input.cause !== value ? sanitizeFailure(input.cause, depth - 1) : undefined;
    return { kind, ...(code ? { code } : {}), ...(cause ? { cause } : {}) };
}

/*
 * Better Auth paths that carry a secret in the path itself (a verification or
 * reset token, an OAuth callback's code sits in the query, which is dropped
 * anyway). Logged as their patterns.
 */
const secretPaths: [RegExp, string][] = [
    [/^\/api\/auth\/reset-password\/[^/]+$/, '/api/auth/reset-password/:token'],
    [/^\/api\/auth\/callback\/[^/]+$/, '/api/auth/callback/:provider'],
];

/* The path as the router matches it: percent-decoded, lowercased, slashes collapsed. */
function routePath(path: string) {
    try {
        return decodeURIComponent(path)
            .toLowerCase()
            .replace(/\/{2,}/g, '/');
    } catch {
        return '/unreadable';
    }
}

/*
 * Runtime transform: evlog applies it before console output and before drains.
 * Queries never reach the log. Auth requests keep an allowlist of fields only,
 * so a future handler that attaches a raw body or user cannot leak it.
 */
export function redactEvent(event: WideEvent) {
    let path = routePath(typeof event.path === 'string' ? (event.path.split(/[?#]/)[0] ?? '') : '');
    for (const [pattern, replacement] of secretPaths)
        if (pattern.test(path)) path = path.replace(pattern, replacement);
    event.path = path;
    if (!/^\/api\/auth(\/|$)/.test(path)) return;
    for (const key of Object.keys(event)) if (!safeAuthFields.has(key)) delete event[key];
    if (event.failure) event.failure = sanitizeFailure(event.failure);
}
