import { createServerFn } from '@tanstack/react-start';
import { getCookie, getRequestProtocol, setCookie } from '@tanstack/react-start/server';

/*
 * The theme lives in a cookie, so the server renders the right class on <html>
 * and the page never flashes the wrong one. `system` follows the device through
 * `prefers-color-scheme` (styles.css).
 */
export type Theme = 'light' | 'dark' | 'system';

const COOKIE = 'theme';

export function isTheme(value: unknown): value is Theme {
    return value === 'light' || value === 'dark' || value === 'system';
}

export const getThemeServerFn = createServerFn().handler(() => {
    const theme = getCookie(COOKIE);
    return isTheme(theme) ? theme : 'system';
});

export const setThemeServerFn = createServerFn({ method: 'POST' })
    .validator((value: unknown) => {
        if (!isTheme(value))
            throw Object.assign(new Error('Invalid theme preference.'), { status: 400 });
        return value;
    })
    .handler(({ data }) => {
        setCookie(COOKIE, data, {
            path: '/',
            maxAge: 60 * 60 * 24 * 365,
            sameSite: 'lax',
            secure: getRequestProtocol() === 'https',
        });
    });
