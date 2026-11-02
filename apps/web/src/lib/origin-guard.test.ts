import { describe, expect, it } from 'vitest';
import { refuseCrossSiteWrite } from './origin-guard';

const app = 'https://app.example';

function request(method: string, headers: Record<string, string> = {}) {
    return new Request(`${app}/api/todos`, { method, headers });
}

describe('refuseCrossSiteWrite', () => {
    it('lets reads through from anywhere', () => {
        expect(
            refuseCrossSiteWrite(request('GET', { origin: 'https://evil.example' }), app),
        ).toBeNull();
    });

    it('lets a JSON write from the app through', () => {
        const write = request('POST', {
            origin: app,
            'content-type': 'application/json; charset=utf-8',
        });
        expect(refuseCrossSiteWrite(write, app)).toBeNull();
    });

    it('refuses a write from another origin', () => {
        const write = request('POST', {
            origin: 'https://evil.example',
            'content-type': 'application/json',
        });
        expect(refuseCrossSiteWrite(write, app)).not.toBeNull();
    });

    it('refuses a write from a sibling subdomain', () => {
        const write = request('PATCH', {
            origin: 'https://evil.app.example',
            'content-type': 'application/json',
        });
        expect(refuseCrossSiteWrite(write, app)).not.toBeNull();
    });

    it('refuses a write with no origin at all', () => {
        expect(refuseCrossSiteWrite(request('DELETE'), app)).not.toBeNull();
    });

    it('refuses a form post even from the app, since a page elsewhere can send one', () => {
        const form = request('POST', {
            origin: app,
            'content-type': 'application/x-www-form-urlencoded',
        });
        expect(refuseCrossSiteWrite(form, app)).not.toBeNull();
    });

    it('lets a bodiless delete from the app through', () => {
        expect(refuseCrossSiteWrite(request('DELETE', { origin: app }), app)).toBeNull();
    });
});
