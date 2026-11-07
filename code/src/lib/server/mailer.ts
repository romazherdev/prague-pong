import type { Email, Mailer } from './core/ports';

/**
 * Sends email through Resend's HTTP API when RESEND_API_KEY and MAIL_FROM are set
 * (https://resend.com/docs/api-reference/emails/send-email). Without them, prints the email to the
 * server log, which is enough for local development and for the very first sign-in on a new server.
 */
export function createMailer(env: Record<string, string | undefined> = process.env): Mailer {
	const apiKey = env.RESEND_API_KEY;
	const from = env.MAIL_FROM;
	if (!apiKey || !from) {
		return {
			send: (email: Email) => console.info(`[mail] to ${email.to}: ${email.subject}\n${email.text}`)
		};
	}
	return {
		async send(email: Email) {
			const res = await fetch('https://api.resend.com/emails', {
				method: 'POST',
				headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
				body: JSON.stringify({ from, to: [email.to], subject: email.subject, text: email.text })
			});
			if (!res.ok) throw new Error(`Sending email failed: ${res.status} ${await res.text()}`);
		}
	};
}
