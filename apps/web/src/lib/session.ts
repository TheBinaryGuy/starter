import { queryOptions } from '@tanstack/react-query';
import { createServerFn } from '@tanstack/react-start';
import { getRequestHeaders } from '@tanstack/react-start/server';

/*
 * The current session, read on the server from the request's cookie. Routes
 * read it with `queryClient.fetchQuery(sessionQuery)`, which asks again once the
 * cached answer is stale or invalidated (ensureQueryData would not); anything
 * that signs in or out, or changes the user, invalidates it. The server still
 * checks the cookie on every API call, whatever the page believes.
 */
export const getSessionServerFn = createServerFn().handler(async () => {
    const { auth } = await import('@repo/auth/server');
    const session = await auth.api.getSession({ headers: getRequestHeaders() });
    if (!session) return null;
    const { user } = session;
    return {
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image ?? null,
            emailVerified: user.emailVerified,
        },
        session: { id: session.session.id, expiresAt: session.session.expiresAt.toISOString() },
    };
});

export type SessionView = Awaited<ReturnType<typeof getSessionServerFn>>;

export const sessionQuery = queryOptions({
    queryKey: ['session'],
    queryFn: () => getSessionServerFn(),
    staleTime: 60_000,
});

/* The social sign-ins this server offers, so the sign-in page draws only those. */
export const getSocialProvidersServerFn = createServerFn().handler(async () => {
    const { enabledSocialProviders } = await import('@repo/auth/server');
    return enabledSocialProviders();
});

/* The app's name, from APP_NAME, for titles. */
export const getAppNameServerFn = createServerFn().handler(async () => {
    const { appEnv } = await import('@repo/env/app');
    return appEnv.APP_NAME;
});

/* Where a sign-in may send the person afterwards: a path on this site, never another origin. */
export function safeRedirect(value: unknown, fallback = '/app') {
    if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//'))
        return fallback;
    if (value.includes('\\')) return fallback;
    return value;
}
