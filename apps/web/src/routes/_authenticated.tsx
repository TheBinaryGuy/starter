import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';

import { sessionQuery } from '@/lib/session';

/* Everything under here needs a session; without one, sign in and come back. */
export const Route = createFileRoute('/_authenticated')({
    beforeLoad: async ({ context, location }) => {
        const session = await context.queryClient.fetchQuery(sessionQuery);
        if (!session) throw redirect({ to: '/login', search: { redirect: location.href } });
        return { session };
    },
    component: Outlet,
});
