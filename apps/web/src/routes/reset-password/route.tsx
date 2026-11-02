import { useForm } from '@tanstack/react-form';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';

import { AuthLayout } from '@/components/auth-layout';
import { Form, SubmitButton, TextField } from '@/components/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { buttonVariants } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
import { authClient, authMessage } from '@/lib/auth-client';
import { password } from '@/lib/validation';

/* Better Auth's reset link lands here with ?token=…, or ?error=INVALID_TOKEN when it is spent. */
export const Route = createFileRoute('/reset-password')({
    validateSearch: z.object({ token: z.string().optional(), error: z.string().optional() }),
    head: () => ({ meta: [{ title: 'Choose a new password' }] }),
    component: ResetPasswordPage,
});

function ResetPasswordPage() {
    const { token, error } = Route.useSearch();
    const navigate = useNavigate();
    const [message, setMessage] = useState<string | null>(null);

    const form = useForm({
        defaultValues: { password: '' },
        validators: { onSubmit: z.object({ password }) },
        onSubmit: async ({ value }) => {
            if (!token) return;
            setMessage(null);
            const result = await authClient.resetPassword({ newPassword: value.password, token });
            if (result.error) {
                setMessage(authMessage(result.error));
                return;
            }
            toast.success('Password changed. Sign in with the new one.');
            await navigate({ to: '/login' });
        },
    });

    if (!token || error)
        return (
            <AuthLayout
                title="This link doesn’t work"
                description="It has expired or was already used. Ask for a new one."
            >
                <Link
                    to="/forgot-password"
                    className={buttonVariants({ size: 'lg', className: 'w-full' })}
                >
                    Send a new link
                </Link>
            </AuthLayout>
        );

    return (
        <AuthLayout title="Choose a new password" description="This signs you out everywhere else.">
            <Form onSubmit={() => form.handleSubmit()}>
                <FieldGroup>
                    {message ? (
                        <Alert variant="destructive">
                            <AlertDescription>{message}</AlertDescription>
                        </Alert>
                    ) : null}
                    <form.Field name="password">
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
                    <form.Subscribe selector={(state) => state.isSubmitting}>
                        {(submitting) => (
                            <SubmitButton size="lg" pending={submitting}>
                                Change password
                            </SubmitButton>
                        )}
                    </form.Subscribe>
                </FieldGroup>
            </Form>
        </AuthLayout>
    );
}
