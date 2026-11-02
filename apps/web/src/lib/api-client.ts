import { treaty } from '@elysia/eden';
import type { Api } from '@/lib/api.server';

/* A typed client for the Elysia API. Browser only: it calls this page's origin. */
let client: ReturnType<typeof treaty<Api>> | undefined;
export function apiClient() {
    client ??= treaty<Api>(window.location.origin, {
        fetch: { credentials: 'same-origin', cache: 'no-store' },
        onRequest: () => ({ signal: AbortSignal.timeout(30_000) }),
    });
    return client.api;
}

/* The response's data, or an Error with the server's message (and code, when it gave one). */
export async function unwrap<R extends { data: unknown; error: unknown }>(pending: Promise<R>) {
    const { data, error } = await pending;
    if (error) {
        const value = (error as { value?: { message?: unknown; code?: unknown } }).value;
        const message = typeof value?.message === 'string' ? value.message : 'Try again.';
        const code = typeof value?.code === 'string' ? value.code : undefined;
        throw Object.assign(new Error(message), code ? { code } : {});
    }
    return data as NonNullable<R['data']>;
}
