import { z } from 'zod';

/* Better Auth's limits (packages/auth), checked here first so the form can say so. */
export const password = z
    .string()
    .min(10, 'Use at least 10 characters.')
    .max(128, 'Use 128 characters or fewer.');

export const email = z.email('Enter an email address.').max(320);

export const name = z.string().trim().min(1, 'Enter your name.').max(100);
