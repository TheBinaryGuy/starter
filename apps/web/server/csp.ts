/*
 * The Content Security Policy every page ships. Scripts run only from this
 * origin and, for the inline script TanStack writes to hydrate the router,
 * under a nonce minted per request. The only origins the page talks to besides
 * its own are whatever CSP_CONNECT_SRC adds. In development the Vite client's
 * inline preamble and its WebSocket are allowed; everything else is the
 * production policy.
 */

export type CspInput = {
    nonce: string | null;
    dev: boolean;
    /* Operator additions from CSP_CONNECT_SRC. */
    extraConnect: string[];
};

export function buildCsp(input: CspInput) {
    const script = input.dev
        ? ["'self'", "'unsafe-inline'"]
        : ["'self'", ...(input.nonce ? [`'nonce-${input.nonce}'`] : [])];
    const connect = ["'self'", ...input.extraConnect, ...(input.dev ? ['ws:', 'wss:'] : [])];
    const directives: [string, string[]][] = [
        ['default-src', ["'self'"]],
        ['script-src', script],
        ['style-src', ["'self'", "'unsafe-inline'"]],
        // Avatars from GitHub and Google sign-ins.
        ['img-src', ["'self'", 'blob:', 'data:', 'https:']],
        ['font-src', ["'self'"]],
        ['connect-src', [...new Set(connect)]],
        ['worker-src', ["'self'", 'blob:']],
        ['frame-src', ["'self'"]],
        ['manifest-src', ["'self'"]],
        ['object-src', ["'none'"]],
        ['base-uri', ["'self'"]],
        ['form-action', ["'self'"]],
        ['frame-ancestors', ["'none'"]],
    ];
    return directives.map(([name, values]) => `${name} ${values.join(' ')}`).join('; ');
}

/* Origins as "https://host" entries; anything that does not parse as one is dropped, never guessed. */
export function parseOrigins(value: string | undefined) {
    if (!value) return [];
    return value
        .split(/[\s,]+/)
        .filter(Boolean)
        .flatMap((entry) => {
            try {
                const url = new URL(entry);
                return url.protocol === 'https:' || url.protocol === 'http:' ? [url.origin] : [];
            } catch {
                return [];
            }
        });
}
