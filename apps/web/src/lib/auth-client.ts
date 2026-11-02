import { createAuthClient } from 'better-auth/react';

/* Better Auth's browser client, against this origin's /api/auth. */
export const authClient = createAuthClient({ basePath: '/api/auth' });

/* Better Auth's error, as a sentence to show. */
export function authMessage(error: { message?: string; status?: number } | null | undefined) {
    if (error?.status === 429) return 'Too many attempts. Wait a minute and try again.';
    return error?.message || 'Something went wrong. Try again.';
}
