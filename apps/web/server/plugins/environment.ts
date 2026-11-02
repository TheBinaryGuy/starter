import { validateServerEnv } from '@repo/env/server';
import { definePlugin } from 'nitro';

export default definePlugin(() => {
    validateServerEnv();
});
