import type { RequestLogger } from '@repo/logging';
import { withoutDetail } from '@repo/logging/nitro';
import { createCsrfMiddleware, createMiddleware, createStart } from '@tanstack/react-start';

/*
 * Every server function's errors pass through here before Start serializes or
 * prints them: what escaped is logged on the request's event as its class and
 * code, and what goes on is a bare error (see withoutDetail), so a message that
 * carries an address or a query never reaches the browser or the console.
 */
const functionErrors = createMiddleware({ type: 'function' }).server(async ({ next }) => {
    try {
        return await next();
    } catch (error) {
        throw await withoutDetail(
            error,
            async () =>
                (await import('nitro/context')).useRequest().context?.log as
                    | RequestLogger
                    | undefined,
        );
    }
});

/* Server functions are same-origin RPC: a request another site makes is refused. */
const csrf = createCsrfMiddleware({ filter: (context) => context.handlerType === 'serverFn' });

export const startInstance = createStart(() => ({
    requestMiddleware: [csrf],
    functionMiddleware: [functionErrors],
}));
