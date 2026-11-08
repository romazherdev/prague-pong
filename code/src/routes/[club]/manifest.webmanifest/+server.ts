import { json, type RequestHandler } from '@sveltejs/kit';
import { translator } from '#lib/i18n/messages.js';
import { answeringActor, clubRequest } from '#lib/server/request.js';

/**
 * The club's web app manifest. For a member (personal link or signed in) it starts at their own personal
 * link: an app added to the iPhone home screen doesn't share Safari's cookies, so this is how the installed
 * app knows who they are (ADR 0004). Fetched with credentials (`crossorigin="use-credentials"`), never cached.
 */
export const GET: RequestHandler = (event) => {
	const req = clubRequest(event);
	const { club } = req;
	const t = translator(event.locals.locale);
	const who = answeringActor(req);
	const linkToken = who ? req.core.myPersonalLinkToken(who, club.id) : undefined;
	return json(
		{
			name: `${club.name} · ${t('app.name')}`,
			short_name: club.name,
			lang: event.locals.locale,
			start_url: linkToken ? `/${club.slug}/m/${linkToken}` : `/${club.slug}`,
			scope: '/',
			display: 'standalone',
			background_color: '#fafaf7',
			theme_color: '#155e3d',
			icons: [
				{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
				{ src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
				{ src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
			]
		},
		{ headers: { 'content-type': 'application/manifest+json', 'cache-control': 'private, no-store' } }
	);
};
