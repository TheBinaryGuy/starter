import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

/* Settings every server process shares: the web app and the migration job. */
export const appEnv = createEnv({
    server: {
        // The product's name, in page titles and emails.
        APP_NAME: z.string().trim().min(1).max(60).default('App'),
        APP_ORIGIN: z
            .url()
            .refine((value) => {
                const url = new URL(value);
                return (
                    url.pathname === '/' &&
                    !url.search &&
                    !url.hash &&
                    !url.username &&
                    !url.password &&
                    (url.protocol === 'https:' ||
                        (url.protocol === 'http:' &&
                            ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))
                );
            }, 'Use an HTTPS origin or HTTP localhost without a path, query, or credentials.')
            .transform((value) => new URL(value).origin),
        // Origins the browser may talk to besides the app, for the page's Content Security
        // Policy (an analytics endpoint, an object store). Space or comma separated.
        CSP_CONNECT_SRC: z.string().max(2000).optional(),
    },
    runtimeEnv: process.env,
    emptyStringAsUndefined: true,
});
