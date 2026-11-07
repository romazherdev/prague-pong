import type { Locale } from './locales';

const cs = {
	'app.name': 'Prague Pong',
	'calendar.title': 'Kalendář zápasů',
	'calendar.empty': 'Žádné nadcházející zápasy.',
	'calendar.emptyAll': 'Žádné zápasy.',
	'calendar.filterLabel': 'Zobrazit družstvo',
	'calendar.allTeams': 'Všechna',
	'calendar.showPast': 'Zobrazit i odehrané zápasy',
	'calendar.hidePast': 'Skrýt odehrané zápasy',
	'match.home': 'Doma',
	'match.away': 'Venku',
	'match.team': 'Družstvo {team}',
	'match.versus': 'vs {opponent}',
	'match.details': 'Podrobnosti',
	'match.back': '← Zpět na kalendář',
	'match.when': 'Kdy',
	'match.until': 'do {time}',
	'match.where': 'Kde',
	'match.competition': 'Soutěž',
	'match.openInMaps': 'Otevřít v mapách',
	'match.notFound': 'Zápas nenalezen.',
	'language.label': 'Jazyk',
	'language.switch': 'Změnit',
	'club.notFound': 'Klub nenalezen.'
} as const;

export type MessageKey = keyof typeof cs;

const en: Record<MessageKey, string> = {
	'app.name': 'Prague Pong',
	'calendar.title': 'Match calendar',
	'calendar.empty': 'No upcoming matches.',
	'calendar.emptyAll': 'No matches.',
	'calendar.filterLabel': 'Show team',
	'calendar.allTeams': 'All',
	'calendar.showPast': 'Show past matches too',
	'calendar.hidePast': 'Hide past matches',
	'match.home': 'Home',
	'match.away': 'Away',
	'match.team': 'Team {team}',
	'match.versus': 'vs {opponent}',
	'match.details': 'Details',
	'match.back': '← Back to calendar',
	'match.when': 'When',
	'match.until': 'until {time}',
	'match.where': 'Where',
	'match.competition': 'Competition',
	'match.openInMaps': 'Open in maps',
	'match.notFound': 'Match not found.',
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
	return new Intl.DateTimeFormat(intlLocale(locale), {
		timeZone,
		weekday: 'short',
		day: 'numeric',
		month: 'short',
		hour: '2-digit',
		minute: '2-digit'
	}).format(new Date(iso));
}

const intlLocale = (locale: Locale) => (locale === 'cs' ? 'cs-CZ' : 'en-GB');

/** e.g. "úterý 17. listopadu 2026" / "Tuesday 17 November 2026", in the club's time zone. */
export function formatMatchDay(iso: string, locale: Locale, timeZone: string): string {
	return new Intl.DateTimeFormat(intlLocale(locale), {
		timeZone,
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	}).format(new Date(iso));
}

/** e.g. "18:00", in the club's time zone. */
export function formatClockTime(iso: string, locale: Locale, timeZone: string): string {
	return new Intl.DateTimeFormat(intlLocale(locale), { timeZone, hour: '2-digit', minute: '2-digit' }).format(
		new Date(iso)
	);
}
