import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { ThemeToggle } from '@/components/theme-toggle';

export function SiteHeader({ appName, children }: { appName: string; children?: ReactNode }) {
    return (
        <header className="border-b">
            <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-4 sm:px-6">
                <Link to="/" className="font-semibold tracking-tight">
                    {appName}
                </Link>
                <div className="ml-auto flex items-center gap-1">
                    {children}
                    <ThemeToggle />
                </div>
            </div>
        </header>
    );
}
