import type { WideEvent } from 'evlog';
import { describe, expect, it } from 'vitest';
import { redactEvent, sanitizeFailure } from './privacy';

function event(fields: Record<string, unknown>) {
    return { timestamp: '2026-01-01T00:00:00.000Z', level: 'info', ...fields } as WideEvent;
}

describe('redactEvent', () => {
    it('keeps only allowlisted fields on auth requests', () => {
        const value = event({
            path: '/api/auth/sign-in/email',
            status: 200,
            user: { email: 'someone@example.com' },
            ip: '203.0.113.9',
        });
        redactEvent(value);
        expect(value).not.toHaveProperty('user');
        expect(value).not.toHaveProperty('ip');
        expect(value.status).toBe(200);
    });

    it('catches auth paths written in another case or percent-encoded', () => {
        const value = event({ path: '/API/%61uth/sign-up/email', user: { id: 'u' } });
        redactEvent(value);
        expect(value.path).toBe('/api/auth/sign-up/email');
        expect(value).not.toHaveProperty('user');
    });

    it('logs a reset link by its pattern, never its token', () => {
        const value = event({ path: '/api/auth/reset-password/AbC123secret?callbackURL=/x' });
        redactEvent(value);
        expect(value.path).toBe('/api/auth/reset-password/:token');
    });

    it('drops the query from every path', () => {
        const value = event({ path: '/search?q=private', status: 200 });
        redactEvent(value);
        expect(value.path).toBe('/search');
    });
});

describe('sanitizeFailure', () => {
    it('keeps class and code but never the message', () => {
        const error = Object.assign(new Error('mail to someone@example.com refused'), {
            code: 'EENVELOPE',
        });
        expect(sanitizeFailure(error)).toEqual({ kind: 'Error', code: 'EENVELOPE' });
    });

    it('drops a code that is not a plain token', () => {
        const error = Object.assign(new Error('x'), { code: 'someone@example.com refused' });
        expect(sanitizeFailure(error)).toEqual({ kind: 'Error' });
    });
});
