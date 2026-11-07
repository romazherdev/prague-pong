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
	'nav.me': 'Moje akce',
	'nav.members': 'Členové',
	'me.title': 'Moje akce',
	'me.hello': 'Ahoj {name}',
	'me.upcoming': 'Nadcházející zápasy',
	'me.noLink': 'Otevřete svůj osobní odkaz, který vám poslal správce klubu (např. přes WhatsApp).',
	'me.linkInvalidTitle': 'Odkaz neplatí',
	'me.linkInvalid': 'Tento osobní odkaz už neplatí. Požádejte správce klubu o nový.',
	'members.title': 'Členové klubu',
	'members.add': 'Přidat člena',
	'members.name': 'Jméno',
	'members.emailOptional': 'E-mail (nepovinný)',
	'members.emailHint': 'E-mail potřebují jen kapitáni a správci – přihlašují se jím.',
	'members.addButton': 'Přidat',
	'members.active': 'Aktivní členové ({count})',
	'members.inactive': 'Bývalí členové',
	'members.reactivate': 'Vrátit mezi aktivní',
	'members.adminTag': 'správce',
	'members.back': '← Zpět na členy',
	'members.personalLink': 'Osobní odkaz',
	'members.addedHint': 'Člen přidán. Pošlete mu teď jeho osobní odkaz.',
	'members.personalLinkHint': 'Pošlete zprávu členovi soukromě, nikdy ne do skupiny. Kdo má odkaz, může za člena odpovídat.',
	'members.messageLanguage': 'Jazyk zprávy',
	'members.copyMessage': 'Kopírovat zprávu pro WhatsApp',
	'members.copied': 'Zkopírováno ✓',
	'members.openWhatsApp': 'Otevřít ve WhatsAppu',
	'members.regenerate': 'Vytvořit nový odkaz',
	'members.regenerateHint': 'Použijte, když odkaz unikl nebo se ztratil. Starý odkaz okamžitě přestane fungovat.',
	'members.regenerated': 'Nový odkaz je hotový, starý už nefunguje. Pošlete členovi novou zprávu.',
	'members.edit': 'Upravit údaje',
	'members.saved': 'Uloženo',
	'members.deactivate': 'Člen odešel z klubu',
	'members.deactivateHint': 'Člen zmizí ze seznamů a sestav, jeho odkaz přestane fungovat. Historie zůstane a jde ho vrátit.',
	'error.nameRequired': 'Vyplňte jméno.',
	'error.emailTaken': 'Tento e-mail už má jiný člen.',
	'error.emailInvalid': 'Neplatný e-mail.',
	'error.cannotDeactivateSelf': 'Sami sebe deaktivovat nemůžete.',
	'personalLink.message':
		'Ahoj {name}, tady je tvůj osobní odkaz do Prague Pong ({club}). Uvidíš v něm zápasy a tréninky a jedním klepnutím odpovíš, jestli můžeš:\n{link}\n\nOdkaz je jen pro tebe, prosím neposílej ho dál ani do skupiny.',
	'error.forbidden': 'Na tohle nemáte oprávnění.',
	'error.notFound': 'Nenalezeno.',
	'nav.calendar': 'Kalendář',
	'nav.admin': 'Správa',
	'nav.signIn': 'Přihlášení pro kapitány',
	'nav.signOut': 'Odhlásit',
	'signIn.title': 'Přihlášení',
	'signIn.intro': 'Pro kapitány a správce klubu. Zadejte svůj e-mail a pošleme vám odkaz pro přihlášení.',
	'signIn.email': 'E-mail',
	'signIn.send': 'Poslat odkaz',
	'signIn.sent': 'Pokud {email} patří kapitánovi nebo správci, právě jsme na něj poslali odkaz. Platí {minutes} minut.',
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
	'nav.me': 'My events',
	'nav.members': 'Members',
	'me.title': 'My events',
	'me.hello': 'Hi {name}',
	'me.upcoming': 'Upcoming matches',
	'me.noLink': 'Open the personal link the club admin sent you (e.g. on WhatsApp).',
	'me.linkInvalidTitle': 'Link not valid',
	'me.linkInvalid': 'This personal link no longer works. Ask the club admin for a new one.',
	'members.title': 'Club members',
	'members.add': 'Add a member',
	'members.name': 'Name',
	'members.emailOptional': 'Email (optional)',
	'members.emailHint': 'Only captains and admins need an email: they sign in with it.',
	'members.addButton': 'Add',
	'members.active': 'Active members ({count})',
	'members.inactive': 'Former members',
	'members.reactivate': 'Make active again',
	'members.adminTag': 'admin',
	'members.back': '← Back to members',
	'members.personalLink': 'Personal link',
	'members.addedHint': 'Member added. Now send them their personal link.',
	'members.personalLinkHint': 'Send the message to the member privately, never to the group. Anyone with the link can answer for them.',
	'members.messageLanguage': 'Message language',
	'members.copyMessage': 'Copy WhatsApp message',
	'members.copied': 'Copied ✓',
	'members.openWhatsApp': 'Open in WhatsApp',
	'members.regenerate': 'Make a new link',
	'members.regenerateHint': 'Use this when the link leaked or got lost. The old link stops working at once.',
	'members.regenerated': 'New link ready; the old one no longer works. Send the member the new message.',
	'members.edit': 'Edit details',
	'members.saved': 'Saved',
	'members.deactivate': 'Member left the club',
	'members.deactivateHint': 'They disappear from lists and line-ups and their link stops working. Their history stays, and you can bring them back.',
	'error.nameRequired': 'Enter a name.',
	'error.emailTaken': 'Another member already has this email.',
	'error.emailInvalid': 'Not a valid email address.',
	'error.cannotDeactivateSelf': "You can't deactivate yourself.",
	'personalLink.message':
		"Hi {name}, here is your personal link to Prague Pong ({club}). It shows matches and training sessions, and you answer whether you can come with one tap:\n{link}\n\nThe link is just for you, please don't forward it or post it in the group.",
	'error.forbidden': "You're not allowed to do this.",
	'error.notFound': 'Not found.',
	'nav.calendar': 'Calendar',
	'nav.admin': 'Admin',
	'nav.signIn': 'Captain sign-in',
	'nav.signOut': 'Sign out',
	'signIn.title': 'Sign in',
	'signIn.intro': "For captains and club admins. Enter your email and we'll send you a sign-in link.",
	'signIn.email': 'Email',
	'signIn.send': 'Send link',
	'signIn.sent': 'If {email} belongs to a captain or admin, we have just sent a link to it. It works for {minutes} minutes.',
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
