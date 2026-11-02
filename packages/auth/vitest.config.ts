import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        testTimeout: process.env.CI ? 30_000 : 10_000,
        include: ['src/**/*.test.ts'],
        globalSetup: ['./test/setup-db.ts'],
        setupFiles: ['@repo/db/test/setup', './test/setup-env.ts'],
        fileParallelism: false,
    },
});
