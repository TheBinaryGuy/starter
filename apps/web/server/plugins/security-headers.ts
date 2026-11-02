import { appEnv } from '@repo/env/app';
import { definePlugin } from 'nitro';
import { buildCsp, parseOrigins } from '../csp';

/*
 * Every response leaves with the security headers, and every page with a
 * Content Security Policy under a nonce minted here per request. The router
 * reads the nonce from the request context to stamp the inline script it
 * emits; nothing else inline is allowed.
 */

const dev = process.env.NODE_ENV !== 'production';
const extraConnect = parseOrigins(appEnv.CSP_CONNECT_SRC);
const secure = appEnv.APP_ORIGIN.startsWith('https:');

export default definePlugin((nitroApp) => {
    nitroApp.hooks.hook('request', (event) => {
        event.req.context ??= {};
        event.req.context.cspNonce = crypto.randomUUID().replaceAll('-', '');
    });
    nitroApp.hooks.hook('response', (response, event) => {
        const nonce = event.req.context?.cspNonce;
        response.headers.set(
            'Content-Security-Policy',
            buildCsp({ nonce: typeof nonce === 'string' ? nonce : null, dev, extraConnect }),
        );
        response.headers.set('X-Content-Type-Options', 'nosniff');
        response.headers.set('X-Frame-Options', 'DENY');
        // The origin alone: a path or query in Referer could carry a token or a search.
        // Not no-referrer, which can turn the Origin Better Auth checks into null.
        response.headers.set('Referrer-Policy', 'strict-origin');
        response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
        response.headers.set(
            'Permissions-Policy',
            'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
        );
        if (secure)
            response.headers.set(
                'Strict-Transport-Security',
                'max-age=31536000; includeSubDomains',
            );
    });
});
