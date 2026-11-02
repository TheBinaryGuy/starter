/*
 * A request that changes data must come from this app's own pages. Browsers
 * send Origin on every POST, PUT, PATCH and DELETE, so a missing or foreign one
 * is refused, and a body must be JSON, which another site can't send without
 * a CORS preflight this API never answers. The session cookie's SameSite=Lax
 * already keeps most cross-site writes out; this holds even where it wouldn't
 * (an older browser, a sibling subdomain, a top-level POST). Better Auth checks
 * its own routes under /api/auth.
 */
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const BODY_METHODS = new Set(['POST', 'PUT', 'PATCH']);

/* Why the write is refused, or null when it may go ahead. */
export function refuseCrossSiteWrite(request: Request, appOrigin: string): string | null {
    const method = request.method.toUpperCase();
    if (SAFE_METHODS.has(method)) return null;
    if (request.headers.get('origin') !== appOrigin)
        return 'This request must come from the app itself.';
    const type = request.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase();
    if (BODY_METHODS.has(method) && type !== 'application/json') return 'Send the request as JSON.';
    return null;
}
