import type { AnyFieldApi } from '@tanstack/react-form';
import { useHydrated } from '@tanstack/react-router';
import type { ComponentProps, ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';

/* A labelled input bound to a TanStack Form field, with its errors under it once touched. */
export function TextField({
    field,
    label,
    labelAction,
    description,
    ...props
}: {
    field: AnyFieldApi;
    label: ReactNode;
    /* Beside the label but outside it, so it stays out of the input's accessible name. */
    labelAction?: ReactNode;
    description?: ReactNode;
} & Omit<ComponentProps<typeof Input>, 'name' | 'value' | 'onChange' | 'onBlur' | 'id'>) {
    const invalid = field.state.meta.isTouched && !field.state.meta.isValid;
    return (
        <Field data-invalid={invalid || undefined}>
            {labelAction ? (
                <div className="flex items-center justify-between gap-2">
                    <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
                    {labelAction}
                </div>
            ) : (
                <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
            )}
            <Input
                id={field.name}
                name={field.name}
                value={field.state.value as string}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                aria-invalid={invalid || undefined}
                {...props}
            />
            {description && !invalid ? <FieldDescription>{description}</FieldDescription> : null}
            {invalid ? <FieldError errors={field.state.meta.errors} /> : null}
        </Field>
    );
}

/*
 * A form that only ever submits through JavaScript. method="post" keeps an
 * early Enter, before React hydrates, from putting the fields (a password) in
 * the URL the way a native GET would.
 */
export function Form({
    onSubmit,
    ...props
}: { onSubmit: () => Promise<unknown> } & Omit<ComponentProps<'form'>, 'onSubmit' | 'method'>) {
    return (
        <form
            method="post"
            noValidate
            onSubmit={(event) => {
                event.preventDefault();
                void onSubmit();
            }}
            {...props}
        />
    );
}

/* Disabled until the page is hydrated, and while the form is submitting. */
export function SubmitButton({
    pending,
    children,
    ...props
}: { pending: boolean } & Omit<ComponentProps<typeof Button>, 'type' | 'disabled'>) {
    const hydrated = useHydrated();
    return (
        <Button type="submit" disabled={!hydrated || pending} {...props}>
            {pending ? <Spinner /> : null}
            {children}
        </Button>
    );
}
