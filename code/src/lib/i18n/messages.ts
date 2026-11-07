import type { Locale } from './locales';

const cs = {
	'app.name': 'Prague Pong',
	'calendar.title': 'Kalendář zápasů',
	'calendar.empty': 'Žádné nadcházející zápasy.',
	'match.home': 'Doma',
	'match.away': 'Venku',
	'match.team': 'Družstvo {team}',
	'match.versus': 'vs {opponent}',
	'language.label': 'Jazyk',
	'language.switch': 'Změnit',
	'club.notFound': 'Klub nenalezen.'
} as const;

export type MessageKey = keyof typeof cs;

const en: Record<MessageKey, string> = {
	'app.name': 'Prague Pong',
	'calendar.title': 'Match calendar',
	'calendar.empty': 'No upcoming matches.',
	'match.home': 'Home',
	'match.away': 'Away',
	'match.team': 'Team {team}',
	'match.versus': 'vs {opponent}',
	'language.label': 'Language',
	'language.switch': 'Change',
	'club.notFound': 'Club not found.'
};

const dictionaries: Record<Locale, Record<MessageKey, string>> = { cs, en };

export const languageNames: Record<Locale, string> = { cs: 'Čeština', en: 'English' };

/** Returns a translate function for one locale. `{name}` placeholders are filled from `params`. */
export function translator(locale: Locale) {
	const dict = dictionaries[locale];
	return (key: MessageKey, params: Record<string, string> = {}) =>
		dict[key].replace(/\{(\w+)\}/g, (_, name: string) => params[name] ?? `{${name}}`);
}

/** e.g. "út 17. 11. 18:00" / "Tue, 17 Nov, 18:00", in the club's time zone. */
export function formatMatchTime(iso: string, locale: Locale, timeZone: string): string {
	return new Intl.DateTimeFormat(locale === 'cs' ? 'cs-CZ' : 'en-GB', {
		timeZone,
		weekday: 'short',
		day: 'numeric',
		month: 'short',
		hour: '2-digit',
		minute: '2-digit'
	}).format(new Date(iso));
}
