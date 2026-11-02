import { authEnv, validateAuthEnv } from './auth';
import { dbEnv } from './db';
import { emailEnv, validateEmailAdapter } from './email';

/* Everything the web server needs, checked once at start so a bad value fails loudly. */
export function validateServerEnv() {
    validateAuthEnv();
    validateEmailAdapter();
    return { ...dbEnv, ...authEnv, ...emailEnv };
}
