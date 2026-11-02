import { createFileRoute } from '@tanstack/react-router';

import { TodoList } from '@/components/todo-list';

export const Route = createFileRoute('/_authenticated/app/')({
    head: () => ({ meta: [{ title: 'Home' }] }),
    component: HomePage,
});

function HomePage() {
    const { session } = Route.useRouteContext();
    return (
        <div className="grid max-w-2xl gap-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                    Hello, {session.user.name.split(' ')[0]}
                </h1>
                <p className="text-muted-foreground">This is where your app starts.</p>
            </div>
            <TodoList />
        </div>
    );
}
