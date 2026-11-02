import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react from '@vitejs/plugin-react';
import { nitro } from 'nitro/vite';
import { defineConfig, type Plugin } from 'vite';

/*
 * In CI, every dev-server connection carries one request. WebKit reuses idle
 * connections, and a POST on one the server is closing fails without a retry
 * ("The network connection was lost", ECONNRESET). Without reuse there is no
 * such moment. Locally the defaults stay, and production sits behind a proxy
 * that owns the browser's connections.
 */
function oneRequestPerConnectionInCI(): Plugin {
    return {
        name: 'starter:one-request-per-connection',
        configureServer(server) {
            if (!process.env.CI) return;
            // Ahead of Vite's own listener, which may already have answered by the time a later one runs.
            server.httpServer?.prependListener('request', (_request, response) => {
                if (!response.headersSent) response.setHeader('connection', 'close');
            });
        },
    };
}

export default defineConfig({
    server: {
        host: '0.0.0.0',
        port: Number(process.env.PORT ?? 5173),
        // IP addresses are allowed by default; this adds Tailscale hostnames.
        allowedHosts: ['.ts.net'],
    },
    resolve: { tsconfigPaths: true },
    build: {
        rolldownOptions: {
            // Base UI and TanStack Query mark modules "use client" for React Server Components,
            // which this app doesn't use; the bundler warns about every one of them.
            onLog(level, log, handler) {
                if (log.code === 'MODULE_LEVEL_DIRECTIVE') return;
                handler(level, log);
            },
        },
    },
    plugins: [oneRequestPerConnectionInCI(), tailwindcss(), tanstackStart(), nitro(), react()],
});
