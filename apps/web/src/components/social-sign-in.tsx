import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { FieldSeparator } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { authClient, authMessage } from '@/lib/auth-client';

type Provider = 'github' | 'google';

const labels: Record<Provider, string> = { github: 'GitHub', google: 'Google' };

/* One button per provider this server has keys for (GITHUB_*, GOOGLE_* in .env); nothing otherwise. */
export function SocialSignIn({ providers, redirect }: { providers: Provider[]; redirect: string }) {
    const [pending, setPending] = useState<Provider | null>(null);
    if (providers.length === 0) return null;

    async function signIn(provider: Provider) {
        setPending(provider);
        const { error } = await authClient.signIn.social({
            provider,
            callbackURL: redirect,
            errorCallbackURL: '/login',
        });
        // On success the browser is already on its way to the provider.
        if (error) {
            toast.error(authMessage(error));
            setPending(null);
        }
    }

    return (
        <>
            <div className="grid gap-2">
                {providers.map((provider) => (
                    <Button
                        key={provider}
                        variant="outline"
                        size="lg"
                        disabled={pending !== null}
                        onClick={() => void signIn(provider)}
                    >
                        {pending === provider ? <Spinner /> : null}
                        Continue with {labels[provider]}
                    </Button>
                ))}
            </div>
            <FieldSeparator className="my-4">or</FieldSeparator>
        </>
    );
}
