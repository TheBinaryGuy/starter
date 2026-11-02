import evlog from '@repo/logging/nitro';
import { loggingOptions } from '@repo/logging';
import { defineConfig } from 'nitro';

export default defineConfig({
    preset: 'bun',
    // Elysia loads these through runtime require(), outside the bundler's import graph.
    traceDeps: ['typebox*', 'exact-mirror*'],
    experimental: { asyncContext: true },
    plugins: [
        './server/plugins/environment.ts',
        './server/plugins/request-context.ts',
        './server/plugins/security-headers.ts',
        './server/plugins/database.ts',
    ],
    modules: [evlog(loggingOptions)],
});
