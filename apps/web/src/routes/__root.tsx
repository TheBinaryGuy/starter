import type { RequestLogger } from '@repo/logging';
import { safeErrorHandler } from '@repo/logging/nitro';
import type { QueryClient } from '@tanstack/react-query';
import {
    createRootRouteWithContext,
    HeadContent,
    Link,
    Outlet,
    Scripts,
    ScriptOnce,
} from '@tanstack/react-router';
import { createMiddleware } from '@tanstack/react-start';
import { useEffect, type ReactNode } from 'react';

import { ThemeProvider, useTheme } from '@/components/theme-provider';
import { Button, buttonVariants } from '@/components/ui/button';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { getAppNameServerFn } from '@/lib/session';
import { getThemeServerFn, type Theme } from '@/lib/theme';
import styles from '@/styles.css?url';

/* Before first paint, so a device in dark mode never flashes light under `system`. */
const systemThemeScript = `if (matchMedia('(prefers-color-scheme: dark)').matches) document.documentElement.classList.add('dark')`;

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
    server: {
        middleware: [
            createMiddleware().server(
                safeErrorHandler(
                    async () =>
                        (await import('nitro/context')).useRequest().context?.log as
                            | RequestLogger
                            | undefined,
                ),
            ),
        ],
    },
    loader: async () => ({
        theme: await getThemeServerFn(),
        appName: await getAppNameServerFn(),
    }),
    head: ({ loaderData }) => ({
        meta: [
            { charSet: 'utf-8' },
            { name: 'viewport', content: 'width=device-width, initial-scale=1' },
            { title: loaderData?.appName ?? 'App' },
        ],
        links: [
            { rel: 'stylesheet', href: styles },
            { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
        ],
    }),
    // Pages can show who is signed in: never cached by a browser or a proxy.
    headers: () => ({ 'Cache-Control': 'private, no-store', Vary: 'Cookie' }),
    shellComponent: RootDocument,
    component: Outlet,
    notFoundComponent: () => (
        <StatusPage title="This page doesn’t exist." description="The link may be out of date." />
    ),
    errorComponent: ({ reset }) => (
        <StatusPage
            title="Something went wrong."
            description="Try again, and if it keeps happening, reload the page."
            action={
                <Button onClick={reset} variant="outline">
                    Try again
                </Button>
            }
        />
    ),
});

function RootDocument({ children }: { children: ReactNode }) {
    const { theme } = Route.useLoaderData();
    return (
        <ThemeProvider theme={theme}>
            <Html>{children}</Html>
        </ThemeProvider>
    );
}

function Html({ children }: { children: ReactNode }) {
    const { theme } = useTheme();
    useThemeClass(theme);
    return (
        // The system script may add `dark` before React hydrates.
        <html lang="en" className={theme === 'dark' ? 'dark' : undefined} suppressHydrationWarning>
            <head>
                <HeadContent />
                {theme === 'system' ? <ScriptOnce>{systemThemeScript}</ScriptOnce> : null}
            </head>
            <body className="min-h-svh antialiased">
                <TooltipProvider>{children}</TooltipProvider>
                <Toaster />
                <Scripts />
            </body>
        </html>
    );
}

/*
 * The `dark` class after hydration, for every theme: React only renders it for an
 * explicit dark, and under `system` it follows the device as it changes. One place
 * decides, so leaving `system` never strands a class the listener added.
 */
function useThemeClass(theme: Theme) {
    useEffect(() => {
        const media = matchMedia('(prefers-color-scheme: dark)');
        const apply = () =>
            document.documentElement.classList.toggle(
                'dark',
                theme === 'dark' || (theme === 'system' && media.matches),
            );
        apply();
        if (theme !== 'system') return;
        media.addEventListener('change', apply);
        return () => media.removeEventListener('change', apply);
    }, [theme]);
}

function StatusPage({
    title,
    description,
    action,
}: {
    title: string;
    description: string;
    action?: ReactNode;
}) {
    return (
        <main className="mx-auto flex min-h-svh max-w-md flex-col items-start justify-center gap-4 px-6">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="text-muted-foreground">{description}</p>
            <div className="flex gap-2">
                {action}
                <Link to="/" className={buttonVariants({ variant: 'ghost' })}>
                    Go home
                </Link>
            </div>
        </main>
    );
}
