import { initLogger, loggingOptions, redactEvent } from '@repo/logging';
import { definePlugin } from 'nitro';

const oneRequestPerConnection = process.env.CI === 'true';

export default definePlugin((nitroApp) => {
    let privacyConfigured = false;
    nitroApp.hooks.hook('request', (event) => {
        if (!privacyConfigured) {
            // Module options cross a JSON build boundary. Install the function policy at runtime.
            initLogger({
                ...loggingOptions,
                redact: { ...loggingOptions.redact, transform: redactEvent },
            });
            privacyConfigured = true;
        }
        event.req.context ??= {};
        // Generate correlation IDs here; caller-controlled header values never enter logs.
        event.req.context.requestId = crypto.randomUUID();
    });

    nitroApp.hooks.hook('response', (response, event) => {
        const requestId = event.req.context?.requestId;
        if (typeof requestId === 'string') response.headers.set('x-request-id', requestId);
        // CI runs the browser suite against this build with nothing in front of it: one
        // request per connection there, as the dev server does in CI (vite.config.ts).
        if (oneRequestPerConnection) response.headers.set('connection', 'close');
    });
});
