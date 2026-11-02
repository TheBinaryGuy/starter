import { db, schema } from '@repo/db';
import { composePasswordResetEmail, composeVerificationEmail, sendEmail } from '@repo/emails';
import { authEnv } from '@repo/env/auth';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { tanstackStartCookies } from 'better-auth/tanstack-start';

/*
 * The header Better Auth reads the client's address from, for its rate limits.
 * The web server sets it on every auth request from the socket or the trusted
 * proxy header (clientAddress) after dropping whatever the client sent, so
 * nobody picks their own address to dodge a limit.
 */
export const CLIENT_ADDRESS_HEADER = 'x-starter-client-address';

export function clientAddress(request: Request, remoteAddress?: string) {
    const header = authEnv.TRUSTED_PROXY_HEADER;
    if (header) {
        // The proxy appends the address it saw; anything before it the client could have written.
        const last = request.headers.get(header)?.split(',').at(-1)?.trim();
        if (last && last.length <= 64) return last;
    }
    return remoteAddress?.trim() || 'unknown';
}

const socialProviders = {
    ...(authEnv.GITHUB_CLIENT_ID && authEnv.GITHUB_CLIENT_SECRET
        ? {
              github: {
                  clientId: authEnv.GITHUB_CLIENT_ID,
                  clientSecret: authEnv.GITHUB_CLIENT_SECRET,
              },
          }
        : {}),
    ...(authEnv.GOOGLE_CLIENT_ID && authEnv.GOOGLE_CLIENT_SECRET
        ? {
              google: {
                  clientId: authEnv.GOOGLE_CLIENT_ID,
                  clientSecret: authEnv.GOOGLE_CLIENT_SECRET,
              },
          }
        : {}),
};

export type SocialProvider = 'github' | 'google';

/* The social sign-ins this server offers, for the sign-in page to draw. */
export function enabledSocialProviders() {
    return Object.keys(socialProviders) as SocialProvider[];
}

export const auth = betterAuth({
    appName: authEnv.APP_NAME,
    baseURL: authEnv.APP_ORIGIN,
    basePath: '/api/auth',
    secret: authEnv.BETTER_AUTH_SECRET,
    trustedOrigins: [authEnv.APP_ORIGIN],
    database: drizzleAdapter(db, { provider: 'pg', schema }),
    advanced: {
        database: { generateId: 'uuid' },
        ipAddress: { ipAddressHeaders: [CLIENT_ADDRESS_HEADER] },
    },
    emailAndPassword: {
        enabled: true,
        requireEmailVerification: true,
        minPasswordLength: 10,
        maxPasswordLength: 128,
        resetPasswordTokenExpiresIn: 60 * 60,
        revokeSessionsOnPasswordReset: true,
        async sendResetPassword({ user, url }) {
            await sendEmail(await composePasswordResetEmail(user.email, url, authEnv.APP_NAME));
        },
    },
    emailVerification: {
        sendOnSignUp: true,
        // A sign-in with an unconfirmed address sends a fresh link instead of a dead end.
        sendOnSignIn: true,
        autoSignInAfterVerification: true,
        expiresIn: 60 * 60,
        async sendVerificationEmail({ user, url }) {
            await sendEmail(await composeVerificationEmail(user.email, url, authEnv.APP_NAME));
        },
    },
    socialProviders,
    account: {
        // A social sign-in with a verified address joins the account that address already has.
        accountLinking: { enabled: true, trustedProviders: ['github', 'google'] },
    },
    user: {
        deleteUser: { enabled: true },
    },
    /*
     * Better Auth and Better Call print a failure whole (message and stack, which can
     * hold an address or a query) unless told otherwise. Here a failure that isn't one
     * of Better Auth's own answers is thrown out of auth.handler instead, where the web
     * server logs its class and code only and answers 500. Better Auth's own log lines
     * keep their message and drop the objects passed with them.
     */
    onAPIError: { throw: true },
    logger: {
        level: 'warn',
        log: (level, message) => {
            console[level === 'error' ? 'error' : 'warn'](`[better-auth] ${level}: ${message}`);
        },
    },
    rateLimit: {
        enabled: process.env.NODE_ENV === 'production',
        // In memory: one server process. Use `storage: 'database'` (and a rateLimit table)
        // or secondary storage once more than one instance serves traffic.
        window: 60,
        max: 100,
    },
    // tanstackStartCookies must stay last: it sets cookies from server functions.
    plugins: [tanstackStartCookies()],
});

export type Session = typeof auth.$Infer.Session;
