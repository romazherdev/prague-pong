import { defaultLocale, isLocale, type Locale } from '#lib/i18n/locales.js';

/** Supported languages from an Accept-Language header, highest weight first. */
function fromAcceptLanguage(header: string): Locale | undefined {
	const candidates = header
		.split(',')
		.map((part, index) => {
			const [tag, ...params] = part.trim().split(';');
			const q = params.map((p) => p.trim()).find((p) => p.startsWith('q='));
			return { lang: tag.trim().toLowerCase().split('-')[0], weight: q ? Number(q.slice(2)) : 1, index };
		})
		.filter((c) => c.lang && c.weight > 0)
		.sort((a, b) => b.weight - a.weight || a.index - b.index);
	return candidates.map((c) => c.lang).find(isLocale);
}

/**
 * Which language to show. Order: the preference saved on this device, then the browser's languages, then Czech.
 * (Ticket 05 puts the member's saved preference in front of all of these.)
 */
export function resolveLocale(input: { devicePreference?: string; acceptLanguage?: string }): Locale {
	if (isLocale(input.devicePreference)) return input.devicePreference;
	return (input.acceptLanguage && fromAcceptLanguage(input.acceptLanguage)) || defaultLocale;
}
