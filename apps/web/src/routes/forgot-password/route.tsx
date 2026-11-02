import { useForm } from '@tanstack/react-form';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { z } from 'zod';

import { AuthLayout } from '@/components/auth-layout';
import { Form, SubmitButton, TextField } from '@/components/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
import { authClient, authMessage } from '@/lib/auth-client';
import { email } from '@/lib/validation';

export const Route = createFileRoute('/forgot-password')({
    head: () => ({ meta: [{ title: 'Reset your password' }] }),
    component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
    const [message, setMessage] = useState<string | null>(null);
    const [sentTo, setSentTo] = useState<string | null>(null);

    const form = useForm({
        defaultValues: { email: '' },
        validators: { onSubmit: z.object({ email }) },
        onSubmit: async ({ value }) => {
            setMessage(null);
            const { error } = await authClient.requestPasswordReset({
                email: value.email,
                redirectTo: '/reset-password',
            });
            if (error) setMessage(authMessage(error));
            else setSentTo(value.email);
        },
    });

    const footer = (
        <Link to="/login" className="text-foreground underline underline-offset-4">
            Back to sign in
        </Link>
    );

    // The same answer whether or not the address has an account, so the page can't be used to ask.
    if (sentTo)
        return (
            <AuthLayout
                title="Check your email"
                description={
                    <>
                        If <span className="text-foreground">{sentTo}</span> has an account, we sent
                        it a link to choose a new password. It works for one hour.
                    </>
                }
                footer={footer}
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
            title="Reset your password"
            description="We’ll email you a link to choose a new one."
            footer={footer}
        >
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
                    <form.Subscribe selector={(state) => state.isSubmitting}>
                        {(submitting) => (
                            <SubmitButton size="lg" pending={submitting}>
                                Send link
                            </SubmitButton>
                        )}
                    </form.Subscribe>
                </FieldGroup>
            </Form>
        </AuthLayout>
    );
}
