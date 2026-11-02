import { useForm } from '@tanstack/react-form';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';

import { Form, SubmitButton, TextField } from '@/components/form';
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { FieldGroup } from '@/components/ui/field';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { authClient, authMessage } from '@/lib/auth-client';
import { sessionQuery } from '@/lib/session';
import { name, password } from '@/lib/validation';

export const Route = createFileRoute('/_authenticated/app/account')({
    head: () => ({ meta: [{ title: 'Account' }] }),
    component: AccountPage,
});

function AccountPage() {
    // A GitHub or Google account has no password until one is set: no password card,
    // and deletion leans on a recent sign-in instead.
    const accounts = useQuery({
        queryKey: ['accounts'],
        queryFn: async () => {
            const { data, error } = await authClient.listAccounts();
            if (error) throw new Error(authMessage(error));
            return data;
        },
    });
    const hasPassword = accounts.data
        ? accounts.data.some((account) => account.providerId === 'credential')
        : null;
    return (
        <div className="grid max-w-2xl gap-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
                <p className="text-muted-foreground">Your profile, password and devices.</p>
            </div>
            <ProfileCard />
            {hasPassword === false ? null : <PasswordCard />}
            <SessionsCard />
            <DeleteCard hasPassword={hasPassword !== false} />
        </div>
    );
}

function ProfileCard() {
    const { session } = Route.useRouteContext();
    const router = useRouter();
    const queryClient = useQueryClient();
    const form = useForm({
        defaultValues: { name: session.user.name },
        validators: { onSubmit: z.object({ name }) },
        onSubmit: async ({ value }) => {
            const { error } = await authClient.updateUser({ name: value.name });
            if (error) {
                toast.error(authMessage(error));
                return;
            }
            await queryClient.invalidateQueries({ queryKey: sessionQuery.queryKey });
            await router.invalidate();
            toast.success('Name saved.');
        },
    });
    return (
        <Card>
            <Form onSubmit={() => form.handleSubmit()} className="grid gap-6">
                <CardHeader>
                    <CardTitle>Profile</CardTitle>
                    <CardDescription>Signed in as {session.user.email}.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form.Field name="name">
                        {(field) => <TextField field={field} label="Name" autoComplete="name" />}
                    </form.Field>
                </CardContent>
                <CardFooter>
                    <form.Subscribe selector={(state) => state.isSubmitting}>
                        {(submitting) => <SubmitButton pending={submitting}>Save</SubmitButton>}
                    </form.Subscribe>
                </CardFooter>
            </Form>
        </Card>
    );
}

function PasswordCard() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const form = useForm({
        defaultValues: { currentPassword: '', newPassword: '' },
        validators: {
            onSubmit: z.object({
                currentPassword: z.string().min(1, 'Enter your current password.'),
                newPassword: password,
            }),
        },
        onSubmit: async ({ value, formApi }) => {
            const { error } = await authClient.changePassword({
                currentPassword: value.currentPassword,
                newPassword: value.newPassword,
                revokeOtherSessions: true,
            });
            if (error) {
                toast.error(authMessage(error));
                return;
            }
            formApi.reset();
            // Every session was replaced, this one included: read the new one and the list.
            await queryClient.invalidateQueries({ queryKey: sessionQuery.queryKey });
            await queryClient.invalidateQueries({ queryKey: ['sessions'] });
            await router.invalidate();
            toast.success('Password changed. Other devices were signed out.');
        },
    });
    return (
        <Card>
            <Form onSubmit={() => form.handleSubmit()} className="grid gap-6">
                <CardHeader>
                    <CardTitle>Password</CardTitle>
                    <CardDescription>
                        Changing it signs you out on every other device.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <FieldGroup>
                        <form.Field name="currentPassword">
                            {(field) => (
                                <TextField
                                    field={field}
                                    label="Current password"
                                    type="password"
                                    autoComplete="current-password"
                                />
                            )}
                        </form.Field>
                        <form.Field name="newPassword">
                            {(field) => (
                                <TextField
                                    field={field}
                                    label="New password"
                                    type="password"
                                    autoComplete="new-password"
                                    description="At least 10 characters."
                                />
                            )}
                        </form.Field>
                    </FieldGroup>
                </CardContent>
                <CardFooter>
                    <form.Subscribe selector={(state) => state.isSubmitting}>
                        {(submitting) => (
                            <SubmitButton pending={submitting}>Change password</SubmitButton>
                        )}
                    </form.Subscribe>
                </CardFooter>
            </Form>
        </Card>
    );
}

