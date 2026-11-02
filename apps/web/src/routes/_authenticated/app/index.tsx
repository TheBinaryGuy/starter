import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { apiClient, unwrap } from '@/lib/api-client';

export const Route = createFileRoute('/_authenticated/app/')({
    head: () => ({ meta: [{ title: 'Home' }] }),
    component: HomePage,
});

function HomePage() {
    const { session } = Route.useRouteContext();
    // The Elysia API through Eden, typed end to end: GET /api/me in lib/api.server.ts.
    const me = useQuery({ queryKey: ['me'], queryFn: () => unwrap(apiClient().me.get()) });

    return (
        <div className="grid gap-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                    Hello, {session.user.name.split(' ')[0]}
                </h1>
                <p className="text-muted-foreground">This is where your app starts.</p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>From the API</CardTitle>
                    <CardDescription>
                        GET /api/me, answered by Elysia with the signed-in user.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {me.data ? (
                        <pre className="overflow-x-auto rounded-lg bg-muted p-4 font-mono text-sm">
                            {JSON.stringify(me.data, null, 4)}
                        </pre>
                    ) : me.error ? (
                        <p className="text-sm text-destructive">{me.error.message}</p>
                    ) : (
                        <Skeleton className="h-24 w-full" />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
