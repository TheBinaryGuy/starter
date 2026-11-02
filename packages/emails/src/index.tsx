import { render, toPlainText } from 'react-email';
import type { createEmailAdapter, EmailMessage } from './adapter';
import ActionEmail, { type ActionEmailProps } from './templates/action-email';

export type { EmailMessage };

let adapter: ReturnType<typeof createEmailAdapter> | undefined;

/* The adapter loads on first send, so composing a message never needs the email settings. */
export async function sendEmail(message: EmailMessage) {
    adapter ??= (await import('./adapter')).createEmailAdapter();
    await adapter.send(message);
}

/* React escapes every value it renders, so a name or link can never become markup. */
export async function composeActionEmail(to: string, subject: string, props: ActionEmailProps) {
    const html = await render(<ActionEmail {...props} />);
    return { to, subject, html, text: toPlainText(html) } satisfies EmailMessage;
}

export function composeVerificationEmail(to: string, url: string, appName: string) {
    return composeActionEmail(to, `Confirm your email · ${appName}`, {
        appName,
        url,
        preview: `Confirm your email address for ${appName}.`,
        heading: 'Confirm your email',
        body: 'Press the button to confirm this address and finish signing up. The link works for one hour.',
        action: 'Confirm email',
        footer: 'If you did not sign up, you can ignore this email; no account is made without it.',
    });
}

export function composePasswordResetEmail(to: string, url: string, appName: string) {
    return composeActionEmail(to, `Reset your password · ${appName}`, {
        appName,
        url,
        preview: `Reset your ${appName} password.`,
        heading: 'Reset your password',
        body: 'Press the button to choose a new password. The link works for one hour, once, and signs you out everywhere else.',
        action: 'Choose a new password',
        footer: 'If you did not ask for this, ignore this email; your password stays as it is.',
    });
}