/* "Chrome on macOS" from a user agent, or the raw string's first word when it isn't recognised. */
function describeAgent(agent: string | null | undefined) {
    if (!agent) return 'Unknown device';
    const browser = /Edg\//.test(agent)
        ? 'Edge'
        : /Firefox\//.test(agent)
          ? 'Firefox'
          : /Chrome\//.test(agent)
            ? 'Chrome'
            : /Safari\//.test(agent)
              ? 'Safari'
              : null;
    const system = /iPhone|iPad/.test(agent)
        ? 'iOS'
        : /Android/.test(agent)
          ? 'Android'
          : /Mac OS X/.test(agent)
            ? 'macOS'
            : /Windows/.test(agent)
              ? 'Windows'
              : /Linux/.test(agent)
                ? 'Linux'
                : null;
    if (browser && system) return `${browser} on ${system}`;
    return browser ?? system ?? agent.split(/[\s/]/)[0] ?? 'Unknown device';
}

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

function SessionsCard() {
    const { session } = Route.useRouteContext();
    const queryClient = useQueryClient();
    const [pending, setPending] = useState(false);
    const sessions = useQuery({
        queryKey: ['sessions'],
        queryFn: async () => {
            const { data, error } = await authClient.listSessions();
            if (error) throw new Error(authMessage(error));
            return data;
        },
    });

    async function signOutOthers() {
        setPending(true);
        const { error } = await authClient.revokeOtherSessions();
        setPending(false);
        if (error) {
            toast.error(authMessage(error));
            return;
        }
        await queryClient.invalidateQueries({ queryKey: ['sessions'] });
        toast.success('Signed out on every other device.');
    }

    const others = (sessions.data ?? []).filter((entry) => entry.id !== session.session.id);
    return (
        <Card>
            <CardHeader>
                <CardTitle>Devices</CardTitle>
                <CardDescription>Where your account is signed in.</CardDescription>
            </CardHeader>
            <CardContent>
                {sessions.data ? (
                    <ul className="divide-y">
                        {sessions.data.map((entry) => (
                            <li
                                key={entry.id}
                                className="flex items-center justify-between gap-4 py-3"
                            >
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium">
                                        {describeAgent(entry.userAgent)}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Signed in {dateFormat.format(new Date(entry.createdAt))}
                                    </p>
                                </div>
                                {entry.id === session.session.id ? (
                                    <Badge variant="secondary">This device</Badge>
                                ) : null}
                            </li>
                        ))}
                    </ul>
                ) : sessions.error ? (
                    <p className="text-sm text-destructive">{sessions.error.message}</p>
                ) : (
                    <Skeleton className="h-14 w-full" />
                )}
            </CardContent>
            <CardFooter>
                <Button
                    variant="outline"
                    disabled={pending || others.length === 0}
                    onClick={() => void signOutOthers()}
                >
                    {pending ? <Spinner /> : null}
                    Sign out other devices
                </Button>
            </CardFooter>
        </Card>
    );
}

function DeleteCard({ hasPassword }: { hasPassword: boolean }) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);
    const form = useForm({
        defaultValues: { password: '' },
        validators: {
            onSubmit: z.object({
                password: hasPassword ? z.string().min(1, 'Enter your password.') : z.string(),
            }),
        },
        onSubmit: async ({ value }) => {
            // Without a password, Better Auth asks for a session from the last day instead.
            const { error } = await authClient.deleteUser(
                hasPassword ? { password: value.password } : {},
            );
            if (error) {
                toast.error(authMessage(error));
                return;
            }
            queryClient.clear();
            setOpen(false);
            toast.success('Your account was deleted.');
            await navigate({ to: '/' });
        },
    });
    return (
        <Card>
            <CardHeader>
                <CardTitle>Delete account</CardTitle>
                <CardDescription>
                    Removes your account and signs you out everywhere. This can’t be undone.
                </CardDescription>
            </CardHeader>
            <CardFooter>
                <AlertDialog
                    open={open}
                    onOpenChange={(next) => {
                        setOpen(next);
                        if (!next) form.reset();
                    }}
                >
                    <AlertDialogTrigger render={<Button variant="destructive" />}>
                        Delete account
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <Form onSubmit={() => form.handleSubmit()} className="grid gap-4">
                            <AlertDialogHeader>
                                <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    {hasPassword
                                        ? 'Everything tied to it goes with it. Enter your password to confirm.'
                                        : 'Everything tied to it goes with it. If you signed in more than a day ago, sign out and back in first.'}
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            {hasPassword ? (
                                <form.Field name="password">
                                    {(field) => (
                                        <TextField
                                            field={field}
                                            label="Password"
                                            type="password"
                                            autoComplete="current-password"
                                        />
                                    )}
                                </form.Field>
                            ) : null}
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <form.Subscribe selector={(state) => state.isSubmitting}>
                                    {(submitting) => (
                                        <SubmitButton variant="destructive" pending={submitting}>
                                            Delete account
                                        </SubmitButton>
                                    )}
                                </form.Subscribe>
                            </AlertDialogFooter>
                        </Form>
                    </AlertDialogContent>
                </AlertDialog>
            </CardFooter>
        </Card>
    );
}
