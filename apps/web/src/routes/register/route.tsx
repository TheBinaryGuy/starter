import { useForm } from '@tanstack/react-form';
import { createFileRoute, Link, redirect } from '@tanstack/react-router';
import { useState } from 'react';
import { z } from 'zod';

import { AuthLayout } from '@/components/auth-layout';
import { Form, SubmitButton, TextField } from '@/components/form';
import { SocialSignIn } from '@/components/social-sign-in';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
import { authClient, authMessage } from '@/lib/auth-client';
import { getSocialProvidersServerFn, safeRedirect, sessionQuery } from '@/lib/session';
import { email, name, password } from '@/lib/validation';

export const Route = createFileRoute('/register')({
    validateSearch: z.object({ redirect: z.string().optional() }),
    beforeLoad: async ({ context, search }) => {
        const session = await context.queryClient.fetchQuery(sessionQuery);
        if (session) throw redirect({ href: safeRedirect(search.redirect) });
    },
    loader: () => getSocialProvidersServerFn(),
    head: () => ({ meta: [{ title: 'Create an account' }] }),
    component: RegisterPage,
});

function RegisterPage() {
    const search = Route.useSearch();
    const providers = Route.useLoaderData();
    const destination = safeRedirect(search.redirect);
    const [message, setMessage] = useState<string | null>(null);
    const [sentTo, setSentTo] = useState<string | null>(null);

    const form = useForm({
        defaultValues: { name: '', email: '', password: '' },
        validators: { onSubmit: z.object({ name, email, password }) },
        onSubmit: async ({ value }) => {
            setMessage(null);
            const { error } = await authClient.signUp.email({
                name: value.name,
                email: value.email,
                password: value.password,
                // Where the confirmation link lands: signed in by then, so on to the app.
                callbackURL: `/login?redirect=${encodeURIComponent(destination)}`,
            });
            if (error) setMessage(authMessage(error));
            else setSentTo(value.email);
        },
    });

    if (sentTo)
        return (
            <AuthLayout
                title="Check your email"
                description={
                    <>
                        We sent a link to <span className="text-foreground">{sentTo}</span>. Open it
                        to confirm your address and sign in. It works for one hour.
                    </>
                }
                footer={
                    <Link to="/login" className="text-foreground underline underline-offset-4">
                        Back to sign in
                    </Link>
                }
            >
                <Button
                    variant="outline"
                    size="lg"
                    className="w-full"
                    onClick={() => setSentTo(null)}
                >
                    Use a different email
                </Button>
            </AuthLayout>
        );

    return (
        <AuthLayout
            title="Create an account"
            footer={
                <>
                    Already have one?{' '}
                    <Link
                        to="/login"
                        search={search.redirect ? { redirect: search.redirect } : {}}
                        className="text-foreground underline underline-offset-4"
                    >
                        Sign in
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
                    <form.Field name="name">
                        {(field) => <TextField field={field} label="Name" autoComplete="name" />}
                    </form.Field>
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
                                type="password"
                                autoComplete="new-password"
                                description="At least 10 characters."
                            />
                        )}
                    </form.Field>
                    <form.Subscribe selector={(state) => state.isSubmitting}>
                        {(submitting) => (
                            <SubmitButton size="lg" pending={submitting}>
                                Create account
                            </SubmitButton>
                        )}
                    </form.Subscribe>
                </FieldGroup>
            </Form>
        </AuthLayout>
    );
}
