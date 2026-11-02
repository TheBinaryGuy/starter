import '@/lib/server-only';
import { auth, CLIENT_ADDRESS_HEADER, clientAddress } from '@repo/auth/server';
import { db, todosRepository, type Todo } from '@repo/db';
import { TODO_TITLE_MAX } from '@repo/db/schema';
import { appEnv } from '@repo/env/app';
import { sanitizeFailure } from '@repo/logging';
import { Elysia, NotFound, ParseError, t, ValidationError } from 'elysia';
import { useRequest } from 'nitro/context';

import { useLogger } from '@/lib/logging.server';
import { refuseCrossSiteWrite } from '@/lib/origin-guard';

/*
 * The app's own API, mounted at /api by routes/api/$.ts. Better Auth answers
 * everything under /api/auth itself; the rest is Elysia. Add routes to apiApp
 * and the browser client (lib/api-client.ts) picks up their types through Eden.
 */

/* A refusal meant for the person: its message is shown as it is. */
export class ApiError extends Error {
    constructor(
        message: string,
        readonly status: 400 | 401 | 403 | 404 | 409 | 422 | 429,
        readonly code?: string,
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

/* The signed-in person, or a 401 the client reads as "signed out". */
export async function requireUser(request: Request) {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) throw new ApiError('Sign in to continue.', 401, 'signed-out');
    return session.user;
}

const requestContext = new Elysia({ name: 'api-context' })
    .derive(() => ({ log: useLogger() }))
    .error(({ error, status }) => {
        if (error instanceof NotFound) return status(404, { message: 'Not found.' });
        if (error instanceof ApiError)
            return status(error.status, { message: error.message, code: error.code });
        if (error instanceof ValidationError || error instanceof ParseError)
            return status(400, { message: 'Check your information and try again.' });
        // Anything else is ours to fix: logged by class and code, never by message.
        useLogger().set({ failure: sanitizeFailure(error) });
        useLogger().error(new Error('API request failed.'));
        return status(500, { message: 'Something went wrong. Try again.' });
    })
    .as('global');

const uuidSchema = t.String({
    pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
});
/* Something other than spaces, and no longer than the database allows (it holds to the same limit). */
const titleSchema = t.String({ minLength: 1, maxLength: TODO_TITLE_MAX, pattern: '\\S' });

/* What the browser sees of a todo: no owner id, dates as ISO strings. */
function todoView(row: Todo) {
    return {
        id: row.id,
        title: row.title,
        done: row.done,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
}

export const apiApp = new Elysia({ prefix: '/api' })
    .use(requestContext)
    .get('/health', () => ({ status: 'ok' as const }))
    .get('/ready', async ({ status, log, set }) => {
        set.headers['Cache-Control'] = 'no-store';
        try {
            await db.execute('select 1');
            return { status: 'ok' as const };
        } catch (error) {
            if (error instanceof Error) log.error(error);
            return status(503, { status: 'unavailable' as const });
        }
    })
    .get('/me', async ({ request }) => {
        const user = await requireUser(request);
        return { id: user.id, name: user.name, email: user.email };
    })
    /*
     * The example todo app: every route behind sign-in, every row scoped to its
     * owner in the repository. Writes pass the origin check in handleApiRequest.
     */
    .get('/todos', async ({ request }) => {
        const user = await requireUser(request);
        return { todos: (await todosRepository.listTodos(user.id)).map(todoView) };
    })
    .post(
        '/todos',
        { body: t.Object({ title: titleSchema }) },
        async ({ request, body, status }) => {
            const user = await requireUser(request);
            try {
                const created = await todosRepository.createTodo(user.id, body.title.trim());
                return status(201, { todo: todoView(created) });
            } catch (error) {
                if (error instanceof todosRepository.TodoLimitError)
                    throw new ApiError(error.message, 409, 'limit');
                throw error;
            }
        },
    )
    .patch(
        '/todos/:id',
        {
            params: t.Object({ id: uuidSchema }),
            body: t.Object({ title: t.Optional(titleSchema), done: t.Optional(t.Boolean()) }),
        },
        async ({ request, params, body }) => {
            const user = await requireUser(request);
            if (body.title === undefined && body.done === undefined)
                throw new ApiError('Change the title, the done state, or both.', 400, 'empty');
            const updated = await todosRepository.updateTodo(user.id, params.id, {
                ...(body.title === undefined ? {} : { title: body.title.trim() }),
                ...(body.done === undefined ? {} : { done: body.done }),
            });
            if (!updated) throw new ApiError('That todo doesn’t exist.', 404, 'not-found');
            return { todo: todoView(updated) };
        },
    )
    .delete('/todos/:id', { params: t.Object({ id: uuidSchema }) }, async ({ request, params }) => {
        const user = await requireUser(request);
        if (!(await todosRepository.deleteTodo(user.id, params.id)))
            throw new ApiError('That todo doesn’t exist.', 404, 'not-found');
        return { id: params.id };
    });

export type Api = typeof apiApp;

/*
 * Better Auth reads the client's address for its rate limits from one header.
 * Whatever the client sent under that name is dropped and replaced with the
 * address this server saw (or the trusted proxy's), so nobody picks their own.
 */
function withClientAddress(request: Request) {
    const headers = new Headers(request.headers);
    headers.set(CLIENT_ADDRESS_HEADER, clientAddress(request, useRequest().ip));
    return new Request(request, { headers });
}

export async function handleApiRequest(request: Request): Promise<Response> {
    const pathname = new URL(request.url).pathname;
    if (pathname === '/api/auth' || pathname.startsWith('/api/auth/')) {
        try {
            return await auth.handler(withClientAddress(request));
        } catch (error) {
            // What Better Auth didn't answer itself (packages/auth: onAPIError.throw).
            useLogger().set({ failure: sanitizeFailure(error) });
            useLogger().error(new Error('Auth request failed.'));
            return Response.json({ message: 'Something went wrong. Try again.' }, { status: 500 });
        }
    }
    const refusal = refuseCrossSiteWrite(request, appEnv.APP_ORIGIN);
    if (refusal) return Response.json({ message: refusal, code: 'cross-site' }, { status: 403 });
    if (request.method === 'HEAD') {
        const result = await apiApp.handle(
            new Request(request.url, { method: 'GET', headers: request.headers }),
        );
        return new Response(null, { status: result.status, headers: result.headers });
    }
    return apiApp.handle(request);
}
