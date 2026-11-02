import { useQuery } from '@tanstack/react-query';
import { createFileRoute, getRouteApi, Link } from '@tanstack/react-router';

import { SiteHeader } from '@/components/site-header';
import { buttonVariants } from '@/components/ui/button';
import { sessionQuery } from '@/lib/session';

const root = getRouteApi('__root__');

export const Route = createFileRoute('/')({
    loader: ({ context }) => context.queryClient.fetchQuery(sessionQuery),
    component: HomePage,
});

function HomePage() {
    const { appName } = root.useLoaderData();
    const session = useQuery(sessionQuery).data;
    return (
        <div className="flex min-h-svh flex-col">
            <SiteHeader appName={appName}>
                {session ? (
                    <Link to="/app" className={buttonVariants({ variant: 'ghost' })}>
                        Open app
                    </Link>
                ) : (
                    <Link to="/login" className={buttonVariants({ variant: 'ghost' })}>
                        Sign in
                    </Link>
                )}
            </SiteHeader>
            <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-4 py-24 sm:px-6">
                <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
                    {appName}
                </h1>
                <p className="mt-4 max-w-xl text-lg text-pretty text-muted-foreground">
                    TanStack Start, Elysia, Better Auth and Drizzle on Postgres. Replace this page
                    with what you are building.
                </p>
                <div className="mt-8 flex flex-wrap gap-2">
                    {session ? (
                        <Link to="/app" className={buttonVariants({ size: 'lg' })}>
                            Open app
                        </Link>
                    ) : (
                        <>
                            <Link to="/register" className={buttonVariants({ size: 'lg' })}>
                                Create an account
                            </Link>
                            <Link
                                to="/login"
                                className={buttonVariants({ size: 'lg', variant: 'outline' })}
                            >
                                Sign in
                            </Link>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
