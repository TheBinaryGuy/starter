import { describe, expect, it } from 'vitest';
import { composeVerificationEmail } from './index';

describe('composeVerificationEmail', () => {
    it('carries the link in both parts', async () => {
        const url = 'http://localhost:5173/api/auth/verify-email?token=abc&callbackURL=%2Fapp';
        const message = await composeVerificationEmail('a@example.com', url, 'Starter');
        expect(message.text).toContain(url);
        expect(message.html).toContain('token=abc&amp;callbackURL=%2Fapp');
    });

    it('escapes an app name that looks like markup', async () => {
        const message = await composeVerificationEmail(
            'a@example.com',
            'http://localhost:5173/x',
            '<img src=x onerror=alert(1)>',
        );
        expect(message.html).not.toContain('<img src=x');
        expect(message.html).toContain('&lt;img src=x');
    });
});
