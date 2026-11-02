import { emailEnv, validateEmailAdapter } from '@repo/env/email';
import nodemailer from 'nodemailer';
import { Resend } from 'resend';

export type EmailMessage = { to: string; subject: string; html: string; text: string };
type EmailAdapter = { send: (message: EmailMessage) => Promise<void> };

export function createEmailAdapter(): EmailAdapter {
    validateEmailAdapter();
    const from = emailEnv.EMAIL_FROM;
    switch (emailEnv.EMAIL_ADAPTER) {
        case 'smtp': {
            const port = emailEnv.SMTP_PORT;
            const user = emailEnv.SMTP_USER;
            const pass = emailEnv.SMTP_PASSWORD;
            const transport = nodemailer.createTransport({
                host: emailEnv.SMTP_HOST,
                port,
                secure: emailEnv.SMTP_SECURE ?? port === 465,
                requireTLS: emailEnv.SMTP_REQUIRE_TLS,
                auth: user && pass ? { user, pass } : undefined,
                connectionTimeout: 10_000,
                greetingTimeout: 10_000,
                socketTimeout: 15_000,
                disableFileAccess: true,
                disableUrlAccess: true,
            });
            return {
                async send(message) {
                    await transport.sendMail({ from, ...message });
                },
            };
        }
        case 'resend': {
            const resend = new Resend(emailEnv.RESEND_API_KEY);
            return {
                async send(message) {
                    const { error } = await resend.emails.send({ from, ...message });
                    if (error)
                        throw new Error('Resend rejected email delivery.', {
                            cause: Object.assign(new Error(error.name), { name: error.name }),
                        });
                },
            };
        }
        case 'log':
            return {
                async send(message) {
                    console.info(
                        `[email] To: ${message.to}\n[email] Subject: ${message.subject}\n${message.text
                            .split('\n')
                            .map((line) => `[email] ${line}`)
                            .join('\n')}`,
                    );
                },
            };
    }
}
