import { db } from '@repo/db';
import type * as emails from '@repo/emails';
import type { EmailMessage } from '@repo/emails';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/* Every email the auth config sends, as composed, so a test can follow its link. */
const outbox = vi.hoisted(() => [] as EmailMessage[]);
const mail = vi.hoisted(() => ({ failWith: null as Error | null }));
vi.mock('@repo/emails', async (original) => ({
    ...(await original<typeof emails>()),
    sendEmail: vi.fn(async (message: EmailMessage) => {
        if (mail.failWith) throw mail.failWith;
        outbox.push(message);
    }),
}));

const { auth, clientAddress } = await import('./server');

const password = 'correct horse battery';

beforeEach(async () => {
    outbox.length = 0;
    mail.failWith = null;
    await db.execute('truncate "user", "session", "account", "verification" cascade');
});

/* The link in the last email sent to `to`. */
function lastLink(to: string) {
    const message = outbox.filter((entry) => entry.to === to).at(-1);
    const url = message?.text.match(/https?:\/\/\S+/)?.[0];
    if (!url) throw new Error(`No link was emailed to ${to}.`);
    return new URL(url);
}

async function signUp(email: string) {
    await auth.api.signUpEmail({ body: { name: 'Ada Lovelace', email, password } });
}

async function verify(email: string) {
    const token = lastLink(email).searchParams.get('token');
    await auth.api.verifyEmail({ query: { token: token ?? '' } });
}

/* Signs in and returns the request headers that carry the session cookie. */
async function signIn(email: string, secret = password) {
    const response = await auth.api.signInEmail({
        body: { email, password: secret },
        asResponse: true,
    });
    const cookie = response.headers
        .getSetCookie()
        .map((value) => value.split(';')[0])
        .join('; ');
    return { status: response.status, headers: new Headers({ cookie }) };
}

describe('sign-up and email verification', () => {
    it('refuses to sign in until the email is confirmed, and emails a fresh link instead', async () => {
        await signUp('ada@example.com');
        expect(outbox).toHaveLength(1);

        const attempt = await signIn('ada@example.com');
        expect(attempt.status).toBe(403);
        expect(outbox).toHaveLength(2);
    });

    it('signs in once the emailed link is opened', async () => {
        await signUp('ada@example.com');
        await verify('ada@example.com');

        const { status, headers } = await signIn('ada@example.com');
        expect(status).toBe(200);
        const session = await auth.api.getSession({ headers });
        expect(session?.user.email).toBe('ada@example.com');
        expect(session?.user.emailVerified).toBe(true);
    });

    it('does not verify with a tampered token', async () => {
        await signUp('ada@example.com');
        const token = lastLink('ada@example.com').searchParams.get('token') ?? '';
        const tampered = token.slice(0, -2) + (token.endsWith('aa') ? 'bb' : 'aa');

        await expect(auth.api.verifyEmail({ query: { token: tampered } })).rejects.toThrow();
        expect((await signIn('ada@example.com')).status).toBe(403);
    });

    it('refuses a wrong password for a confirmed account', async () => {
        await signUp('ada@example.com');
        await verify('ada@example.com');
        expect((await signIn('ada@example.com', 'not the password')).status).toBe(401);
    });
});

describe('password reset', () => {
    async function resetToken(email: string) {
        await auth.api.requestPasswordReset({ body: { email, redirectTo: '/reset-password' } });
        // The link is /api/auth/reset-password/<token>?callbackURL=/reset-password
        return lastLink(email).pathname.split('/').at(-1) ?? '';
    }

    it('changes the password, signs out every session and spends the token', async () => {
        await signUp('ada@example.com');
        await verify('ada@example.com');
        const before = await signIn('ada@example.com');

        const token = await resetToken('ada@example.com');
        await auth.api.resetPassword({ body: { token, newPassword: 'a whole new password' } });

        expect(await auth.api.getSession({ headers: before.headers })).toBeNull();
        expect((await signIn('ada@example.com')).status).toBe(401);
        expect((await signIn('ada@example.com', 'a whole new password')).status).toBe(200);
        await expect(
            auth.api.resetPassword({ body: { token, newPassword: 'and yet another one' } }),
        ).rejects.toThrow();
    });

    it('sends nothing for an address without an account', async () => {
        await auth.api.requestPasswordReset({
            body: { email: 'nobody@example.com', redirectTo: '/reset-password' },
        });
        expect(outbox).toHaveLength(0);
    });
});

describe('account deletion', () => {
    it('needs the right password, then leaves no way back in', async () => {
        await signUp('ada@example.com');
        await verify('ada@example.com');
        const { headers } = await signIn('ada@example.com');

        await expect(
            auth.api.deleteUser({ body: { password: 'not the password' }, headers }),
        ).rejects.toThrow();
        expect(await auth.api.getSession({ headers })).not.toBeNull();

        await auth.api.deleteUser({ body: { password }, headers });
        expect(await auth.api.getSession({ headers })).toBeNull();
        expect((await signIn('ada@example.com')).status).toBe(401);
    });
});

describe('failures', () => {
    it('never prints what a failing mail server said about the address', async () => {
        mail.failWith = new Error('550 mailbox ada@example.com unavailable');
        const printed: unknown[] = [];
        for (const method of ['error', 'warn', 'log', 'info'] as const)
            vi.spyOn(console, method).mockImplementation((...args) => void printed.push(...args));

        // The confirmation email goes out in the background: sign-up still answers.
        const request = new Request('http://localhost:5173/api/auth/sign-up/email', {
            method: 'POST',
            headers: { 'content-type': 'application/json', origin: 'http://localhost:5173' },
            body: JSON.stringify({ name: 'Ada', email: 'ada@example.com', password }),
        });
        expect((await auth.handler(request)).status).toBe(200);
        await new Promise((resolve) => setTimeout(resolve, 50));

        expect(printed.length).toBeGreaterThan(0);
        expect(JSON.stringify(printed.map(String))).not.toContain('ada@example.com');
        vi.restoreAllMocks();
    });
});

describe('clientAddress', () => {
    it('ignores a forwarded address the client wrote when no proxy header is trusted', () => {
        const request = new Request('http://localhost/', {
            headers: { 'x-forwarded-for': '203.0.113.7' },
        });
        expect(clientAddress(request, '198.51.100.2')).toBe('198.51.100.2');
    });
});
