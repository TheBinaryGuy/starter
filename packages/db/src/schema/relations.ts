import { defineRelations } from 'drizzle-orm';
import * as auth from './auth';
import { todo } from './todos';

export const relations = defineRelations({ ...auth, todo }, (r) => ({
    user: {
        sessions: r.many.session(),
        accounts: r.many.account(),
        todos: r.many.todo(),
    },
    session: {
        user: r.one.user({ from: r.session.userId, to: r.user.id }),
    },
    account: {
        user: r.one.user({ from: r.account.userId, to: r.user.id }),
    },
    todo: {
        user: r.one.user({ from: r.todo.userId, to: r.user.id }),
    },
}));
