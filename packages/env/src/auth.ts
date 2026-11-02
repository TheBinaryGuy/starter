import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';
import { appEnv } from './app';

/* Better Auth's settings, on top of the shared app settings. */
export const authEnv = createEnv({
    extends: [appEnv],
    server: {
        // Signs session cookies and encrypts OAuth tokens. `bun run setup` generates one;
        // changing it signs everyone out.
        BETTER_AUTH_SECRET: z.string().min(32, 'Use at least 32 characters (bun run setup).'),
        // Behind a reverse proxy, the header that carries the real client address
        // (`x-forwarded-for`, `cf-connecting-ip`), for rate limits. Unset: the socket address.
        TRUSTED_PROXY_HEADER: z
            .string()
            .regex(/^[a-z0-9-]{1,64}$/)
            .optional(),
        // Social sign-in, each on when both its values are set.
        GITHUB_CLIENT_ID: z.string().min(1).optional(),
        GITHUB_CLIENT_SECRET: z.string().min(1).optional(),
        GOOGLE_CLIENT_ID: z.string().min(1).optional(),
        GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
    },
    runtimeEnv: process.env,
    emptyStringAsUndefined: true,
});

export function validateAuthEnv() {
    for (const provider of ['GITHUB', 'GOOGLE'] as const)
        if (
            Boolean(authEnv[`${provider}_CLIENT_ID`]) !==
            Boolean(authEnv[`${provider}_CLIENT_SECRET`])
        )
            throw new Error(`Set both ${provider}_CLIENT_ID and ${provider}_CLIENT_SECRET.`);
}
