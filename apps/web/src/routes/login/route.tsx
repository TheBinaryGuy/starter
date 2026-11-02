import { useForm } from '@tanstack/react-form';
import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link, redirect, useRouter } from '@tanstack/react-router';
import { useState } from 'react';
import { z } from 'zod';

import { AuthLayout } from '@/components/auth-layout';
import { Form, SubmitButton, TextField } from '@/components/form';
import { SocialSignIn } from '@/components/social-sign-in';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { FieldGroup } from '@/components/ui/field';
import { authClient, authMessage } from '@/lib/auth-client';
import { getSocialProvidersServerFn, safeRedirect, sessionQuery } from '@/lib/session';
import { email } from '@/lib/validation';

export const Route = createFileRoute('/login')({
    validateSearch: z.object({
        redirect: z.string().optional(),
        // Better Auth sends a failed email link or social sign-in back here with a code.
        error: z.string().optional(),
    }),
    beforeLoad: async ({ context, search }) => {
        const session = await context.queryClient.fetchQuery(sessionQuery);
        if (session) throw redirect({ href: safeRedirect(search.redirect) });
    },
    loader: () => getSocialProvidersServerFn(),
    head: () => ({ meta: [{ title: 'Sign in' }] }),
    component: LoginPage,
});

const linkErrors: Record<string, string> = {
    invalid_token: 'That link has expired or was already used. Sign in to get a new one.',
    token_expired: 'That link has expired. Sign in to get a new one.',
};

function LoginPage() {
    const search = Route.useSearch();
    const providers = Route.useLoaderData();
    const router = useRouter();
    const queryClient = useQueryClient();
    const destination = safeRedirect(search.redirect);
    const [message, setMessage] = useState<string | null>(
        search.error
            ? (linkErrors[search.error.toLowerCase()] ?? 'Sign-in didn’t finish. Try again.')
            : null,
    );

    const form = useForm({
        defaultValues: { email: '', password: '' },
        validators: {
            onSubmit: z.object({ email, password: z.string().min(1, 'Enter your password.') }),
        },
        onSubmit: async ({ value }) => {
            setMessage(null);
            const { error } = await authClient.signIn.email({
                email: value.email,
                password: value.password,
                callbackURL: destination,
            });
            if (error) {
                setMessage(
                    error.code === 'EMAIL_NOT_VERIFIED'
                        ? `Confirm your email first. We sent a new link to ${value.email}.`
                        : authMessage(error),
                );
                return;
            }
            queryClient.removeQueries({ queryKey: sessionQuery.queryKey });
            await router.navigate({ href: destination });
        },
    });

    return (
        <AuthLayout
            title="Sign in"
            footer={
                <>
                    New here?{' '}
                    <Link
                        to="/register"
                        search={search.redirect ? { redirect: search.redirect } : {}}
                        className="text-foreground underline underline-offset-4"
                    >
                        Create an account
                    </Link>
                </>
            }
        >
            <SocialSignIn providers={providers} redirect={destination} />
            <Form onSubmit={() => form.handleSubmit()}>
                <FieldGroup>
                    {message ? (
                        <Alert variant="destructive">
                            <AlertDescription>{message}</AlertDescription>
                        </Alert>
                    ) : null}
                    <form.Field name="email">
                        {(field) => (
                            <TextField
                                field={field}
                                label="Email"
                                type="email"
                                autoComplete="email"
                            />
                        )}
                    </form.Field>
                    <form.Field name="password">
                        {(field) => (
                            <TextField
                                field={field}
                                label="Password"
                                labelAction={
                                    <Link
                                        to="/forgot-password"
                                        className="text-sm font-normal text-muted-foreground underline-offset-4 hover:underline"
                                    >
                                        Forgot password?
                                    </Link>
                                }
                                type="password"
                                autoComplete="current-password"
                            />
                        )}
                    </form.Field>
                    <form.Subscribe selector={(state) => state.isSubmitting}>
                        {(submitting) => (
                            <SubmitButton size="lg" pending={submitting}>
                                Sign in
                            </SubmitButton>
                        )}
                    </form.Subscribe>
                </FieldGroup>
            </Form>
        </AuthLayout>
    );
}
