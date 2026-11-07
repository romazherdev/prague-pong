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
	'club.notFound': 'Klub nenalezen.',
	'nav.calendar': 'Kalendář',
	'nav.admin': 'Správa',
	'nav.signIn': 'Přihlášení pro kapitány',
	'nav.signOut': 'Odhlásit',
	'signIn.title': 'Přihlášení',
	'signIn.intro': 'Pro kapitány a správce klubu. Zadejte svůj e-mail a pošleme vám odkaz pro přihlášení.',
	'signIn.email': 'E-mail',
	'signIn.send': 'Poslat odkaz',
	'signIn.sent': 'Pokud {email} patří kapitánovi nebo správci, právě jsme na něj poslali odkaz. Platí 15 minut.',
	'signIn.invalidEmail': 'Zadejte platný e-mail.',
	'signIn.confirm': 'Přihlásit se',
	'signIn.expired': 'Tento odkaz už neplatí (vypršel nebo byl použit).',
	'signIn.again': 'Poslat nový odkaz',
	'admin.title': 'Správa klubu',
	'admin.captains': 'Kapitáni družstev',
	'admin.noCaptain': '— bez kapitána —',
	'admin.save': 'Uložit',
	'admin.captainHint': 'Kapitán se přihlašuje e-mailem, který má uložený u svého člena.',
	'signIn.email.subject': 'Přihlášení do Prague Pong',
	'signIn.email.body':
		'Dobrý den,\n\npro přihlášení do Prague Pong otevřete tento odkaz:\n{link}\n\nOdkaz platí {minutes} minut a lze ho použít jen jednou. Pokud jste o přihlášení nežádali, e-mail ignorujte.'
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
	'club.notFound': 'Club not found.',
	'nav.calendar': 'Calendar',
	'nav.admin': 'Admin',
	'nav.signIn': 'Captain sign-in',
	'nav.signOut': 'Sign out',
	'signIn.title': 'Sign in',
	'signIn.intro': "For captains and club admins. Enter your email and we'll send you a sign-in link.",
	'signIn.email': 'Email',
	'signIn.send': 'Send link',
	'signIn.sent': 'If {email} belongs to a captain or admin, we have just sent a link to it. It works for 15 minutes.',
	'signIn.invalidEmail': 'Enter a valid email address.',
	'signIn.confirm': 'Sign in',
	'signIn.expired': 'This link no longer works (it expired or was already used).',
	'signIn.again': 'Send a new link',
	'admin.title': 'Club admin',
	'admin.captains': 'Team captains',
	'admin.noCaptain': '— no captain —',
	'admin.save': 'Save',
	'admin.captainHint': 'A captain signs in with the email saved on their member record.',
	'signIn.email.subject': 'Sign in to Prague Pong',
	'signIn.email.body':
		'Hello,\n\nopen this link to sign in to Prague Pong:\n{link}\n\nThe link works for {minutes} minutes and only once. If you didn\'t ask to sign in, ignore this email.'
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
