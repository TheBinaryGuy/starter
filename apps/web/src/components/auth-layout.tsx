import { getRouteApi, Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { ThemeToggle } from '@/components/theme-toggle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const root = getRouteApi('__root__');

/* The sign-in, sign-up and password pages: one card, centred, nothing else to look at. */
export function AuthLayout({
    title,
    description,
    children,
    footer,
}: {
    title: string;
    description?: ReactNode;
    children: ReactNode;
    footer?: ReactNode;
}) {
    const { appName } = root.useLoaderData();
    return (
        <div className="flex min-h-svh flex-col">
            <header className="flex h-14 items-center justify-between px-4 sm:px-6">
                <Link to="/" className="font-semibold tracking-tight">
                    {appName}
                </Link>
                <ThemeToggle />
            </header>
            <main className="flex flex-1 items-start justify-center px-4 pt-8 pb-16 sm:items-center sm:pt-0">
                <div className="w-full max-w-sm">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-xl">{title}</CardTitle>
                            {description ? <CardDescription>{description}</CardDescription> : null}
                        </CardHeader>
                        <CardContent>{children}</CardContent>
                    </Card>
                    {footer ? (
                        <p className="mt-4 text-center text-sm text-muted-foreground">{footer}</p>
                    ) : null}
                </div>
            </main>
        </div>
    );
}
