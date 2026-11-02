import { expect } from '@playwright/test';

const mailpit = `http://localhost:${process.env.MAILPIT_WEB_PORT ?? 8025}`;

type Summary = { ID: string; To: { Address: string }[]; Subject: string };

/* The first link in the newest email to `to` whose subject contains `subject`, waiting for it. */
export async function linkFromEmail(to: string, subject: string) {
    let id: string | undefined;
    await expect
        .poll(
            async () => {
                const response = await fetch(
                    `${mailpit}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`,
                );
                const { messages } = (await response.json()) as { messages: Summary[] };
                id = messages.find((message) => message.Subject.includes(subject))?.ID;
                return id;
            },
            { timeout: 15_000 },
        )
        .toBeTruthy();
    const message = (await (await fetch(`${mailpit}/api/v1/message/${id}`)).json()) as {
        Text: string;
    };
    const link = message.Text.match(/https?:\/\/\S+/)?.[0];
    if (!link) throw new Error(`No link in the email to ${to}.`);
    return link;
}
