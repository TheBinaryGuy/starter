import { describe, expect, it } from 'vitest';
import { buildCsp, parseOrigins } from './csp';

function directive(policy: string, name: string) {
    return policy
        .split('; ')
        .find((entry) => entry.startsWith(`${name} `))
        ?.split(' ')
        .slice(1);
}

describe('buildCsp', () => {
    it('allows no inline script in production except under the nonce', () => {
        const policy = buildCsp({ nonce: 'abc123', dev: false, extraConnect: [] });
        expect(directive(policy, 'script-src')).toEqual(["'self'", "'nonce-abc123'"]);
    });

    it('allows no inline script at all in production without a nonce', () => {
        const policy = buildCsp({ nonce: null, dev: false, extraConnect: [] });
        expect(directive(policy, 'script-src')).toEqual(["'self'"]);
    });

    it('keeps WebSockets out of the production policy', () => {
        const policy = buildCsp({ nonce: 'n', dev: false, extraConnect: [] });
        expect(directive(policy, 'connect-src')).toEqual(["'self'"]);
    });

    it('refuses framing and plugins', () => {
        const policy = buildCsp({ nonce: 'n', dev: false, extraConnect: [] });
        expect(directive(policy, 'frame-ancestors')).toEqual(["'none'"]);
        expect(directive(policy, 'object-src')).toEqual(["'none'"]);
    });
});

describe('parseOrigins', () => {
    it('reduces URLs to their origins and drops what is not http(s)', () => {
        expect(
            parseOrigins(
                'https://a.example/path, javascript:alert(1) not-a-url http://b.test:8080',
            ),
        ).toEqual(['https://a.example', 'http://b.test:8080']);
    });
});
