import { expect, test, type Page } from '@playwright/test';
import { linkFromEmail } from './mailpit';

/* Submit buttons stay disabled until React hydrates; typing before then is reset. */
async function ready(page: Page, button: string) {
    await expect(page.getByRole('button', { name: button, exact: true })).toBeEnabled();
}

const password = 'correct horse battery';

test('sign up, confirm the email, sign out and sign back in', async ({ page }) => {
    const email = `e2e-${crypto.randomUUID()}@example.test`;

    await page.goto('/register');
    await ready(page, 'Create account');
    await page.getByLabel('Name').fill('Ada Lovelace');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText('Check your email')).toBeVisible();

    await page.goto(await linkFromEmail(email, 'Confirm your email'));
    await expect(page).toHaveURL(/\/app$/);
    await expect(page.getByRole('heading', { name: 'Hello, Ada' })).toBeVisible();
    // The Elysia API answers for the signed-in user.
    await expect(page.getByText(email)).toBeVisible();

    await page.getByRole('button', { name: 'Account menu' }).click();
    await page.getByRole('menuitem', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/$/);

    await page.goto('/app');
    await expect(page).toHaveURL(/\/login\?redirect=/);
    await ready(page, 'Sign in');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page).toHaveURL(/\/app$/);

    // A saved name reaches the rest of the app without a reload.
    await page.getByRole('link', { name: 'Account' }).click();
    await ready(page, 'Save');
    await page.getByLabel('Name').fill('Augusta Ada King');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Name saved.')).toBeVisible();
    await page.getByRole('link', { name: 'Home' }).click();
    await expect(page.getByRole('heading', { name: 'Hello, Augusta' })).toBeVisible();
});

test('an unconfirmed account cannot sign in', async ({ page }) => {
    const email = `e2e-${crypto.randomUUID()}@example.test`;
    await page.goto('/register');
    await ready(page, 'Create account');
    await page.getByLabel('Name').fill('Grace Hopper');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText('Check your email')).toBeVisible();

    await page.goto('/login');
    await ready(page, 'Sign in');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.getByText('Confirm your email first')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
});
