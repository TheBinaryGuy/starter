import { db } from '@repo/db';
import { definePlugin } from 'nitro';

export default definePlugin((nitroApp) => {
    nitroApp.hooks.hook('close', () => db.$client.end());
});
