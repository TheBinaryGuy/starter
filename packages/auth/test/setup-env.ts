/* What the auth config needs, fixed for tests: no mail leaves, no provider is called. */
process.env.APP_ORIGIN = 'http://localhost:5173';
process.env.BETTER_AUTH_SECRET = 'test-secret-that-is-long-enough-for-better-auth';
process.env.EMAIL_ADAPTER = 'log';
process.env.EMAIL_FROM = 'Starter <hello@example.test>';
process.env.TRUSTED_PROXY_HEADER = '';
for (const key of [
    'GITHUB_CLIENT_ID',
    'GITHUB_CLIENT_SECRET',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
])
    delete process.env[key];
