import { useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { LogOutIcon, UserIcon } from 'lucide-react';
import { toast } from 'sonner';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { authClient, authMessage } from '@/lib/auth-client';
import type { SessionView } from '@/lib/session';

export function initials(name: string) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    return (
        (parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts.at(-1)?.[0] ?? '') : '')
    ).toUpperCase();
}

export function UserMenu({ user }: { user: NonNullable<SessionView>['user'] }) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    async function signOut() {
        const { error } = await authClient.signOut();
        if (error) {
            toast.error(authMessage(error));
            return;
        }
        queryClient.clear();
        await navigate({ to: '/' });
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={
                    <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full"
                        aria-label="Account menu"
                    />
                }
            >
                <Avatar className="size-7">
                    {user.image ? <AvatarImage src={user.image} alt="" /> : null}
                    <AvatarFallback className="text-xs">
                        {initials(user.name) || '?'}
                    </AvatarFallback>
                </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuGroup>
                    <DropdownMenuLabel className="grid">
                        <span className="truncate font-medium text-foreground">{user.name}</span>
                        <span className="truncate font-normal">{user.email}</span>
                    </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem render={<Link to="/app/account" />}>
                    <UserIcon />
                    Account
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => void signOut()}>
                    <LogOutIcon />
                    Sign out
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
