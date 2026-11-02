import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

export const emailEnv = createEnv({
    server: {
        // `log` writes each message to the server log instead of sending it: fine on your
        // own machine, never for real people, since whoever reads the log can use the links.
        EMAIL_ADAPTER: z.enum(['smtp', 'resend', 'log']),
        EMAIL_FROM: z
            .string()
            .min(1)
            .max(320)
            .refine((value) => !/[\r\n]/.test(value), 'Use a single sender address.'),
        SMTP_HOST: z.string().min(1).optional(),
        SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
        SMTP_SECURE: z
            .enum(['true', 'false'])
            .transform((value) => value === 'true')
            .optional(),
        SMTP_REQUIRE_TLS: z
            .enum(['true', 'false'])
            .default('true')
            .transform((value) => value === 'true'),
        SMTP_USER: z.string().min(1).optional(),
        SMTP_PASSWORD: z.string().min(1).optional(),
        RESEND_API_KEY: z.string().min(1).optional(),
    },
    runtimeEnv: process.env,
    emptyStringAsUndefined: true,
});

export function validateEmailAdapter() {
    if (emailEnv.EMAIL_ADAPTER === 'log' && process.env.NODE_ENV === 'production')
        console.warn(
            'EMAIL_ADAPTER=log writes every verification and reset link to this log. Switch to smtp or resend before anyone else uses this app.',
        );
    if (emailEnv.EMAIL_ADAPTER === 'smtp') {
        if (!emailEnv.SMTP_HOST) throw new Error('Set SMTP_HOST for the smtp email adapter.');
        if (Boolean(emailEnv.SMTP_USER) !== Boolean(emailEnv.SMTP_PASSWORD))
            throw new Error('Set both SMTP_USER and SMTP_PASSWORD.');
    }
    if (emailEnv.EMAIL_ADAPTER === 'resend' && !emailEnv.RESEND_API_KEY)
        throw new Error('Set RESEND_API_KEY for the resend email adapter.');
}
