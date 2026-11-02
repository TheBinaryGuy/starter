import { useForm } from '@tanstack/react-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PencilIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';

import { Form, SubmitButton } from '@/components/form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { apiClient, unwrap } from '@/lib/api-client';
import { cn } from '@/lib/utils';

/*
 * The example app: a todo list on the Elysia API (lib/api.server.ts), through
 * Eden, with TanStack Query holding the list. Replace it with your own.
 */

const TITLE_MAX = 500;
const title = z
    .string()
    .trim()
    .min(1, 'Write something to do.')
    .max(TITLE_MAX, `Keep it under ${TITLE_MAX} characters.`);

const todosQuery = {
    queryKey: ['todos'],
    queryFn: () => unwrap(apiClient().todos.get()),
};

type TodoItem = Awaited<ReturnType<typeof todosQuery.queryFn>>['todos'][number];

/* Changes the cached list in place, so the page answers before the next fetch. */
function useTodosCache() {
    const queryClient = useQueryClient();
    return {
        update(change: (todos: TodoItem[]) => TodoItem[]) {
            queryClient.setQueryData<{ todos: TodoItem[] }>(todosQuery.queryKey, (old) =>
                old ? { todos: change(old.todos) } : old,
            );
        },
        refetch: () => queryClient.invalidateQueries({ queryKey: todosQuery.queryKey }),
    };
}

export function TodoList() {
    const todos = useQuery(todosQuery);
    const cache = useTodosCache();
    const form = useForm({
        defaultValues: { title: '' },
        validators: { onSubmit: z.object({ title }) },
        onSubmit: async ({ value, formApi }) => {
            try {
                const { todo } = await unwrap(
                    apiClient().todos.post({ title: value.title.trim() }),
                );
                cache.update((list) => [...list, todo]);
                // Only if it still holds what was sent: the next one may already be half typed.
                if (formApi.getFieldValue('title') === value.title) formApi.reset();
            } catch (error) {
                toast.error(error instanceof Error ? error.message : 'Could not add that.');
            }
        },
    });

    const left = todos.data?.todos.filter((todo) => !todo.done).length ?? 0;
    return (
        <Card>
            <CardHeader>
                <CardTitle>Todos</CardTitle>
                <CardDescription>
                    {todos.data
                        ? todos.data.todos.length === 0
                            ? 'Nothing yet. Add the first thing to do.'
                            : `${left} left of ${todos.data.todos.length}.`
                        : 'Loading your list.'}
                </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
                <Form onSubmit={() => form.handleSubmit()} className="flex gap-2">
                    <form.Field name="title">
                        {(field) => (
                            <Input
                                name={field.name}
                                value={field.state.value}
                                onChange={(event) => field.handleChange(event.target.value)}
                                onBlur={field.handleBlur}
                                placeholder="Something to do"
                                aria-label="New todo"
                                maxLength={TITLE_MAX}
                                autoComplete="off"
                            />
                        )}
                    </form.Field>
                    <form.Subscribe selector={(state) => state.isSubmitting}>
                        {(submitting) => <SubmitButton pending={submitting}>Add</SubmitButton>}
                    </form.Subscribe>
                </Form>
                <form.Subscribe selector={(state) => state.errorMap.onSubmit}>
                    {(error) =>
                        error ? (
                            <p className="-mt-2 text-sm text-destructive">
                                {Object.values(error)
                                    .flat()
                                    .map((issue) => (issue as { message?: string }).message)
                                    .find(Boolean)}
                            </p>
                        ) : null
                    }
                </form.Subscribe>
                {todos.data ? (
                    todos.data.todos.length > 0 ? (
                        <ul className="divide-y rounded-lg border">
                            {todos.data.todos.map((todo) => (
                                <TodoRow key={todo.id} todo={todo} />
                            ))}
                        </ul>
                    ) : null
                ) : todos.error ? (
                    <p className="text-sm text-destructive">{todos.error.message}</p>
                ) : (
                    <Skeleton className="h-24 w-full" />
                )}
            </CardContent>
        </Card>
    );
}

function TodoRow({ todo }: { todo: TodoItem }) {
    const cache = useTodosCache();
    const [editing, setEditing] = useState(false);

    const update = useMutation({
        mutationFn: (changes: { title?: string; done?: boolean }) =>
            unwrap(apiClient().todos({ id: todo.id }).patch(changes)),
        // Shown at once; put back if the server says no.
        onMutate: (changes) =>
            cache.update((list) =>
                list.map((item) => (item.id === todo.id ? { ...item, ...changes } : item)),
            ),
        onSuccess: ({ todo: saved }) =>
            cache.update((list) => list.map((item) => (item.id === saved.id ? saved : item))),
        onError: (error) => {
            toast.error(error.message);
            void cache.refetch();
        },
    });
    const remove = useMutation({
        mutationFn: () => unwrap(apiClient().todos({ id: todo.id }).delete()),
        onSuccess: () => cache.update((list) => list.filter((item) => item.id !== todo.id)),
        onError: (error) => {
            toast.error(error.message);
            void cache.refetch();
        },
    });

    function save(value: string) {
        setEditing(false);
        const next = value.trim();
        if (!next || next === todo.title) return;
        if (next.length > TITLE_MAX) {
            toast.error(`Keep it under ${TITLE_MAX} characters.`);
            return;
        }
        update.mutate({ title: next });
    }

    return (
        <li className="flex min-h-12 items-center gap-3 px-3 py-2">
            <Checkbox
                checked={todo.done}
                onCheckedChange={(done) => update.mutate({ done })}
                aria-label={todo.title}
            />
            {editing ? (
                <Input
                    // Focus follows the Edit press that opened the field.
                    ref={(node) => node?.focus()}
                    defaultValue={todo.title}
                    aria-label={`Edit “${todo.title}”`}
                    maxLength={TITLE_MAX}
                    onBlur={(event) => save(event.currentTarget.value)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') save(event.currentTarget.value);
                        if (event.key === 'Escape') setEditing(false);
                    }}
                />
            ) : (
                <span
                    className={cn(
                        'min-w-0 flex-1 text-sm break-words',
                        todo.done && 'text-muted-foreground line-through',
                    )}
                >
                    {todo.title}
                </span>
            )}
            {editing ? null : (
                <div className="flex shrink-0 gap-1">
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Edit “${todo.title}”`}
                        onClick={() => setEditing(true)}
                    >
                        <PencilIcon />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Delete “${todo.title}”`}
                        disabled={remove.isPending}
                        onClick={() => remove.mutate()}
                    >
                        <Trash2Icon />
                    </Button>
                </div>
            )}
        </li>
    );
}
