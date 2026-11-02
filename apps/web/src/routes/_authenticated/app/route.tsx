import { createFileRoute, getRouteApi, Link, Outlet } from '@tanstack/react-router';

import { SiteHeader } from '@/components/site-header';
import { UserMenu } from '@/components/user-menu';
import { buttonVariants } from '@/components/ui/button';

const root = getRouteApi('__root__');

export const Route = createFileRoute('/_authenticated/app')({
    component: AppLayout,
});

function AppLayout() {
    const { appName } = root.useLoaderData();
    const { session } = Route.useRouteContext();
    return (
        <div className="flex min-h-svh flex-col">
            <SiteHeader appName={appName}>
                <nav className="mr-2 flex items-center gap-1">
                    <Link
                        to="/app"
                        activeOptions={{ exact: true }}
                        className={buttonVariants({ variant: 'ghost' })}
                        activeProps={{ 'aria-current': 'page', className: 'bg-muted' }}
                    >
                        Home
                    </Link>
                    <Link
                        to="/app/account"
                        className={buttonVariants({ variant: 'ghost' })}
                        activeProps={{ 'aria-current': 'page', className: 'bg-muted' }}
                    >
                        Account
                    </Link>
                </nav>
                <UserMenu user={session.user} />
            </SiteHeader>
            <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
                <Outlet />
            </main>
        </div>
    );
}
