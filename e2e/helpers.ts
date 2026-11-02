import { expect, type Page } from '@playwright/test';
import { linkFromEmail } from './mailpit';

export const password = 'correct horse battery';

/* Submit buttons stay disabled until React hydrates; typing before then is reset. */
export async function ready(page: Page, button: string) {
    await expect(page.getByRole('button', { name: button, exact: true })).toBeEnabled();
}

/* A new account, confirmed through its email, signed in on /app. Returns its address. */
export async function signUp(page: Page, name: string) {
    const email = `e2e-${crypto.randomUUID()}@example.test`;
    await page.goto('/register');
    await ready(page, 'Create account');
    await page.getByLabel('Name').fill(name);
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText('Check your email')).toBeVisible();
    await page.goto(await linkFromEmail(email, 'Confirm your email'));
    await expect(page).toHaveURL(/\/app$/);
    await ready(page, 'Add');
    return email;
}
