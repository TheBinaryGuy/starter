import { expect, test } from '@playwright/test';
import { signUp } from './helpers';

test('add, finish, rename and delete todos', async ({ page }) => {
    await signUp(page, 'Ada Lovelace');

    const input = page.getByLabel('New todo');
    await input.fill('Write the notes');
    await input.press('Enter');
    await input.fill('Check the engine');
    await page.getByRole('button', { name: 'Add' }).click();
    await expect(page.getByText('2 left of 2.')).toBeVisible();
    await expect(input).toHaveValue('');

    await page.getByRole('checkbox', { name: 'Write the notes' }).click();
    await expect(page.getByText('1 left of 2.')).toBeVisible();

    await page.getByRole('button', { name: 'Edit “Check the engine”' }).click();
    const edit = page.getByRole('textbox', { name: 'Edit “Check the engine”' });
    await edit.fill('Check the analytical engine');
    await edit.press('Enter');
    await expect(page.getByText('Check the analytical engine')).toBeVisible();

    // What the page shows is what the server kept.
    await page.reload();
    await expect(page.getByRole('checkbox', { name: 'Write the notes' })).toBeChecked();
    await expect(page.getByText('Check the analytical engine')).toBeVisible();

    await page.getByRole('button', { name: 'Delete “Write the notes”' }).click();
    await expect(page.getByText('Write the notes')).toHaveCount(0);
    await page.reload();
    await expect(page.getByText('1 left of 1.')).toBeVisible();
});

test('one person’s todos are out of another’s reach', async ({ browser, baseURL }) => {
    const ada = await browser.newPage();
    await signUp(ada, 'Ada Lovelace');
    const created = await ada.request.post('/api/todos', {
        data: { title: 'Private' },
        headers: { origin: baseURL! },
    });
    expect(created.status()).toBe(201);
    const { todo } = (await created.json()) as { todo: { id: string } };

    const grace = await browser.newPage();
    await signUp(grace, 'Grace Hopper');
    const headers = { origin: baseURL! };
    expect(
        (
            await grace.request.patch(`/api/todos/${todo.id}`, { data: { done: true }, headers })
        ).status(),
    ).toBe(404);
    expect((await grace.request.delete(`/api/todos/${todo.id}`, { headers })).status()).toBe(404);
    const theirs = (await (await grace.request.get('/api/todos')).json()) as { todos: unknown[] };
    expect(theirs.todos).toHaveLength(0);

    // Still Ada's, untouched.
    const mine = (await (await ada.request.get('/api/todos')).json()) as {
        todos: { id: string; done: boolean }[];
    };
    expect(mine.todos).toEqual([expect.objectContaining({ id: todo.id, done: false })]);
});

test('a write from another site is refused, even with the session cookie', async ({ page }) => {
    await signUp(page, 'Ada Lovelace');
    const forged = await page.request.post('/api/todos', {
        data: { title: 'Planted' },
        headers: { origin: 'https://evil.example' },
    });
    expect(forged.status()).toBe(403);
    const list = (await (await page.request.get('/api/todos')).json()) as { todos: unknown[] };
    expect(list.todos).toHaveLength(0);
});
